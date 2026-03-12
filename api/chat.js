const { classifyIntent } = require("../src/classifier");
const { routeAndRespond } = require("../src/router");
const { logRoute }        = require("../src/logger");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const { message, history = [] } = req.body ?? {};

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: "GROQ_API_KEY is not set." });

  try {
    const intentResult = await classifyIntent(message.trim(), GROQ_API_KEY);

    //Step 2: Respond with Groq
    const response = await routeAndRespond(message.trim(), intentResult, GROQ_API_KEY, history);

    //Step 3: Log
    logRoute({
      message:          message.trim(),
      intent:           intentResult.intent,
      confidence:       intentResult.confidence,
      response,
      thresholdApplied: intentResult.thresholdApplied,
      override:         intentResult.override,
    });

    return res.status(200).json({
      response,
      intent:           intentResult.intent,
      confidence:       intentResult.confidence,
      thresholdApplied: intentResult.thresholdApplied ?? false,
      manualOverride:   intentResult.override ?? false,
      models: {
        classifier: "Groq — Llama 3.1 8B Instant",
        responder:  "Groq — Llama 3.3 70B Versatile",
      },
    });
  } catch (err) {
    console.error("Router error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};
