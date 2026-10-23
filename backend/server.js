import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

import { authRouter, attachUser, requireAuth } from "./auth.js";
import { plants as plantStore, conversations as conversationStore } from "./db.js";

// Note: dotenv/config is imported first so .env values (e.g. DATA_DIR)
// are set before db.js computes the database location.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const CHAT_MODEL = "gpt-4.1-mini";
const MAX_MESSAGES = 12;
const MAX_IMAGE_CHARS = 1_500_000; // ~1.1 MB binary once base64-encoded
const CARE_EVENT_TYPES = plantStore.careEventTypes;

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error(
    "Missing OPENAI_API_KEY. Copy backend/.env.example and add your key.",
  );
}

// Created lazily so a missing key logs a clear error instead of crashing
// the server at startup; AI endpoints reply 503 until the key is configured.
let client = null;

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });
  }

  return client;
}

function isOpenAiConfigured() {
  return Boolean(apiKey);
}

const CHAT_SYSTEM_PROMPT = `You are PlantPal, a friendly indoor houseplant care assistant.

Style:
- Give clear, practical, beginner-friendly advice.
- Keep responses concise, and prefer short labeled sections with bullet points.
- A few relevant emojis are fine, but don't overdo it.
- Only include light, watering, soil, humidity, fertilizer, and pet-safety advice when it is relevant to the question.

Content:
- Cover light, watering, soil, and common problems in a practical, actionable way.
- If you are unsure, say what extra detail or photo would help instead of pretending to know.

Example 1:
User: My pothos leaves are turning yellow. What should I do?
PlantPal:
Likely issue:
- Yellow pothos leaves are often caused by overwatering, poor drainage, or old leaves naturally dying.

What to do:
1. Check if the soil feels wet below the top layer.
2. Let the soil dry before watering again.
3. Make sure the pot has drainage holes.
4. Trim fully yellow leaves so the plant can focus on healthy growth.

Care tips:
- Light: Bright indirect light is best.
- Water: Water when the top 1-2 inches of soil feel dry.
- Soil: Use a loose, well-draining potting mix.

Quick note:
- If many leaves are yellow at once, check the roots for rot.

Example 2:
User: How often should I water a snake plant?
PlantPal:
Watering plan:
- Snake plants prefer drying out between waterings. Water about every 2-4 weeks, depending on your room temperature and light.

How to check:
1. Put your finger 1-2 inches into the soil.
2. Water only if it feels completely dry.
3. Empty extra water from the saucer.

Care tips:
- Light: Low to bright indirect light works.
- Water: Less is safer than more.
- Soil: Use a cactus or well-draining mix.

Quick note:
- Soft, mushy leaves usually mean too much water.

Now answer the user's plant question in the same helpful style.`;

const IDENTIFY_SYSTEM_PROMPT =
  "You are PlantPal, a careful houseplant identification assistant. " +
  "Identify the most likely indoor plant from the image. If unsure, say so clearly. " +
  "Give concise beginner-friendly care guidance.";

const ADVICE_SYSTEM_PROMPT = `You are PlantPal, a houseplant care advisor. Write a short, practical care sheet for one houseplant.

Format exactly like this:

Light:
- (2-3 short bullets)

Water:
- (2-3 short bullets, including a watering rhythm in days)

Soil & feeding:
- (1-2 short bullets)

Watch out for:
- (2-3 common problems)

Beginner tip:
- (one encouraging, practical tip)

Keep every bullet under 20 words.`;

app.use(express.json({ limit: "10mb" }));
app.use(cors());
app.use(attachUser);

// The app runs behind a reverse proxy in production (e.g. Render), so
// trust the first proxy hop for req.ip — the auth rate limiter keys on it.
app.set("trust proxy", 1);

/* Auth ------------------------------------------------------------- */

app.use("/api/auth", authRouter);

/* Chat -------------------------------------------------------------- */

