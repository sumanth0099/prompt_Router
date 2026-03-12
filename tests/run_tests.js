// tests/run_tests.js
// Run against a live server: node tests/run_tests.js
// Or set BASE_URL env var to point at your deployment.

require("dotenv").config();

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const TEST_CASES = [
  // Clear intents
  { msg: "how do i sort a list of objects in python?",            expectedIntent: "code"    },
  { msg: "explain this sql query for me",                         expectedIntent: "code"    },
  { msg: "This paragraph sounds awkward, can you help me fix it?",expectedIntent: "writing" },
  { msg: "I'm preparing for a job interview, any tips?",          expectedIntent: "career"  },
  { msg: "what's the average of these numbers: 12, 45, 23, 67, 34", expectedIntent: "data" },
  { msg: "fxi thsi bug pls: for i in range(10) print(i)",         expectedIntent: "code"    },
  { msg: "My boss says my writing is too verbose.",               expectedIntent: "writing" },
  { msg: "How do I structure a cover letter?",                    expectedIntent: "career"  },
  { msg: "what is a pivot table",                                 expectedIntent: "data"    },
  { msg: "I'm not sure what to do with my career.",               expectedIntent: "career"  },
  { msg: "Rewrite this sentence to be more professional.",        expectedIntent: "writing" },

  // Ambiguous / unclear
  { msg: "Help me make this better.",                             expectedIntent: "unclear" },
  { msg: "hey",                                                   expectedIntent: "unclear" },
  { msg: "Can you write me a poem about clouds?",                 expectedIntent: "unclear" },
  {
    msg: "I need to write a function that takes a user id and returns their profile, but also i need help with my resume.",
    expectedIntent: null, // multi-intent — just check it doesn't crash
  },

  // Manual override
  { msg: "@code Fix this bug: def foo(x) return x*2",            expectedIntent: "code",    expectOverride: true },
  { msg: "@writing Help me plan my budget",                       expectedIntent: "writing", expectOverride: true },
];

let passed = 0;
let failed = 0;
let errors = 0;

async function runTest(tc, idx) {
  const label = `Test ${String(idx + 1).padStart(2, "0")}: "${tc.msg.slice(0, 50)}${tc.msg.length > 50 ? "…" : ""}"`;

  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: tc.msg }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error(`  ❌ FAIL  ${label}`);
      console.error(`     HTTP ${res.status}: ${body.error ?? "unknown"}`);
      failed++;
      return;
    }

    const data = await res.json();

    // Structural checks — always required
    if (typeof data.intent     !== "string") throw new Error("Missing intent");
    if (typeof data.confidence !== "number") throw new Error("Missing confidence");
    if (typeof data.response   !== "string") throw new Error("Missing response");
    if (data.confidence < 0 || data.confidence > 1) throw new Error("Confidence out of range");

    // Intent match check
    const intentOk = !tc.expectedIntent || data.intent === tc.expectedIntent;
    const overrideOk = !tc.expectOverride || data.manualOverride === true;

    if (intentOk && overrideOk) {
      console.log(`  ✅ PASS  ${label}`);
      console.log(`          intent=${data.intent} (${Math.round(data.confidence * 100)}%) override=${data.manualOverride}`);
      passed++;
    } else {
      console.warn(`  ⚠️  WARN  ${label}`);
      console.warn(`           expected intent=${tc.expectedIntent ?? "any"}, got=${data.intent}`);
      if (tc.expectOverride && !data.manualOverride) console.warn("           expected manualOverride=true");
      failed++;
    }
  } catch (err) {
    console.error(`  💥 ERROR ${label}: ${err.message}`);
    errors++;
  }
}

(async () => {
  console.log(`\n🔀  Prompt Router Test Suite`);
  console.log(`    Server: ${BASE_URL}`);
  console.log(`    Cases : ${TEST_CASES.length}\n`);

  for (let i = 0; i < TEST_CASES.length; i++) {
    await runTest(TEST_CASES[i], i);
    await new Promise(r => setTimeout(r, 2000)); // 2s gap = safe within 30 req/min free tier // rate limit buffer
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`  Passed : ${passed}`);
  console.log(`  Failed : ${failed}`);
  console.log(`  Errors : ${errors}`);
  console.log(`──────────────────────────────────────\n`);

  process.exit(errors > 0 || failed > 0 ? 1 : 0);
})();
