/**
 * withRetry — Retry helper for transient failures
 * 
 * Usage:
 *   const result = await withRetry(() => base44.entities.Job.list(), {
 *     maxRetries: 3,
 *     delay: 1000,
 *     backoff: 2,  // exponential backoff
 *     onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error)
 *   });
 */

export async function withRetry(
  fn,
  options = {}
) {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    onRetry = () => {},
    shouldRetry = (error) => {
      // Retry on network errors, 5xx, timeouts; NOT on 4xx (except 408/429)
      const status = error?.response?.status || error?.status;
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
        return false; // Don't retry client errors
      }
      return true; // Retry server errors, network errors, timeouts
    },
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate backoff delay
      const waitTime = delay * Math.pow(backoff, attempt);
      onRetry(attempt + 1, error);
      
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

/**
 * Retry specific operations
 */
export function createRetryable(fn, options) {
  return (...args) => withRetry(() => fn(...args), options);
}