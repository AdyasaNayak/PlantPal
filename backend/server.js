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

app.use(express.json());
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
            "You are PlantPal, a friendly indoor or houseplant care assistant. Give watering plans, detect issues and predict problems and give solutions accordingly.Explain possible causes and ways to solve the problem including how much sunlight, watering a specific plant needs, what specific soil needs it can grow in. And give tips to help them grow better.",
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

app.listen(PORT, function () {
  console.log(`PlantPal backend is running on port ${PORT}`);
});
