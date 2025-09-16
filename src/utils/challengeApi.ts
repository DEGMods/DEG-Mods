/**
 * Challenge System API Service
 *
 * Service functions for interacting with degmods-server type blossom servers.
 * This system is only active for ZIP file downloads from servers with type 'degmods-server'.
 */

import {
  ChallengeCreationResponse,
  ChallengeVerificationResponse,
  ChallengeError,
  ChallengeErrorType,
  ChallengeSolution,
  ChallengePosition,
  CHALLENGE_CONFIG,
  CHALLENGE_ENDPOINTS
} from '../types/challenge'
import { MEDIA_OPTIONS } from '../controllers/image'

/**
 * Get all degmods-server type servers from MEDIA_OPTIONS
 */
export const getDegmodsServers = (): string[] => {
  return MEDIA_OPTIONS.filter((option) => option.type === 'degmods-server').map(
    (option) =>
      option.host.endsWith('/') ? option.host.slice(0, -1) : option.host
  )
}

/**
 * Check if a URL is from a degmods-server that requires challenges for ZIP files
 */
export const isChallengableUrl = (url: string): boolean => {
  if (!url.endsWith('.zip')) {
    return false
  }

  try {
    const urlObj = new URL(url)
    const degmodsServers = getDegmodsServers()

    return degmodsServers.some((serverUrl) => {
      try {
        const serverUrlObj = new URL(serverUrl)
        return urlObj.hostname === serverUrlObj.hostname
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}

/**
 * Check if a server URL is a degmods-server type
 */
export const isDegmodsServer = (serverUrl: string): boolean => {
  try {
    const normalizedUrl = serverUrl.endsWith('/')
      ? serverUrl.slice(0, -1)
      : serverUrl
    const degmodsServers = getDegmodsServers()
    return degmodsServers.includes(normalizedUrl)
  } catch {
    return false
  }
}

/**
 * Get the server URL for a given URL if it's a degmods-server
 */
export const getDegmodsServerUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    const degmodsServers = getDegmodsServers()

    const matchingServer = degmodsServers.find((serverUrl) => {
      try {
        const serverUrlObj = new URL(serverUrl)
        return urlObj.hostname === serverUrlObj.hostname
      } catch {
        return false
      }
    })

    return matchingServer || null
  } catch {
    return null
  }
}

/**
 * Extract file hash from a degmods-server URL
 */
export const extractHashFromBlossomUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    const degmodsServers = getDegmodsServers()

    // Check if this URL is from a degmods-server
    const isFromDegmodsServer = degmodsServers.some((serverUrl) => {
      try {
        const serverUrlObj = new URL(serverUrl)
        return urlObj.hostname === serverUrlObj.hostname
      } catch {
        return false
      }
    })

    if (!isFromDegmodsServer) {
      return null
    }

    // Extract hash from path (e.g., /abc123def456.zip -> abc123def456)
    const pathParts = urlObj.pathname.split('/')
    const filename = pathParts[pathParts.length - 1]

    if (filename.endsWith('.zip')) {
      return filename.replace('.zip', '')
    }

    return filename || null
  } catch {
    return null
  }
}

/**
 * Calculate SHA-256 hash of a position value
 */
export const hashPosition = async (position: number): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(position.toString())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a challenge error object
 */
const createChallengeError = (
  type: ChallengeErrorType,
  message: string,
  statusCode?: number
): ChallengeError => ({
  type,
  message,
  statusCode
})

/**
 * Handle fetch errors and convert to ChallengeError
 */
const handleFetchError = (error: unknown, context: string): ChallengeError => {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createChallengeError(
        'network_error',
        `${context} request was cancelled`
      )
    }
    if (error.message.includes('fetch')) {
      return createChallengeError(
        'network_error',
        `Network error during ${context}: ${error.message}`
      )
    }
    return createChallengeError(
      'unknown_error',
      `${context} failed: ${error.message}`
    )
  }
  return createChallengeError(
    'unknown_error',
    `Unknown error during ${context}`
  )
}

/**
 * Attempt to download a ZIP file and handle challenge creation
 */
export const attemptZipDownload = async (
  hash: string,
  serverUrl: string,
  signal?: AbortSignal
): Promise<{
  needsChallenge: boolean
  challengeInfo?: ChallengeCreationResponse
  error?: ChallengeError
}> => {
  try {
    // Ensure the server is a degmods-server
    if (!isDegmodsServer(serverUrl)) {
      return {
        needsChallenge: false,
        error: createChallengeError(
          'unknown_error',
          'Server does not support challenge system'
        )
      }
    }

    const normalizedServerUrl = serverUrl.endsWith('/')
      ? serverUrl.slice(0, -1)
      : serverUrl
    const url = `${normalizedServerUrl}/${hash}.zip`

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      CHALLENGE_CONFIG.REQUEST_TIMEOUT
    )

    // Combine signals if provided
    let combinedSignal = controller.signal
    if (signal) {
      if (typeof AbortSignal.any === 'function') {
        combinedSignal = AbortSignal.any([signal, controller.signal])
      } else {
        combinedSignal = signal
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      signal: combinedSignal
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      // File downloaded successfully, no challenge needed
      return { needsChallenge: false }
    }

    if (response.status === 202) {
      // Challenge required
      try {
        const challengeInfo: ChallengeCreationResponse = await response.json()
        return { needsChallenge: true, challengeInfo }
      } catch (parseError) {
        return {
          needsChallenge: false,
          error: createChallengeError(
            'unknown_error',
            'Failed to parse challenge creation response',
            202
          )
        }
      }
    }

    // Other error status codes
    const errorMessage = `ZIP download failed with status ${response.status}`
    return {
      needsChallenge: false,
      error: createChallengeError(
        'unknown_error',
        errorMessage,
        response.status
      )
    }
  } catch (error) {
    return {
      needsChallenge: false,
      error: handleFetchError(error, 'ZIP download attempt')
    }
  }
}

