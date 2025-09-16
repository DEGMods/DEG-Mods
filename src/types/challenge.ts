/**
 * Challenge System API Types
 *
 * Types and interfaces for the visual CAPTCHA-like verification mechanism
 * integrated into the bs.degmods.com Blossom server's download flow for ZIP files only.
 */

/**
 * Challenge creation response when attempting to download a ZIP file
 */
export interface ChallengeCreationResponse {
  /** Message indicating challenge was created */
  message: string
  /** URL to fetch the SVG challenge */
  challenge_url: string
  /** URL template for verifying the challenge solution */
  verify_url: string
  /** Challenge expiration time in seconds */
  expires_in: number
}

/**
 * Challenge verification response
 */
export interface ChallengeVerificationResponse {
  /** Whether the challenge solution was correct */
  success: boolean
  /** Response message */
  message: string
}

/**
 * Challenge state for tracking progress
 */
export type ChallengeStatus =
  | 'pending'
  | 'displaying'
  | 'solving'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'expired'

/**
 * Challenge context data
 */
export interface ChallengeContext {
  /** File hash the challenge is for */
  hash: string
  /** Current challenge status */
  status: ChallengeStatus
  /** PNG image URL of the challenge */
  imageUrl?: string
  /** Error message if challenge failed */
  error?: string
  /** Timestamp when challenge was created */
  createdAt?: number
  /** Timestamp when challenge expires */
  expiresAt?: number
}

/**
 * Challenge click position data
 */
export interface ChallengePosition {
  /** X coordinate of the click */
  x: number
  /** Y coordinate of the click */
  y: number
}

/**
 * Challenge solution data
 */
export interface ChallengeSolution {
  /** File hash */
  hash: string
  /** Clicked position */
  position: ChallengePosition
  /** SHA256 hash of the position */
  code: string
}

/**
 * Challenge API error types
 */
export type ChallengeErrorType =
  | 'not_found' // Challenge doesn't exist
  | 'expired' // Challenge has expired
  | 'already_completed' // Challenge already completed
  | 'invalid_solution' // Invalid solution provided
  | 'invalid_hash' // Invalid file hash
  | 'network_error' // Network/fetch error
  | 'unknown_error' // Unknown error

/**
 * Challenge API error
 */
export interface ChallengeError {
  /** Error type */
  type: ChallengeErrorType
  /** Error message */
  message: string
  /** HTTP status code if applicable */
  statusCode?: number
}

/**
 * Challenge configuration constants
 */
export const CHALLENGE_CONFIG = {
  /** Image dimensions */
  IMAGE_WIDTH: 350,
  IMAGE_HEIGHT: 150,

  /** Gap dimensions */
  GAP_WIDTH: 50,
  GAP_HEIGHT: 50,

  /** Position constraints */
  MIN_POSITION: 0,
  MAX_POSITION: 300,

  /** Slider starting position */
  SLIDER_START_X: 25, // Always start 25px from left edge
  SLIDER_TRACK_Y: 50, // Fixed Y position - 50px from top

  /** Click tolerance in pixels */
  CLICK_TOLERANCE: 3,

  /** Challenge expiration time in milliseconds */
  EXPIRATION_TIME: 10 * 60 * 1000, // 10 minutes

  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 5000 // 5 seconds
} as const

/**
 * Challenge API endpoints
 */
export const CHALLENGE_ENDPOINTS = {
  /** Get challenge SVG */
  GET_CHALLENGE: (hash: string) => `/challenge/${hash}`,

  /** Verify challenge solution */
  VERIFY_CHALLENGE: (hash: string, code: string) =>
    `/challenge-verify/${hash}/${code}`,

  /** Download ZIP file */
  DOWNLOAD_ZIP: (hash: string) => `/${hash}.zip`
} as const
