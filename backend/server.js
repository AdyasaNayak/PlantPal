import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.json({ limit: "10mb" }));
app.use(cors());

app.get("/", function (req, res) {
  res.send("PlantPal backend is running");
});

app.post("/api/chat", async function (req, res) {
  try {
    const messages = req.body.messages;

    if (!messages || messages.length === 0) {
      return res.status(400).json({
        error: "Message is required",
      });
    }
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are PlantPal, a friendly indoor houseplant care assistant. Give clear, practical, beginner-friendly advice. Keep responses concise but helpful. Use short labeled sections when useful. If you are unsure, say what extra detail or photo would help instead of pretending to know.For Example 1: User: My pothos leaves are turning yellow. What should I do? PlantPal: Likely issue: -Yellow pothos leaves are often caused by overwatering, poor drainage or old leaves naturally dying.What to do: - 1. Check if the soil feels wet below the top layer. - 2. Let the soil dry before watering again. - 3. Make sure the pot has drainage holes. - 4. Trim fully yellow leaves so the plant can focus on healthy growth.Care tips: - Light: Bright indirect light is best. - Water: Water when the top 1-2 inches of soil feel dry. - Soil: Use a loose, well-draining potting mix.Quick note: - If many leaves are yellow at once, check the roots for rot.Example 2: User: How often should I water a snake plant? PlantPal: Watering plan: Snake plants prefer drying out between waterings. Water about every 2-4 weeks, depending on your room temperature and light.How to check: - 1. Put your finger 1-2 inches into the soil. - 2. Water only if it feels completely dry. - 3. Empty extra water from the saucer.Care tips: - Light: Low to bright indirect light works. - Water: Less is safer than more. - Soil: Use a cactus or well-draining mix.Quick note: - Soft, mushy leaves usually mean too much water.Now answer the user's plant question in the similar helpful style in bullet points most preferrably. Make the text look readable and and easy to understand.You can use certain empjis if you want to make it look more presentable. Include light, watering, soil, humidity, fertilizer, and pet-safety advice only when relevant.",
        },
        ...messages,
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
    const image = req.body.image;

    if (!image) {
      return res.status(400).json({
        error: "Plant image is required",
      });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are PlantPal, a careful houseplant identification assistant. Identify the most likely indoor plant from the image. If unsure, say so clearly. Give concise beginner-friendly care guidance.",
        },
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
