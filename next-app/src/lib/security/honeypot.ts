/**
 * Honeypot Spam Prevention
 *
 * A simple, privacy-respecting spam prevention technique that:
 * 1. Adds a hidden "website" field that bots will fill
 * 2. Tracks form load time to detect instant submissions
 * 3. Validates submissions without requiring user interaction
 *
 * CAPTCHA-Ready Architecture:
 * The SpamCheck interface allows easy swapping to hCaptcha/reCAPTCHA later.
 */

export interface SpamCheckResult {
  isSpam: boolean
  reason?: string
  confidence: 'low' | 'medium' | 'high'
}

interface HoneypotCheckOptions {
  /** The honeypot field value (should be empty for real users) */
  honeypotValue: string | null | undefined
  /** Timestamp when form was loaded (ISO string or epoch ms) */
  formLoadTime: string | number
  /** Minimum time in seconds before a valid submission (default: 3) */
  minSubmitTime?: number
}

/**
 * Check if a form submission is likely spam using honeypot technique
 */
export function checkHoneypot({
  honeypotValue,
  formLoadTime,
  minSubmitTime = 3,
}: HoneypotCheckOptions): SpamCheckResult {
  // Check honeypot field - if filled, definitely spam
  if (honeypotValue && honeypotValue.trim() !== '') {
    return {
      isSpam: true,
      reason: 'Honeypot field filled',
      confidence: 'high',
    }
  }

  // Check submission timing
  const loadTimeMs = typeof formLoadTime === 'string'
    ? new Date(formLoadTime).getTime()
    : formLoadTime

  const submitTimeMs = Date.now()
  const elapsedSeconds = (submitTimeMs - loadTimeMs) / 1000

  if (elapsedSeconds < minSubmitTime) {
    return {
      isSpam: true,
      reason: `Form submitted too quickly (${elapsedSeconds.toFixed(1)}s < ${minSubmitTime}s)`,
      confidence: 'medium',
    }
  }

  return {
    isSpam: false,
    confidence: 'low',
  }
}

/**
 * Generate a form load timestamp token
 * Store this when rendering the form, validate on submission
 */
export function generateFormLoadToken(): string {
  return Date.now().toString()
}

/**
 * Validate a form load token
 * Returns the elapsed time in seconds, or null if invalid
 */
export function validateFormLoadToken(token: string): number | null {
  const loadTime = parseInt(token, 10)
  if (isNaN(loadTime)) return null

  const elapsed = (Date.now() - loadTime) / 1000

  // Token too old (1 hour max)
  if (elapsed > 3600) return null

  // Token in future (invalid)
  if (elapsed < 0) return null

  return elapsed
}

// ============================================================================
// CAPTCHA-READY INTERFACE
// ============================================================================

/**
 * Provider types for spam protection
 * Easy to extend with new providers
 */
export type SpamProtectionProvider = 'honeypot' | 'hcaptcha' | 'recaptcha' | 'turnstile'

/**
 * Unified spam protection interface
 * Can be implemented by different providers
 */
export interface SpamProtector {
  provider: SpamProtectionProvider
  verify: (data: Record<string, unknown>) => Promise<SpamCheckResult>
}

/**
 * Type guard to check if a value is a string
 */
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Type guard to check if a value is a number
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

/**
 * Safely extract honeypot value from unknown data
 */
function extractHoneypotValue(data: Record<string, unknown>): string | null | undefined {
  const value = data.website ?? data.honeypot ?? data._hp
  return isString(value) ? value : undefined
}

/**
 * Safely extract form load time from unknown data
 */
function extractFormLoadTime(data: Record<string, unknown>): string | number {
  const value = data._formLoadTime ?? data.formLoadTime ?? data._t
  if (isString(value)) return value
  if (isNumber(value)) return value
  // Default to current time if invalid
  return Date.now()
}

/**
 * Safely extract min submit time from unknown data
 */
function extractMinSubmitTime(data: Record<string, unknown>): number | undefined {
  const value = data.minSubmitTime
  return isNumber(value) ? value : undefined
}

/**
 * Honeypot spam protector implementation
 */
export const honeypotProtector: SpamProtector = {
  provider: 'honeypot',
  verify: async (data) => {
    return checkHoneypot({
      honeypotValue: extractHoneypotValue(data),
      formLoadTime: extractFormLoadTime(data),
      minSubmitTime: extractMinSubmitTime(data),
    })
  },
}

/**
 * Placeholder for future CAPTCHA implementations
 * These would make API calls to the respective services
 */
export const hcaptchaProtector: SpamProtector = {
  provider: 'hcaptcha',
  verify: async (data) => {
    // TODO: Implement hCaptcha verification
    // const response = await fetch('https://hcaptcha.com/siteverify', {...})
    console.warn('hCaptcha not yet implemented, falling back to honeypot')
    return honeypotProtector.verify(data)
  },
}

export const recaptchaProtector: SpamProtector = {
  provider: 'recaptcha',
  verify: async (data) => {
    // TODO: Implement reCAPTCHA verification
    // const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {...})
    console.warn('reCAPTCHA not yet implemented, falling back to honeypot')
    return honeypotProtector.verify(data)
  },
}

/**
 * Get spam protector by provider type
 */
export function getSpamProtector(provider: SpamProtectionProvider = 'honeypot'): SpamProtector {
  switch (provider) {
    case 'hcaptcha':
      return hcaptchaProtector
    case 'recaptcha':
      return recaptchaProtector
    case 'turnstile':
      // Cloudflare Turnstile - similar to hCaptcha
      return hcaptchaProtector // Placeholder
    case 'honeypot':
    default:
      return honeypotProtector
  }
}
