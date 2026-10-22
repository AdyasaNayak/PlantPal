import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CHAT_MODEL = "gpt-4.1-mini";
const MAX_MESSAGES = 12;

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error(
    "Missing OPENAI_API_KEY. Copy backend/.env.example and add your key.",
  );
}

// Created lazily so a missing key logs a clear error instead of crashing
// the server at startup; endpoints reply 503 until the key is configured.
let client = null;

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey });
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

app.use(express.json({ limit: "10mb" }));
app.use(cors());

app.get("/", function (req, res) {
  res.send("PlantPal backend is running");
});

app.post("/api/chat", async function (req, res) {
  try {
    if (!isOpenAiConfigured()) {
      return res.status(503).json({
        error: "PlantPal is not configured with an AI provider yet.",
      });
    }

    const messages = req.body.messages;

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

    const response = await getClient().chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        ...recentMessages,
      ],
    });

    res.json({
      reply: response.choices[0].message.content,
    });
  } catch (error) {
    console.error("OpenAI error:", error);

    res.status(500).json({
      error: "Something went wrong while generating a response.",
    });
  }
});

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

app.listen(PORT, function () {
  console.log(`PlantPal backend is running on port ${PORT}`);
});
