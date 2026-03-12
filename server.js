require("dotenv").config();

const express = require("express");
const path    = require("path");
const chatHandler = require("./api/chat");
const logsHandler = require("./api/logs");

const app  = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function adapt(handler) {
  return async (req, res) => { await handler(req, res); };
}

app.post("/api/chat", adapt(chatHandler));
app.get("/api/logs",  adapt(logsHandler));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  const groq = process.env.GROQ_API_KEY ? "✅" : "❌  missing GROQ_API_KEY";
  console.log(`\n🔀  Prompt Router → http://localhost:${PORT}`);
  console.log(`   Classifier  (Groq llama-3.1-8b-instant):    ${groq}`);
  console.log(`   Responder   (Groq llama-3.3-70b-versatile): ${groq}\n`);
});
