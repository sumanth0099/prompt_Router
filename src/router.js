

const { SYSTEM_PROMPTS } = require("./prompts");
const { withRetry } = require("./withRetry");

const UNCLEAR_SYSTEM = `You are a helpful assistant trying to understand what the user needs. \
Ask one short, friendly clarifying question to figure out whether they want help with \
coding, data analysis, writing, or career advice. Do not attempt to answer any other question.`;

async function callGroq(apiKey, systemPrompt, messages) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!res.ok) {
    const err = new Error(`Groq error: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.choices[0]?.message?.content?.trim() ?? "I was unable to generate a response.";
}

/**
 * Route to the correct expert persona and respond via Groq.
 * @param {string} message
 * @param {{intent: string, confidence: number}} intentResult
 * @param {string} apiKey  - GROQ_API_KEY
 * @param {Array<{role: string, content: string}>} conversationHistory
 */
async function routeAndRespond(message, intentResult, apiKey, conversationHistory = []) {
  const { intent } = intentResult;
  const cleanMessage = message.replace(/^@(code|data|writing|career)\s+/i, "").trim();
  const systemPrompt = intent === "unclear" ? UNCLEAR_SYSTEM : SYSTEM_PROMPTS[intent] ?? UNCLEAR_SYSTEM;

  const messages = [
    ...conversationHistory,
    { role: "user", content: cleanMessage },
  ];

  return await withRetry(() => callGroq(apiKey, systemPrompt, messages));
}

module.exports = { routeAndRespond };