/**
 * Fetch the PNG challenge for a given hash
 */
export const fetchChallenge = async (
  hash: string,
  serverUrl: string,
  signal?: AbortSignal
): Promise<{ imageUrl: string } | ChallengeError> => {
  try {
    // Ensure the server is a degmods-server
    if (!isDegmodsServer(serverUrl)) {
      return createChallengeError(
        'unknown_error',
        'Server does not support challenge system'
      )
    }

    const normalizedServerUrl = serverUrl.endsWith('/')
      ? serverUrl.slice(0, -1)
      : serverUrl
    const url = `${normalizedServerUrl}${CHALLENGE_ENDPOINTS.GET_CHALLENGE(hash)}`

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      CHALLENGE_CONFIG.REQUEST_TIMEOUT
    )

    // Combine signals if provided
    let combinedSignal = controller.signal
    if (signal) {
      if (typeof AbortSignal.any === 'function') {
        combinedSignal = AbortSignal.any([signal, controller.signal])
      } else {
        combinedSignal = signal
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      signal: combinedSignal,
      headers: {
        Accept: 'image/png'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorType: ChallengeErrorType = 'unknown_error'
      let message = `Failed to fetch challenge: ${response.status}`

      switch (response.status) {
        case 404:
          errorType = 'not_found'
          message = 'Challenge not found for this file'
          break
        case 410:
          errorType = 'expired'
          message = 'Challenge has expired or already completed'
          break
        case 400:
          errorType = 'invalid_hash'
          message = 'Invalid file hash provided'
          break
      }

      return createChallengeError(errorType, message, response.status)
    }

    // For PNG images, we return the URL directly since the image is served from the endpoint
    const imageUrl = url

    // Verify the response is actually a PNG image
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('image/png')) {
      return createChallengeError('unknown_error', 'Invalid PNG image received')
    }

    return { imageUrl }
  } catch (error) {
    return handleFetchError(error, 'challenge fetch')
  }
}

/**
 * Verify a challenge solution
 */
export const verifyChallenge = async (
  solution: ChallengeSolution,
  serverUrl: string,
  signal?: AbortSignal
): Promise<ChallengeVerificationResponse | ChallengeError> => {
  try {
    // Ensure the server is a degmods-server
    if (!isDegmodsServer(serverUrl)) {
      return createChallengeError(
        'unknown_error',
        'Server does not support challenge system'
      )
    }

    const normalizedServerUrl = serverUrl.endsWith('/')
      ? serverUrl.slice(0, -1)
      : serverUrl
    const url = `${normalizedServerUrl}${CHALLENGE_ENDPOINTS.VERIFY_CHALLENGE(solution.hash, solution.code)}`

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      CHALLENGE_CONFIG.REQUEST_TIMEOUT
    )

    // Combine signals if provided
    let combinedSignal = controller.signal
    if (signal) {
      if (typeof AbortSignal.any === 'function') {
        combinedSignal = AbortSignal.any([signal, controller.signal])
      } else {
        combinedSignal = signal
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      signal: combinedSignal,
      headers: {
        Accept: 'application/json'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorType: ChallengeErrorType = 'unknown_error'
      let message = `Challenge verification failed: ${response.status}`

      switch (response.status) {
        case 400:
          errorType = 'invalid_solution'
          message = 'Invalid solution provided'
          break
        case 404:
          errorType = 'not_found'
          message = 'Challenge not found'
          break
        case 409:
          errorType = 'already_completed'
          message = 'Challenge already completed'
          break
        case 410:
          errorType = 'expired'
          message = 'Challenge has expired'
          break
      }

      return createChallengeError(errorType, message, response.status)
    }

    const result: ChallengeVerificationResponse = await response.json()
    return result
  } catch (error) {
    return handleFetchError(error, 'challenge verification')
  }
}

/**
 * Create a challenge solution from a click position
 */
export const createSolution = async (
  hash: string,
  position: ChallengePosition
): Promise<ChallengeSolution> => {
  const code = await hashPosition(position.x)
  return {
    hash,
    position,
    code
  }
}

/**
 * Check if a position is within the valid click area
 */
export const isValidClickPosition = (position: ChallengePosition): boolean => {
  return (
    position.x >= CHALLENGE_CONFIG.MIN_POSITION &&
    position.x <= CHALLENGE_CONFIG.MAX_POSITION &&
    position.y >= 0 &&
    position.y <= CHALLENGE_CONFIG.IMAGE_HEIGHT
  )
}

/**
 * Get the expected gap position with tolerance
 */
export const getGapPositionRange = (
  gapPosition: number
): { min: number; max: number } => {
  return {
    min: gapPosition - CHALLENGE_CONFIG.CLICK_TOLERANCE,
    max: gapPosition + CHALLENGE_CONFIG.CLICK_TOLERANCE
  }
}

/**
 * Check if a click position is likely correct (for client-side feedback)
 */
export const isLikelyCorrectPosition = (
  clickPosition: ChallengePosition,
  gapPosition: number
): boolean => {
  const range = getGapPositionRange(gapPosition)
  return clickPosition.x >= range.min && clickPosition.x <= range.max
}