app.post("/api/chat", async function (req, res) {
  try {
    if (!isOpenAiConfigured()) {
      return res.status(503).json({
        error: "PlantPal is not configured with an AI provider yet.",
      });
    }

    const messages = req.body.messages;
    const conversationId = req.body.conversationId;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    const recentMessages = messages
      .filter(
        (message) =>
          message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim() !== "",
      )
      .slice(-MAX_MESSAGES);

    if (recentMessages.length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Signed-in users can persist the exchange. Only the newest turn is
    // appended; the rest of the history was saved by earlier requests.
    // The conversation row is created only after the completion succeeds,
    // so a failed upstream call leaves no empty conversation behind.
    let conversation = null;
    let lastUserMessage = null;

    if (req.user) {
      if (conversationId !== undefined && conversationId !== null) {
        conversation = conversationStore.get(conversationId, req.user.id);
        if (!conversation) {
          return res
            .status(404)
            .json({ error: "Conversation not found." });
        }
      }
      lastUserMessage = recentMessages[recentMessages.length - 1];
      if (lastUserMessage.role !== "user") {
        lastUserMessage = null;
      }
    }

    const response = await getClient().chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        ...recentMessages,
      ],
    });

    const reply = response.choices[0].message.content;

    if (req.user) {
      if (!conversation) {
        conversation = conversationStore.create(req.user.id, "New conversation");
      }
      const savedMessages = [];
      if (lastUserMessage) {
        savedMessages.push({
          role: lastUserMessage.role,
          content: lastUserMessage.content,
        });
      }
      savedMessages.push({ role: "assistant", content: reply });
      conversationStore.appendMessages(conversation.id, savedMessages);
      conversationStore.titleFromMessages(conversation.id, req.user.id);
    }

    res.json({
      reply,
      ...(conversation ? { conversationId: conversation.id } : {}),
    });
  } catch (error) {
    console.error("OpenAI error:", error);

    res.status(500).json({
      error: "Something went wrong while generating a response.",
    });
  }
});

/* Conversations (saved chat history) -------------------------------- */

app.get("/api/conversations", requireAuth, function (req, res) {
  res.json({ conversations: conversationStore.listForUser(req.user.id) });
});

app.get("/api/conversations/:id", requireAuth, function (req, res) {
  const conversation = conversationStore.get(req.params.id, req.user.id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  res.json({
    conversation,
    messages: conversationStore.messagesFor(conversation.id),
  });
});

app.delete("/api/conversations/:id", requireAuth, function (req, res) {
  const deleted = conversationStore.remove(req.params.id, req.user.id);

  if (!deleted) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  res.json({ ok: true });
});

/* Plant identification ---------------------------------------------- */

app.post("/api/identify-plant", async function (req, res) {
  try {
    if (!isOpenAiConfigured()) {
      return res.status(503).json({
        error: "PlantPal is not configured with an AI provider yet.",
      });
    }

    const image = req.body.image;

    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return res.status(400).json({ error: "Plant image is required" });
    }

    if (image.length > MAX_IMAGE_CHARS) {
      return res.status(413).json({
        error: "That image is too large. Please choose one under about 1 MB.",
      });
    }

    const response = await getClient().responses.create({
      model: CHAT_MODEL,
      input: [
        { role: "system", content: IDENTIFY_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Identify this houseplant. Return the likely plant name, confidence level, visible clues, light needs, watering advice, and one care tip. Keep it short and useful.",
            },
            {
              type: "input_image",
              image_url: image,
              detail: "low",
            },
          ],
        },
      ],
    });

    res.json({
      result: response.output_text,
    });
  } catch (error) {
    console.error("OpenAI vision error:", error);

    res.status(500).json({
      error: "Something went wrong while identifying the plant.",
    });
  }
});

/* Plants ------------------------------------------------------------ */

