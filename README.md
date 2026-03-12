# 🔀 Prompt Router — LLM-Powered Intent Classification

A production-ready AI assistant that automatically classifies user intent and routes each message to a specialised expert persona. Built with **Node.js**, **Express**, and **Groq Llama models**, deployed on **Render**.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **Two-step routing** | Classify (Llama 3.1 8B Instant) → Respond (Llama 3.3 70B Versatile) |
| **4 expert personas** | Code, Data, Writing, Career |
| **Keyword fallback** | If the LLM is uncertain, keyword matching ensures the right persona is picked |
| **Confidence threshold** | Low-confidence results trigger keyword fallback before escalating to *unclear* |
| **Manual override** | Prefix with `@code`, `@data`, `@writing`, `@career` to bypass the classifier |
| **Route logging** | Every request logged to `route_log.jsonl` |
| **Multi-turn memory** | Conversation history passed to each LLM call |
| **Clean UI** | Minimal light-theme chat interface with intent pill + confidence % |
| **Docker-ready** | `Dockerfile` + `docker-compose.yml` included |

---

## 🏗️ Architecture

```
User Message
      │
      ▼
┌──────────────────────────────────────┐
│ classifyIntent  (src/classifier.js)  │  ← Groq Llama 3.1 8B Instant
│                                      │    temp=0, max_tokens=60
│  1. Check for @override prefix       │    returns {intent, confidence}
│  2. Call Groq classifier             │
│  3. Parse JSON response              │
│  4. Keyword fallback if uncertain    │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│ routeAndRespond  (src/router.js)     │  ← Groq Llama 3.3 70B Versatile
│                                      │    temp=0.4, max_tokens=1024
│  Selects expert system prompt and    │
│  generates the final response        │
└────────────────┬─────────────────────┘
                 │
                 ├──→ route_log.jsonl  (src/logger.js)
                 │
                 ▼
            Final Response
```

### Intent Labels

| Label | Persona | Trigger examples |
|---|---|---|
| `code` | Code Expert | Python, SQL, debugging, scripts, algorithms |
| `data` | Data Analyst | datasets, averages, charts, pivot tables, statistics |
| `writing` | Writing Coach | paragraphs, grammar, tone, clarity, emails |
| `career` | Career Advisor | interviews, resumes, cover letters, job decisions |
| `unclear` | Clarifier | genuine gibberish or single-word greetings |

---

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone and install
git clone <your-repo-url>
cd prompt-router
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# 3. Run
npm run dev    # with auto-reload (nodemon)
npm start      # production mode
```

Open **http://localhost:3000** in your browser.

---

### Docker

```bash
cp .env.example .env    # fill in GROQ_API_KEY
docker-compose up --build

# Stop
docker-compose down
```

`route_log.jsonl` is mounted as a volume so logs persist across restarts.

---

### Render Deployment (live)

1. Push your code to a GitHub repository
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo
3. Set the following:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Add your environment variable:
   - `GROQ_API_KEY` = `gsk_...`
5. Click **Deploy**

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after idle takes ~30 seconds to wake up — this is normal behaviour.

---

## 🧪 Testing

```bash
# Terminal 1 — start the server
npm start

# Terminal 2 — run the test suite (17 test cases, 2s gap between each)
npm test

# Run against a remote deployment
BASE_URL=https://your-app.onrender.com npm test
```

---

## 📡 API Reference

### `POST /api/chat`

Classify and respond to a user message.

**Request body:**

```json
{
  "message": "how do i sort a list in Python?",
  "history": []
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | ✅ | User's raw input |
| `history` | array | ❌ | `[{role, content}]` for multi-turn conversation |

**Response:**

```json
{
  "response": "...",
  "intent": "code",
  "confidence": 0.97,
  "thresholdApplied": false,
  "manualOverride": false,
  "models": {
    "classifier": "Groq — Llama 3.1 8B Instant",
    "responder": "Groq — Llama 3.3 70B Versatile"
  }
}
```

---

### `GET /api/logs`

Returns the most recent 100 log entries, newest first.

```json
{
  "logs": [
    {
      "timestamp": "2026-03-12T10:01:05.123Z",
      "message": "how do i sort a list in Python?",
      "intent": "code",
      "confidence": 0.97,
      "threshold_applied": false,
      "manual_override": false,
      "response": "..."
    }
  ]
}
```

---

## 🎛️ Manual Override

Prefix your message with an intent tag to skip the classifier entirely:

```
@code    Fix this Python bug
@data    Explain a bimodal distribution
@writing Improve this paragraph's clarity
@career  Should I take this promotion?
```

---

## 📁 Project Structure

```
prompt-router/
├── api/
│   ├── chat.js          ← POST /api/chat
│   └── logs.js          ← GET  /api/logs
├── src/
│   ├── prompts.js        ← Expert system prompts + classifier prompt
│   ├── classifier.js     ← classifyIntent() — Groq 8B + keyword fallback
│   ├── router.js         ← routeAndRespond() — Groq 70B
│   ├── logger.js         ← logRoute() / readLogs()
│   └── withRetry.js      ← Exponential backoff for rate limits
├── public/
│   └── index.html        ← Chat UI
├── tests/
│   └── run_tests.js      ← 17 automated test cases
├── server.js             ← Express server
├── Dockerfile
├── docker-compose.yml
├── route_log.jsonl       ← Append-only request log
├── .env.example
└── README.md
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ | — | Your Groq API key — get one free at [console.groq.com](https://console.groq.com/keys) |
| `PORT` | ❌ | `3000` | HTTP port (local / Docker only) |
| `CONFIDENCE_THRESHOLD` | ❌ | `0.4` | Minimum classifier confidence before keyword fallback kicks in |

---

## 🔒 Security Notes

- API keys are read from environment variables only — never exposed to the browser
- Docker image runs as a non-root user (`appuser`)
- `.env` is in `.gitignore` — never commit secrets

---

## 📝 Design Decisions

**Why Llama 3.1 8B Instant for classification?**
It is fast (< 500ms), cheap, and with `temperature=0` and `response_format: json_object` it returns deterministic, well-structured JSON every time.

**Why Llama 3.3 70B Versatile for responses?**
The expert personas (especially Writing Coach and Career Advisor) require nuanced reasoning. The quality difference over the 8B model is significant for longer, context-sensitive replies.

**Why a keyword fallback?**
The LLM classifier can be rate-limited or return low-confidence results for informal or typo-heavy messages. The keyword map catches these cases and routes them correctly without asking the user to clarify unnecessarily.

**Why `.jsonl` for logging?**
Append-only, one JSON object per line, trivially queryable with `jq`. Requires no database and works seamlessly in both local and Docker environments.