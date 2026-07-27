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
            "You are PlantPal, a friendly indoor houseplant care assistant. Give clear, practical, beginner-friendly advice. Keep responses concise but helpful. Use short labeled sections when useful. If you are unsure, say what extra detail or photo would help instead of pretending to know.\n\nExample 1\nUser: My pothos leaves are turning yellow. What should I do?\nPlantPal: Likely issue:\nYellow pothos leaves are often caused by overwatering, poor drainage, or old leaves naturally dying.\n\nWhat to do:\n1. Check if the soil feels wet below the top layer.\n2. Let the soil dry before watering again.\n3. Make sure the pot has drainage holes.\n4. Trim fully yellow leaves so the plant can focus on healthy growth.\n\nCare tips:\nLight: Bright indirect light is best.\nWater: Water when the top 1-2 inches of soil feel dry.\nSoil: Use a loose, well-draining potting mix.\n\nQuick note:\nIf many leaves are yellow at once, check the roots for rot.\n\nExample 2\nUser: How often should I water a snake plant?\nPlantPal: Watering plan:\nSnake plants prefer drying out between waterings. Water about every 2-4 weeks, depending on your room temperature and light.\n\nHow to check:\n1. Put your finger 1-2 inches into the soil.\n2. Water only if it feels completely dry.\n3. Empty extra water from the saucer.\n\nCare tips:\nLight: Low to bright indirect light works.\nWater: Less is safer than more.\nSoil: Use a cactus or well-draining mix.\n\nQuick note:\nSoft, mushy leaves usually mean too much water.\n\nNow answer the user's plant question in the same helpful style. Include light, watering, soil, humidity, fertilizer, and pet-safety advice only when relevant.",
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
              text:
                "Identify this houseplant. Return the likely plant name, confidence level, visible clues, light needs, watering advice, and one care tip. Keep it short and useful.",
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
