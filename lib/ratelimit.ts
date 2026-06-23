/**
 * Rate limiting utilities.
 *
 * Uses Vercel KV (environment variable VERCEL_KV_URL).
 * If not available, silently skips rate limiting (for local development).
 *
 * Production deployments on Vercel automatically get KV access via binding.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = process.env.KV_URL
  ? new Redis({
      url: process.env.KV_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

/**
 * Create a rate limiter for API endpoints.
 *
 * @param keyPrefix - Prefix for the rate limit key (e.g., "licitaciones-estado")
 * @param limit - Max requests allowed in the time window
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 */
export function createRateLimiter(
  keyPrefix: string,
  limit: number = 10,
  windowMs: number = 3600 * 1000
) {
  // If Redis is not configured, return a no-op limiter
  if (!redis) {
    return {
      limit: async (key: string) => ({ success: true, remaining: limit, reset: 0 }),
    };
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
    prefix: keyPrefix,
  });
}

/**
 * Check rate limit for a request.
 * Returns 429 response if limited, null otherwise.
 *
 * @param limiter - Rate limiter instance
 * @param key - Key for rate limiting (e.g., IP address or user ID)
 */
export async function checkRateLimit(
  limiter: ReturnType<typeof createRateLimiter>,
  key: string
) {
  const { success } = await limiter.limit(key);
  return success;
}

export const rateLimiters = {
  // Mutation endpoints: 10 requests per hour per IP
  mutations: createRateLimiter("api:mutations", 10, 3600 * 1000),

  // Calendar sync: 5 requests per hour per user (heavier operation)
  calendarSync: createRateLimiter("api:calendar-sync", 5, 3600 * 1000),
};