function isDataUrlImage(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function validatePlantInput(body) {
  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  if (name === "" || name.length > 80) {
    return { error: "Give your plant a name (up to 80 characters)." };
  }

  const species =
    typeof body.species === "string" ? body.species.trim().slice(0, 80) : "";
  const notes =
    typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";

  const waterIntervalDays = Number(body.waterIntervalDays ?? 7);
  if (
    !Number.isInteger(waterIntervalDays) ||
    waterIntervalDays < 1 ||
    waterIntervalDays > 365
  ) {
    return { error: "Watering interval must be between 1 and 365 days." };
  }

  const advice =
    typeof body.advice === "string" ? body.advice.slice(0, 8000) : "";

  let image = null;
  if (body.image !== undefined && body.image !== null) {
    if (!isDataUrlImage(body.image)) {
      return { error: "Plant photo must be an image." };
    }
    if (body.image.length > MAX_IMAGE_CHARS) {
      return {
        error: "That photo is too large. Please choose one under about 1 MB.",
      };
    }
    image = body.image;
  }

  return { name, species, notes, waterIntervalDays, advice, image };
}

app.get("/api/plants", requireAuth, function (req, res) {
  res.json({ plants: plantStore.listForUser(req.user.id) });
});

app.post("/api/plants", requireAuth, function (req, res) {
  const validation = validatePlantInput(req.body || {});

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const plant = plantStore.create({ userId: req.user.id, ...validation });

  res.status(201).json({ plant });
});

app.get("/api/plants/:id", requireAuth, function (req, res) {
  const plant = plantStore.get(req.params.id, req.user.id);

  if (!plant) {
    return res.status(404).json({ error: "Plant not found." });
  }

  res.json({ plant, events: plantStore.eventsFor(plant.id) });
});

app.delete("/api/plants/:id", requireAuth, function (req, res) {
  const deleted = plantStore.remove(req.params.id, req.user.id);

  if (!deleted) {
    return res.status(404).json({ error: "Plant not found." });
  }

  res.json({ ok: true });
});

function toUtcSqliteDate(value) {
  const date = new Date(value);
  return date.toISOString().replace("T", " ").slice(0, 19);
}

app.post("/api/plants/:id/events", requireAuth, function (req, res) {
  const plant = plantStore.get(req.params.id, req.user.id);

  if (!plant) {
    return res.status(404).json({ error: "Plant not found." });
  }

  const body = req.body || {};
  const type = typeof body.type === "string" ? body.type : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

  if (!CARE_EVENT_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Care type must be one of: ${CARE_EVENT_TYPES.join(", ")}.`,
    });
  }

  let occurredAt = null;
  if (body.occurredAt !== undefined && body.occurredAt !== null) {
    const parsed = Date.parse(body.occurredAt);
    // A 12-hour tolerance lets users log care for "today" early in the
    // day without the picked date reading as a future timestamp.
    if (Number.isNaN(parsed) || parsed > Date.now() + 12 * 60 * 60 * 1000) {
      return res
        .status(400)
        .json({ error: "Care date must be today or in the past." });
    }
    occurredAt = toUtcSqliteDate(body.occurredAt);
  }

  plantStore.addEvent(
    plant.id,
    req.user.id,
    type,
    note,
    occurredAt || toUtcSqliteDate(new Date().toISOString()),
  );

  res.status(201).json({
    plant: plantStore.get(plant.id, req.user.id),
    events: plantStore.eventsFor(plant.id),
  });
});

app.post("/api/plants/:id/advice", requireAuth, async function (req, res) {
  try {
    if (!isOpenAiConfigured()) {
      return res.status(503).json({
        error: "PlantPal is not configured with an AI provider yet.",
      });
    }

    const plant = plantStore.get(req.params.id, req.user.id);

    if (!plant) {
      return res.status(404).json({ error: "Plant not found." });
    }

    const response = await getClient().chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: ADVICE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Plant name: ${plant.name}\nSpecies (if known): ${plant.species || "unknown"}\nOwner notes: ${plant.notes || "none"}`,
        },
      ],
    });

    const advice = response.choices[0].message.content.trim();
    plantStore.setAdvice(plant.id, advice);

    res.json({ plant: plantStore.get(plant.id, req.user.id) });
  } catch (error) {
    console.error("OpenAI error:", error);

    res.status(500).json({
      error: "Something went wrong while generating care advice.",
    });
  }
});

/* Static frontend ----------------------------------------------------
 * Served so the backend can be deployed standalone. Only the frontend
 * files are exposed — never backend source, env files, or the database.
 * ------------------------------------------------------------------- */

const rootDir = path.join(__dirname, "..");
const frontendFiles = ["index.html", "style.css", "script.js"];

frontendFiles.forEach(function (file) {
  app.get("/" + file, function (req, res) {
    res.sendFile(path.join(rootDir, file));
  });
});

app.use("/assets", express.static(path.join(rootDir, "assets")));

app.get("/", function (req, res) {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.use(function (req, res) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found." });
  }
  res.status(404).send("Not found");
});

app.listen(PORT, function () {
  console.log(`PlantPal backend is running on port ${PORT}`);
});
