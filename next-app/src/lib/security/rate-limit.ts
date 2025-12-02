/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiter for protecting public endpoints.
 * For production at scale, consider using Redis or Upstash.
 *
 * Features:
 * - Per-IP tracking
 * - Configurable limits and windows
 * - Memory cleanup for old entries
 * - Headers for rate limit info
 */

interface RateLimitEntry {
  count: number
  firstRequest: number
  lastRequest: number
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number
  /** Window size in milliseconds */
  windowMs: number
  /** Optional message when rate limited */
  message?: string
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  message?: string
}

// In-memory store (cleared on server restart)
// For production, use Redis or Upstash
const rateLimitStore = new Map<string, Map<string, RateLimitEntry>>()

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000

// Track cleanup timer
let cleanupTimer: NodeJS.Timeout | null = null

/**
 * Initialize cleanup timer (called automatically on first use)
 */
function initializeCleanup() {
  if (cleanupTimer) return

  cleanupTimer = setInterval(() => {
    const now = Date.now()
    rateLimitStore.forEach((limiterStore, limiterKey) => {
      limiterStore.forEach((entry, key) => {
        // Remove entries older than their window
        const config = getLimiterConfig(limiterKey)
        if (now - entry.firstRequest > config.windowMs) {
          limiterStore.delete(key)
        }
      })
      // Remove empty limiters
      if (limiterStore.size === 0) {
        rateLimitStore.delete(limiterKey)
      }
    })
  }, CLEANUP_INTERVAL)

  // Don't prevent process exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref()
  }
}

// Store configs for cleanup
const limiterConfigs = new Map<string, RateLimitConfig>()

function getLimiterConfig(key: string): RateLimitConfig {
  return limiterConfigs.get(key) || { maxRequests: 100, windowMs: 60000 }
}

/**
 * Create a rate limiter with the given configuration
 */
export function createRateLimiter(name: string, config: RateLimitConfig) {
  // Store config for cleanup
  limiterConfigs.set(name, config)

  // Initialize store for this limiter
  if (!rateLimitStore.has(name)) {
    rateLimitStore.set(name, new Map())
  }

  // Start cleanup if not already running
  initializeCleanup()

  /**
   * Check if a request from this identifier is allowed
   */
  return function checkLimit(identifier: string): RateLimitResult {
    const store = rateLimitStore.get(name)!
    const now = Date.now()

    // Get or create entry
    let entry = store.get(identifier)

    if (!entry) {
      // First request
      entry = {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      }
      store.set(identifier, entry)

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      }
    }

    // Check if window has expired
    if (now - entry.firstRequest > config.windowMs) {
      // Reset window
      entry.count = 1
      entry.firstRequest = now
      entry.lastRequest = now

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      }
    }

    // Window still active - increment count
    entry.count++
    entry.lastRequest = now

    if (entry.count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.firstRequest + config.windowMs,
        message: config.message || 'Too many requests, please try again later',
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.firstRequest + config.windowMs,
    }
  }
}

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================================================

/**
 * Public feedback submission rate limiter
 * 5 submissions per hour per IP
 */
export const feedbackRateLimit = createRateLimiter('public-feedback', {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many feedback submissions. Please try again in an hour.',
})

/**
 * Public voting rate limiter
 * 10 votes per day per IP
 */
export const votingRateLimit = createRateLimiter('public-voting', {
  maxRequests: 10,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  message: 'Daily voting limit reached. Please try again tomorrow.',
})

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const apiRateLimit = createRateLimiter('api', {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many requests. Please slow down.',
})

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extract client IP from request headers
 * Works with common proxy setups (Vercel, Cloudflare, etc.)
 */
export function getClientIp(headers: Headers): string {
  // Vercel
  const xForwardedFor = headers.get('x-forwarded-for')
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }

  // Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Standard headers
  const xRealIp = headers.get('x-real-ip')
  if (xRealIp) {
    return xRealIp
  }

  // Fallback
  return 'unknown'
}

/**
 * Hash an IP address for privacy-preserving storage
 * Uses a simple hash - for production, use a proper hashing library
 */
export function hashIp(ip: string): string {
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    ...(result.allowed ? {} : { 'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString() }),
  }
}
