const fs = require("fs");
const path = require("path");

const LOG_PATH = path.resolve(__dirname, "..", "route_log.jsonl");

/**
 * Append a structured log entry to route_log.jsonl.
 * Falls back to console.log when the filesystem is read-only (e.g., Vercel).
 *
 * @param {{
 *   message: string,
 *   intent: string,
 *   confidence: number,
 *   response: string,
 *   thresholdApplied?: boolean,
 *   override?: boolean
 * }} entry
 */
function logRoute(entry) {
  const record = {
    timestamp: new Date().toISOString(),
    message: entry.message,
    intent: entry.intent,
    confidence: entry.confidence,
    threshold_applied: entry.thresholdApplied ?? false,
    manual_override: entry.override ?? false,
    response: entry.response,
  };

  const line = JSON.stringify(record) + "\n";

  try {
    fs.appendFileSync(LOG_PATH, line, "utf8");
  } catch {
    // Vercel / read-only filesystem — degrade gracefully
    console.log("[route_log]", line.trim());
  }
}

/**
 * Read all log entries (returns empty array if file doesn't exist).
 * @returns {object[]}
 */


function readLogs() {
  try {
    const content = fs.readFileSync(LOG_PATH, "utf8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

module.exports = { logRoute, readLogs };
