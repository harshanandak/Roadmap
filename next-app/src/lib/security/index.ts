/**
 * Security Utilities
 *
 * Spam prevention and rate limiting for public endpoints
 */

// Honeypot spam prevention
export {
  checkHoneypot,
  generateFormLoadToken,
  validateFormLoadToken,
  getSpamProtector,
  honeypotProtector,
  type SpamCheckResult,
  type SpamProtectionProvider,
  type SpamProtector,
} from './honeypot'

// Rate limiting
export {
  createRateLimiter,
  feedbackRateLimit,
  votingRateLimit,
  apiRateLimit,
  getClientIp,
  hashIp,
  createRateLimitHeaders,
} from './rate-limit'
