# 🔀 Prompt Router — LLM-Powered Intent Classification

A production-ready AI assistant that automatically classifies user intent and routes each message to a specialised expert persona. Built with **Node.js**, **Express**, and **OpenAI GPT-4o**, deployable on **Vercel** or **Docker**.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **Two-step routing** | Classify (gpt-4o-mini) → Respond (gpt-4o) |
| **4 expert personas** | Code, Data, Writing, Career |
| **Confidence threshold** | Low-confidence classifications escalate to *unclear* |
| **Manual override** | Prefix with `@code`, `@data`, `@writing`, `@career` |
| **Route logging** | Every request logged to `route_log.jsonl` |
| **Multi-turn memory** | Conversation history passed to each LLM call |
| **Live UI** | Dark-mode chat interface with intent badge + confidence bar |
| **Vercel-ready** | Serverless API functions in `/api/` |
| **Docker-ready** | `Dockerfile` + `docker-compose.yml` included |

---

## 🏗️ Architecture

```
User Message
      │
      ▼
┌─────────────────┐
│ classify_intent  │  ← gpt-4o-mini, temp=0, max_tokens=60
│  (src/classifier)│    returns {intent, confidence}
└────────┬────────┘
         │
         ├─ confidence < 0.7 → intent = "unclear"
         │
         ▼
┌─────────────────┐
│ route_and_respond│  ← gpt-4o, temp=0.4, max_tokens=1024
│  (src/router)    │    uses expert system prompt from prompts.js
└────────┬────────┘
         │
         ├──→ route_log.jsonl  (src/logger)
         │
         ▼
    Final Response
```

### Intent Labels

| Label | Persona | Trigger examples |
|---|---|---|
| `code` | Code Expert | Python, SQL, bugs, functions |
| `data` | Data Analyst | averages, datasets, pivot tables |
| `writing` | Writing Coach | paragraphs, sentences, tone |
| `career` | Career Advisor | interviews, resumes, career direction |
| `unclear` | Clarifier | ambiguous, vague, off-topic |

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
#   Edit .env and add your OPENAI_API_KEY

# 3. Run
npm run dev       # with auto-reload (nodemon)
# or
npm start         # production mode
```

Open **http://localhost:3000** in your browser.

---

### Docker

```bash
# Build and run
cp .env.example .env     # fill in OPENAI_API_KEY
docker-compose up --build

# Stop
docker-compose down
```

The `route_log.jsonl` is mounted as a volume so logs persist across restarts.

---

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add your secret
vercel env add OPENAI_API_KEY
vercel --prod
```

> **Note:** Vercel's serverless filesystem is ephemeral, so `route_log.jsonl` logs are written to `console.log` instead of disk. All other features work identically.

---

## 🧪 Testing

Run against a live local server:

```bash
# Terminal 1 — start server
npm start

# Terminal 2 — run tests
npm test

# Run against a remote deployment
BASE_URL=https://your-app.vercel.app npm test
```

The test suite covers all 15 required test messages plus manual override and edge cases.

---

## 📡 API Reference

### `POST /api/chat`

Classify and respond to a user message.

**Request body:**
```json
{
  "message": "how do i sort a list in python?",
  "history": []
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | ✅ | User's raw input |
| `history` | array | ❌ | `[{role, content}]` for multi-turn |

**Response:**
```json
{
  "response":        "```python\n...",
  "intent":          "code",
  "confidence":      0.97,
  "thresholdApplied": false,
  "manualOverride":  false
}
```

---

### `GET /api/logs`

Returns the most recent 100 log entries (newest first).

```json
{
  "logs": [
    {
      "timestamp":       "2026-03-09T14:01:05.123Z",
      "message":         "how do i sort a list in python?",
      "intent":          "code",
      "confidence":      0.97,
      "threshold_applied": false,
      "manual_override": false,
      "response":        "..."
    }
  ]
}
```

---

## 🎛️ Manual Override

Prefix your message with an intent tag to bypass the classifier entirely:

```
@code    Fix this bug: for i in range(10) print(i)
@data    What does a bimodal distribution tell me?
@writing My opening paragraph feels weak.
@career  Should I take this promotion?
```

---

## 📁 Project Structure

```
prompt-router/
├── api/
│   ├── chat.js          # POST /api/chat  (Vercel serverless)
│   └── logs.js          # GET  /api/logs  (Vercel serverless)
├── src/
│   ├── prompts.js        # Expert system prompts + classifier prompt
│   ├── classifier.js     # classify_intent() function
│   ├── router.js         # route_and_respond() function
│   └── logger.js         # logRoute() / readLogs()
├── public/
│   └── index.html        # Chat UI
├── tests/
│   └── run_tests.js      # 17 automated test cases
├── server.js             # Express server (Docker / local)
├── vercel.json           # Vercel routing config
├── Dockerfile
├── docker-compose.yml
├── route_log.jsonl       # Append-only JSON Lines log
├── .env.example
└── README.md
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | — | Your OpenAI secret key |
| `PORT` | ❌ | `3000` | HTTP port (Docker / local only) |
| `CONFIDENCE_THRESHOLD` | ❌ | `0.7` | Minimum classifier confidence |

---

## 🔒 Security Notes

- API keys are read from environment variables only — never from client-side code
- The OpenAI client is initialised server-side and never exposed to the browser
- The Docker image runs as a non-root user (`appuser`)
- `.env` is listed in `.gitignore` — never commit secrets

---

## 📝 Design Decisions

**Why gpt-4o-mini for classification?**  
It is fast (< 500 ms) and cheap. The classifier prompt is intentionally terse and asks for JSON-only output with `temperature=0`, making it deterministic and easy to parse.

**Why gpt-4o for generation?**  
The generation step requires nuanced reasoning, especially for the writing coach and career advisor personas. The quality difference justifies the cost.

**Why a confidence threshold?**  
A single-label classifier can be confidently wrong. If the model returns `code` with 60% confidence, it is effectively saying "maybe". The threshold (default 0.7) catches these cases and asks the user to clarify rather than silently routing to the wrong expert.

**Why JSON Lines for logging?**  
`.jsonl` is append-only, structured, and trivially queryable with `jq` or any log aggregator. It scales well and requires no database.

---

## 📄 Licence

MIT
