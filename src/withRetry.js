/**
 * Wraps an async function with exponential backoff retry logic.
 * Specifically handles 429 (rate limit) errors from Gemini's free tier.
 *
 * @param {() => Promise<T>} fn        - The async function to retry
 * @param {number} maxRetries          - Max retry attempts (default: 4)
 * @param {number} baseDelayMs         - Initial wait in ms (default: 2000)
 * @returns {Promise<T>}
 */


async function withRetry(fn, maxRetries = 4, baseDelayMs = 2000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isRateLimit = err?.status === 429;
      const isServerErr = err?.status >= 500;

      if ((!isRateLimit && !isServerErr) || attempt === maxRetries) {
        throw err;
      }

      // Exponential backoff: 2s, 4s, 8s, 16s
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`[retry] attempt ${attempt + 1}/${maxRetries} — waiting ${delay}ms (status ${err?.status})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

module.exports = { withRetry };
