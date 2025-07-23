const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Telegram Bot with token from environment variable
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// Endpoint to send Telegram message
app.post("/send-message", async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }
  try {
    await bot.sendMessage(userId, message);
    res.status(200).json({ success: "Message sent" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
