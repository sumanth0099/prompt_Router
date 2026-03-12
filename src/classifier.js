// Classifier — uses Groq (llama-3.1-8b-instant)
// Tiny 8B model: fast, cheap, great at structured JSON output
// Free tier: 30 req/min, 14,400 req/day
const { CLASSIFIER_PROMPT, CONFIDENCE_THRESHOLD } = require("./prompts");
const { withRetry } = require("./withRetry");

const VALID_INTENTS = new Set(["code", "data", "writing", "career", "unclear"]);

// Keyword fallback — used when LLM returns bad JSON
const KEYWORD_MAP = [
  { intent: "code",    words: ["python","javascript","js","code","bug","function","error","script","sql","query","debug","class","array","loop","api","html","css","git","algorithm","syntax","import","variable","string","int","null","undefined","fix","TypeError","exception","compile","run","npm","pip"] },
  { intent: "data",    words: ["average","mean","median","data","dataset","number","numbers","statistics","chart","graph","correlation","distribution","percentage","sum","count","spreadsheet","csv","excel","pivot","analyse","analyze","trend","outlier","variance"] },
  { intent: "writing", words: ["write","writing","paragraph","sentence","essay","email","tone","grammar","word","text","verbose","awkward","professional","clarity","proofread","draft","article","blog","document","rephrase","rewrite","phrasing","passive","voice"] },
  { intent: "career",  words: ["job","interview","resume","cv","career","salary","promotion","hire","linkedin","cover letter","workplace","boss","manager","company","role","position","experience","skills","application","internship","work"] },
];

function keywordFallback(message) {
  const lower = message.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const { intent, words } of KEYWORD_MAP) {
    const score = words.filter(w => lower.includes(w)).length;
    if (score > bestScore) { bestScore = score; best = intent; }
  }

  return best && bestScore > 0
    ? { intent: best, confidence: 0.5, keywordFallback: true }
    : { intent: "unclear", confidence: 0.0, keywordFallback: true };
}

async function callGroqClassifier(apiKey, message) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 60,
      temperature: 0,
      response_format: { type: "json_object" }, // force JSON output
      messages: [
        { role: "system", content: CLASSIFIER_PROMPT },
        { role: "user",   content: message },
      ],
    }),
  });

  if (!res.ok) {
    const err = new Error(`Groq classifier error: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Classify user intent via Groq (llama-3.1-8b-instant).
 * Falls back to keyword matching if the LLM fails or returns bad JSON.
 * @param {string} message
 * @param {string} apiKey  - GROQ_API_KEY
 */

async function classifyIntent(message, apiKey) {
  // Manual override — no API call needed
  const overrideMatch = message.match(/^@(code|data|writing|career)\s+/i);
  if (overrideMatch) {
    return { intent: overrideMatch[1].toLowerCase(), confidence: 1.0, override: true };
  }

  let raw = "";
  try {
    raw = await withRetry(() => callGroqClassifier(apiKey, message));

    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    const parsed = JSON.parse(raw);
    const intent =
      typeof parsed.intent === "string" && VALID_INTENTS.has(parsed.intent.toLowerCase())
        ? parsed.intent.toLowerCase()
        : null;
    const confidence =
      typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1
        ? parsed.confidence
        : 0.0;

    if (!intent) return keywordFallback(message);

    // Apply threshold — but only fall back to keywords, not straight to unclear
    if (confidence < CONFIDENCE_THRESHOLD && intent !== "unclear") {
      const kwResult = keywordFallback(message);
      // Use keyword result if it found something, otherwise trust the LLM anyway
      return kwResult.intent !== "unclear" ? kwResult : { intent, confidence };
    }

    return { intent, confidence };
  } catch {
    // API error — fall back to keyword matching so the user still gets a response
    return keywordFallback(message);
  }
}

module.exports = { classifyIntent };
