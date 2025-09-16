/**
 * Challenge System Helper Functions
 *
 * Utility functions to support the challenge system integration
 * and provide better error handling and user experience.
 */

import { toast } from 'react-toastify'
import {
  ChallengeError,
  ChallengeErrorType,
  CHALLENGE_CONFIG
} from '../types/challenge'
import { isChallengableUrl, getDegmodsServers } from './challengeApi'

/**
 * Check if any of the provided URLs require challenge verification
 */
export const hasChallengableUrls = (urls: string[]): boolean => {
  return urls.some((url) => isChallengableUrl(url))
}

/**
 * Filter URLs to only include those that require challenges
 */
export const filterChallengableUrls = (urls: string[]): string[] => {
  return urls.filter((url) => isChallengableUrl(url))
}

/**
 * Filter URLs to exclude those that require challenges
 */
export const filterNonChallengableUrls = (urls: string[]): string[] => {
  return urls.filter((url) => !isChallengableUrl(url))
}

/**
 * Get user-friendly error message for challenge errors
 */
export const getChallengeErrorMessage = (error: ChallengeError): string => {
  switch (error.type) {
    case 'not_found':
      return 'Challenge not found. Please try downloading the file again to create a new challenge.'

    case 'expired':
      return 'Challenge has expired. Please try downloading the file again to create a new challenge.'

    case 'already_completed':
      return 'Challenge has already been completed. You should be able to download the file now.'

    case 'invalid_solution':
      return 'Incorrect solution. Please try clicking in a different position on the puzzle.'

    case 'invalid_hash':
      return 'Invalid file hash. Please check the download link and try again.'

    case 'network_error':
      return 'Network error occurred. Please check your internet connection and try again.'

    case 'unknown_error':
    default:
      return error.message || 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Show appropriate toast notification for challenge errors
 */
export const showChallengeErrorToast = (error: ChallengeError): void => {
  const message = getChallengeErrorMessage(error)

  switch (error.type) {
    case 'invalid_solution':
      toast.warn(message)
      break

    case 'expired':
    case 'not_found':
      toast.info(message)
      break

    case 'network_error':
    case 'unknown_error':
    default:
      toast.error(message)
      break
  }
}

/**
 * Check if a challenge error is recoverable (user can retry)
 */
export const isChallengeErrorRecoverable = (error: ChallengeError): boolean => {
  return ['invalid_solution', 'network_error', 'unknown_error'].includes(
    error.type
  )
}

/**
 * Check if a challenge error requires a new challenge (restart download)
 */
export const challengeErrorRequiresRestart = (
  error: ChallengeError
): boolean => {
  return ['not_found', 'expired', 'already_completed'].includes(error.type)
}

/**
 * Validate that a position is within the challenge bounds
 */
export const isValidChallengePosition = (x: number, y: number): boolean => {
  return (
    x >= 0 &&
    x <= CHALLENGE_CONFIG.IMAGE_WIDTH &&
    y >= 0 &&
    y <= CHALLENGE_CONFIG.IMAGE_HEIGHT
  )
}

/**
 * Get the expected click area for a gap position (with tolerance)
 */
export const getChallengeClickArea = (
  gapPosition: number
): { min: number; max: number } => {
  return {
    min: Math.max(0, gapPosition - CHALLENGE_CONFIG.CLICK_TOLERANCE),
    max: Math.min(
      CHALLENGE_CONFIG.MAX_POSITION,
      gapPosition + CHALLENGE_CONFIG.CLICK_TOLERANCE
    )
  }
}

/**
 * Check if a click position is likely to be correct (for UI feedback)
 */
export const isLikelyCorrectClick = (
  clickX: number,
  gapPosition: number
): boolean => {
  const area = getChallengeClickArea(gapPosition)
  return clickX >= area.min && clickX <= area.max
}

/**
 * Get information about available degmods servers
 */
export const getDegmodsServerInfo = (): {
  count: number
  servers: string[]
} => {
  const servers = getDegmodsServers()
  return {
    count: servers.length,
    servers
  }
}

/**
 * Check if the challenge system is available (at least one degmods server configured)
 */
export const isChallengeSystemAvailable = (): boolean => {
  return getDegmodsServers().length > 0
}

/**
 * Get help text for users about the challenge system
 */
export const getChallengeHelpText = (): string => {
  return `
    The challenge system protects ZIP file downloads from automated abuse. 
    To download ZIP files from degmods servers, you'll need to complete a simple visual puzzle.
    
    Instructions:
    1. Look for the missing yellow square in the puzzle
    2. Click where the missing square should be
    3. If correct, your download will begin automatically
    
    The challenge expires after ${CHALLENGE_CONFIG.EXPIRATION_TIME / (60 * 1000)} minutes.
  `.trim()
}

/**
 * Log challenge system events for debugging
 */
export const logChallengeEvent = (event: string, data?: unknown): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Challenge System] ${event}`, data || '')
  }
}

/**
 * Create a challenge error object with consistent formatting
 */
export const createChallengeError = (
  type: ChallengeErrorType,
  message: string,
  statusCode?: number,
  originalError?: Error
): ChallengeError => {
  const error: ChallengeError = {
    type,
    message,
    statusCode
  }

  // Log error for debugging
  logChallengeEvent(`Error: ${type}`, { message, statusCode, originalError })

  return error
}

/**
 * Retry helper for challenge operations
 */
export const retryChallenge = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logChallengeEvent(`Attempt ${attempt}/${maxRetries}`)
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      logChallengeEvent(`Attempt ${attempt} failed`, lastError.message)

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
      }
    }
  }

  throw lastError || new Error('All retry attempts failed')
}

/**
 * Sanitize SVG content to prevent XSS attacks
 */
export const sanitizeSvgContent = (svgContent: string): string => {
  // Basic SVG sanitization - remove script tags and event handlers
  return svgContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
}

/**
 * Validate SVG content structure
 */
export const isValidSvgContent = (svgContent: string): boolean => {
  try {
    // Check if it's a valid SVG
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgContent, 'image/svg+xml')
    const svg = doc.querySelector('svg')

    if (!svg) {
      return false
    }

    // Check for expected dimensions
    const width = svg.getAttribute('width')
    const height = svg.getAttribute('height')

    return (
      width === CHALLENGE_CONFIG.IMAGE_WIDTH.toString() &&
      height === CHALLENGE_CONFIG.IMAGE_HEIGHT.toString()
    )
  } catch {
    return false
  }
}

/**
 * Format challenge expiration time for display
 */
export const formatChallengeExpiration = (expiresInSeconds: number): string => {
  const minutes = Math.floor(expiresInSeconds / 60)
  const seconds = expiresInSeconds % 60

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
}

/**
 * Check if challenge is about to expire (within 1 minute)
 */
export const isChallengeNearExpiry = (expiresAt: number): boolean => {
  const now = Date.now()
  const timeLeft = expiresAt - now
  return timeLeft > 0 && timeLeft <= 60 * 1000 // 1 minute
}

/**
 * Get challenge status message for UI
 */
export const getChallengeStatusMessage = (
  status: string,
  expiresAt?: number
): string => {
  switch (status) {
    case 'pending':
      return 'Initializing challenge...'
    case 'displaying':
      return 'Loading challenge puzzle...'
    case 'solving':
      if (expiresAt && isChallengeNearExpiry(expiresAt)) {
        return 'Challenge expires soon - please complete quickly!'
      }
      return 'Drag the gray square to the correct position'
    case 'verifying':
      return 'Verifying your solution...'
    case 'completed':
      return 'Challenge completed successfully!'
    case 'failed':
      return 'Challenge failed'
    case 'expired':
      return 'Challenge has expired'
    default:
      return 'Unknown challenge status'
  }
}
