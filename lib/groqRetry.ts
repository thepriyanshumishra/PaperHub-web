import { groq } from './groq';
import { logSystemEvent } from './auditLogger';

export async function groqChatCompletionWithRetry(
  params: any,
  retries = 3,
  delay = 2000
): Promise<any> {
  if (!groq) {
    throw new Error('Groq client is not initialized');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await groq.chat.completions.create(params);
      return response;
    } catch (error: any) {
      const status = error.status || error.statusCode;
      const isRateLimit = status === 429 || error.message?.includes('429') || error.message?.includes('rate limit');
      const isServerError = (status >= 500 && status <= 599) || error.message?.includes('500') || error.message?.includes('overloaded');

      console.warn(`[Groq API Call] Attempt ${attempt} failed with status: ${status}. Error:`, error.message);

      if ((isRateLimit || isServerError) && attempt < retries) {
        let waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s...
        
        // Check for Groq retry-after headers
        if (error.headers && error.headers['retry-after']) {
          const retryAfter = parseFloat(error.headers['retry-after']);
          if (!isNaN(retryAfter)) {
            waitTime = Math.max(waitTime, retryAfter * 1000);
          }
        }

        // Limit maximum backoff wait time to 15 seconds to avoid request timeouts
        waitTime = Math.min(waitTime, 15000);

        console.warn(`[Groq API Call] Retrying in ${waitTime}ms due to ${isRateLimit ? '429 Rate Limit' : 'Server Error'}`);
        
        await logSystemEvent({
          action: 'groq_retry',
          category: 'ai_eval',
          details: `Groq attempt ${attempt} failed. Retrying in ${waitTime}ms. Error: ${error.message}`,
          metadata: { attempt, waitTime, isRateLimit, status }
        });

        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        // Last attempt failed or not a retryable error
        await logSystemEvent({
          action: 'groq_failure',
          category: 'ai_eval',
          details: `Groq call failed permanently on attempt ${attempt}: ${error.message}`,
          metadata: { attempt, status, model: params.model }
        });
        throw error;
      }
    }
  }
}
