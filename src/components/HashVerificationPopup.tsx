import { createPortal } from 'react-dom'
import { useState, useEffect, useCallback } from 'react'
import { DownloadUrl } from '../types'
import { getFilenameFromUrl } from '../utils'
import { getFileSha256 } from '../utils/getFileSha256'
import { isValidSha256Hash } from '../utils/hashBlocking'
import {
  validateFileContent,
  FileValidationResult
} from '../utils/fileValidation'
import {
  isChallengableUrl,
  extractHashFromBlossomUrl,
  fetchChallenge,
  verifyChallenge,
  createSolution,
  getDegmodsServerUrl
} from '../utils/challengeApi'
import {
  ChallengeCreationResponse,
  ChallengeContext,
  ChallengePosition,
  ChallengeError,
  ChallengeVerificationResponse
} from '../types/challenge'
import ChallengeComponent from './ChallengeComponent'
import { useBodyScrollDisable } from '../hooks'

interface HashVerificationPopupProps extends DownloadUrl {
  allUrls?: string[]
  handleClose: () => void
}

type VerificationStatus =
  | 'idle'
  | 'downloading'
  | 'verifying'
  | 'success'
  | 'hash_mismatch'
  | 'content_invalid'
  | 'error'
  | 'challenge_required'

interface VerificationResult {
  status: VerificationStatus
  downloadedFile?: File
  calculatedHash?: string
  expectedHash?: string
  error?: string
  downloadUrl?: string
  validationResult?: FileValidationResult
  challengeInfo?: ChallengeCreationResponse
  downloadProgress?: number // Progress percentage (0-100)
}

export const HashVerificationPopup = ({
  title,
  url,
  hash,
  automaticHash,
  allUrls = [url],
  handleClose
}: HashVerificationPopupProps) => {
  useBodyScrollDisable(true)

  // Use the provided hash or automatic hash for verification
  const expectedHash = hash || automaticHash
  const hasValidHash = expectedHash && isValidSha256Hash(expectedHash)

  const [verificationResult, setVerificationResult] =
    useState<VerificationResult>({
      status: 'downloading',
      downloadProgress: 0
    })
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0)
  const [challengeContext, setChallengeContext] = useState<ChallengeContext>({
    hash: expectedHash || '',
    status: 'pending'
  })
  const [isVerifyingChallenge, setIsVerifyingChallenge] = useState(false)

  // Auto-start download and verification when popup opens
  useEffect(() => {
    performHashVerification()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Initialize the challenge by fetching PNG image (from 202 response)
   */
  const initializeChallenge = useCallback(
    async (downloadUrl: string, challengeInfo?: ChallengeCreationResponse) => {
      // Validate that this is a challengeable URL
      if (!isChallengableUrl(downloadUrl)) {
        setChallengeContext((prev) => ({
          ...prev,
          status: 'failed',
          error: 'This file does not require a challenge'
        }))
        return
      }

      // Get the server URL for this download
      const serverUrl = getDegmodsServerUrl(downloadUrl)
      if (!serverUrl) {
        setChallengeContext((prev) => ({
          ...prev,
          status: 'failed',
          error: 'Unable to determine server for challenge'
        }))
        return
      }

      setChallengeContext((prev) => ({
        ...prev,
        status: 'displaying',
        createdAt: Date.now(),
        expiresAt: challengeInfo
          ? Date.now() + challengeInfo.expires_in * 1000
          : undefined
      }))

      // Create abort controller for this request
      const controller = new AbortController()

      try {
        const challengeHash =
          extractHashFromBlossomUrl(downloadUrl) || expectedHash || ''
        const result = await fetchChallenge(
          challengeHash,
          serverUrl,
          controller.signal
        )

        if ('type' in result) {
          // Error occurred
          const error = result as ChallengeError
          setChallengeContext((prev) => ({
            ...prev,
            status: 'failed',
            error: error.message
          }))
          return
        }

        // Success - update context with PNG image URL
        console.log(
          '[Challenge] Setting status to solving, image URL:',
          result.imageUrl
        )
        setChallengeContext((prev) => ({
          ...prev,
          status: 'solving',
          imageUrl: result.imageUrl
        }))
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return // Request was cancelled
        }

        setChallengeContext((prev) => ({
          ...prev,
          status: 'failed',
          error:
            error instanceof Error ? error.message : 'Failed to load challenge'
        }))
      }
    },
    [expectedHash]
  )

  /**
   * Downloads file from a URL and returns it as a File object
   * Handles challenge responses for degmods-server ZIP files
   */
  const downloadFileForVerification = useCallback(
    async (downloadUrl: string): Promise<File> => {
      const response = await fetch(downloadUrl)
      console.log('[HashVerification] Response status:', response.status)

      // Check for challenge response (HTTP 202)
      if (response.status === 202 && isChallengableUrl(downloadUrl)) {
        console.log(
          '[HashVerification] 202 response detected, parsing challenge info'
        )
        try {
          const challengeInfo: ChallengeCreationResponse = await response.json()

          console.log(
            '[HashVerification] Received 202 challenge response:',
            challengeInfo
          )

          // Set challenge required status
          setVerificationResult({
            status: 'challenge_required',
            challengeInfo,
            downloadUrl
          })

          // Initialize challenge directly
          await initializeChallenge(downloadUrl, challengeInfo)

          // Throw error to stop the download process
          throw new Error('Challenge required - will be handled inline')
        } catch (parseError) {
          console.error(
            '[HashVerification] Failed to parse 202 response:',
            parseError
          )
          throw new Error('Failed to parse challenge response')
        }
      } else {
        console.log(
          '[HashVerification] No challenge required - proceeding with direct download'
        )
        console.log(
          '[HashVerification] Status:',
          response.status,
          'Challengeable:',
          isChallengableUrl(downloadUrl)
        )
      }

      if (!response.ok) {
        // For challengeable URLs, handle challenge-related errors specially
        if (isChallengableUrl(downloadUrl)) {
          if (response.status === 410) {
            // Challenge expired - need to get a new challenge
            throw new Error('Challenge expired - requires new challenge')
          } else if (response.status === 403) {
            // Challenge required but not completed
            throw new Error('Challenge required - access forbidden')
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Get content length for progress tracking
      const contentLength = response.headers.get('content-length')
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0

      // If we have content length, track progress
      if (totalBytes > 0 && response.body) {
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let receivedBytes = 0

        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read()

            if (done) break

            if (value) {
              chunks.push(value)
              receivedBytes += value.length

              // Update progress
              const progress = Math.round((receivedBytes / totalBytes) * 100)
              setVerificationResult((prev) => ({
                ...prev,
                downloadProgress: progress
              }))
            }
          }
        } finally {
          reader.releaseLock()
        }

        // Combine all chunks into a single Uint8Array
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const combinedArray = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
          combinedArray.set(chunk, offset)
          offset += chunk.length
        }

        const blob = new Blob([combinedArray], {
          type:
            response.headers.get('content-type') || 'application/octet-stream'
        })
        const filename = getFilenameFromUrl(downloadUrl)
        return new File([blob], filename, { type: blob.type })
      } else {
        // Fallback to regular blob() if no content-length header
        const blob = await response.blob()
        const filename = getFilenameFromUrl(downloadUrl)
        return new File([blob], filename, { type: blob.type })
      }
    },
    [initializeChallenge]
  )

  /**
   * Attempts to download and verify hash from all available URLs
   */
  const performHashVerification = async () => {
    await performHashVerificationFromIndex(0)
  }

  /**
   * Downloads the file to the user's computer
   */
  const downloadVerifiedFile = useCallback(
    (fileToDownload?: File) => {
      const file = fileToDownload || verificationResult.downloadedFile
      if (!file) {
        return
      }

      const blobUrl = URL.createObjectURL(file)

      const a = document.createElement('a')
      a.href = blobUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl)
    },
    [verificationResult.downloadedFile]
  )

  /**
   * Handles download anyway when user clicks OK on warning
   */
  const handleDownloadAnyway = () => {
    if (verificationResult.downloadedFile) {
      downloadVerifiedFile(verificationResult.downloadedFile)
      handleClose()
    }
  }

  /**
   * Perform hash verification after challenge is completed (no auto-download)
   */
  const performHashVerificationAfterChallenge = useCallback(
    async (downloadUrl: string) => {
      setVerificationResult({ status: 'downloading', downloadProgress: 0 })

      try {
        console.log(
          `[HashVerification] Downloading after challenge completion: ${downloadUrl}`
        )

        // Download the file (this should now work without challenge)
        const downloadedFile = await downloadFileForVerification(downloadUrl)

        if (!hasValidHash) {
          // If no hash available, just show success
          setVerificationResult({
            status: 'success',
            downloadedFile,
            downloadUrl
          })
          // Auto-download the file only once here
          downloadVerifiedFile(downloadedFile)
          return
        }

        setVerificationResult({
          status: 'verifying',
          downloadedFile,
          downloadUrl
        })

        // Calculate hash
        const calculatedHash = await getFileSha256(downloadedFile)

        // Compare hashes (case-insensitive)
        const hashesMatch =
          calculatedHash.toLowerCase() === expectedHash!.toLowerCase()

        if (hashesMatch) {
          setVerificationResult({
            status: 'success',
            downloadedFile,
            calculatedHash,
            expectedHash: expectedHash!,
            downloadUrl
          })
          // Auto-download the verified file only once here
          downloadVerifiedFile(downloadedFile)
        } else {
          setVerificationResult({
            status: 'hash_mismatch',
            downloadedFile,
            calculatedHash,
            expectedHash: expectedHash!,
            downloadUrl
          })
        }
      } catch (error) {
        setVerificationResult({
          status: 'error',
          error:
            error instanceof Error ? error.message : 'Failed to download file'
        })
      }
    },
    [
      hasValidHash,
      expectedHash,
      downloadVerifiedFile,
      downloadFileForVerification
    ]
  )

  /**
   * Handle user click on challenge position
   */
  const handlePositionClick = useCallback(
    async (position: ChallengePosition) => {
      console.log(
        '[Challenge] handlePositionClick called with position:',
        position
      )
      console.log(
        '[Challenge] Current challenge status:',
        challengeContext.status
      )

      if (challengeContext.status !== 'solving') {
        console.log('[Challenge] Ignoring click - not in solving state')
        return
      }

      // Get the server URL for verification
      const serverUrl = getDegmodsServerUrl(
        verificationResult.downloadUrl || url
      )
      if (!serverUrl) {
        return
      }

      // Set verifying state for UI feedback
      setIsVerifyingChallenge(true)

      // Create abort controller for verification request
      const controller = new AbortController()

      try {
        const challengeHash =
          extractHashFromBlossomUrl(verificationResult.downloadUrl || url) ||
          expectedHash ||
          ''

        // Create solution from click position
        const solution = await createSolution(challengeHash, position)

        // Verify the solution
        const result = await verifyChallenge(
          solution,
          serverUrl,
          controller.signal
        )

        if ('type' in result) {
          // Error occurred
          const error = result as ChallengeError

          setIsVerifyingChallenge(false)

          if (error.type === 'invalid_solution') {
            // Keep in solving state for invalid solutions to allow retry
            setChallengeContext((prev) => ({
              ...prev,
              status: 'solving',
              error: error.message
            }))
          } else {
            // For other errors, set to failed state
            setChallengeContext((prev) => ({
              ...prev,
              status: 'failed',
              error: error.message
            }))
          }
          return
        }

        // Success
        const challengeResult = result as ChallengeVerificationResponse
        setIsVerifyingChallenge(false)

        if (challengeResult.success) {
          setChallengeContext((prev) => ({ ...prev, status: 'completed' }))

          // Now proceed with the actual download (without auto-downloading)
          await performHashVerificationAfterChallenge(
            verificationResult.downloadUrl || url
          )
        } else {
          setChallengeContext((prev) => ({
            ...prev,
            status: 'solving', // Allow retry
            error: challengeResult.message
          }))
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return // Request was cancelled
        }

        setIsVerifyingChallenge(false)
        setChallengeContext((prev) => ({
          ...prev,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Verification failed'
        }))
      }
    },
    [
      challengeContext.status,
      expectedHash,
      url,
      verificationResult.downloadUrl,
      performHashVerificationAfterChallenge
    ]
  )

  /**
   * Retry challenge (fetch new challenge)
   */
  const handleRetryChallenge = useCallback(() => {
    const downloadUrl = verificationResult.downloadUrl || url
    initializeChallenge(downloadUrl, verificationResult.challengeInfo)
  }, [
    initializeChallenge,
    url,
    verificationResult.challengeInfo,
    verificationResult.downloadUrl
  ])

  /**
   * Attempts to download from the next available alternative source
   */
  const handleDownloadFromAlternativeSource = async () => {
    // Find the next URL that hasn't been tried yet, or cycle back to the beginning
    const nextUrlIndex = (currentUrlIndex + 1) % allUrls.length

    if (nextUrlIndex === currentUrlIndex && allUrls.length > 1) {
      // If we only have one URL or we've cycled back to the same URL,
      // still try again as the server might be working now
      setCurrentUrlIndex(0)
    } else {
      setCurrentUrlIndex(nextUrlIndex)
    }

    // Reset verification state and try again
    setVerificationResult({ status: 'downloading', downloadProgress: 0 })

    // Start verification process again from the new URL index
    await performHashVerificationFromIndex(nextUrlIndex)
  }

  /**
   * Performs hash verification starting from a specific URL index
   */
  const performHashVerificationFromIndex = async (startIndex: number = 0) => {
    if (!hasValidHash) {
      // If no hash available, just download the file directly
      setVerificationResult({ status: 'downloading', downloadProgress: 0 })

      try {
        const downloadedFile = await downloadFileForVerification(
          allUrls[startIndex]
        )
        setVerificationResult({
          status: 'success',
          downloadedFile,
          downloadUrl: allUrls[startIndex]
        })
        // Only auto-download if this wasn't a challengeable URL
        // (challengeable URLs should only download after challenge completion)
        if (!isChallengableUrl(allUrls[startIndex])) {
          downloadVerifiedFile(downloadedFile)
        }
        return
      } catch (error) {
        setVerificationResult({
          status: 'error',
          error: 'Failed to download file'
        })
        return
      }
    }

    setVerificationResult({ status: 'downloading', downloadProgress: 0 })

    let lastError: Error | null = null

    // For challengeable URLs, prioritize them and handle challenge properly
    const challengeableUrls = allUrls.filter((url) => isChallengableUrl(url))
    const nonChallengeableUrls = allUrls.filter(
      (url) => !isChallengableUrl(url)
    )

    // Try challengeable URLs first (these will trigger challenge flow)
    const urlsToTry = [...challengeableUrls, ...nonChallengeableUrls]

    // Try each URL starting from the specified index
    for (let i = 0; i < urlsToTry.length; i++) {
      const urlIndex = (startIndex + i) % urlsToTry.length
      const downloadUrl = urlsToTry[urlIndex]
      setCurrentUrlIndex(allUrls.indexOf(downloadUrl))

      try {
        console.log(
          `[HashVerification] Attempting download from URL ${urlIndex + 1}/${urlsToTry.length}: ${downloadUrl}`
        )

        // Download the file
        const downloadedFile = await downloadFileForVerification(downloadUrl)

        setVerificationResult({
          status: 'verifying',
          downloadedFile,
          downloadUrl
        })

        // First, validate file content to detect fake 404s and other invalid content
        console.log('[HashVerification] Validating file content...')
        const validationResult = await validateFileContent(
          downloadedFile,
          expectedHash
        )

        if (!validationResult.isValid) {
          console.log(
            `[HashVerification] ✗ Content validation failed: ${validationResult.reason}`
          )
          console.log(
            `[HashVerification] Trying next URL due to content validation failure`
          )

          // If this is the last URL, show the content validation error
          if (i === urlsToTry.length - 1) {
            setVerificationResult({
              status: 'content_invalid',
              downloadedFile,
              downloadUrl,
              validationResult,
              error: validationResult.reason
            })
            return
          }

          // Otherwise, continue to the next URL
          continue
        }

        console.log('[HashVerification] ✓ Content validation passed')

        // Calculate hash
        const calculatedHash = await getFileSha256(downloadedFile)

        // Compare hashes (case-insensitive)
        const hashesMatch =
          calculatedHash.toLowerCase() === expectedHash!.toLowerCase()

        if (hashesMatch) {
          setVerificationResult({
            status: 'success',
            downloadedFile,
            calculatedHash,
            expectedHash: expectedHash!,
            downloadUrl,
            validationResult
          })
          // Only auto-download if this wasn't a challengeable URL
          // (challengeable URLs should only download after challenge completion)
          if (!isChallengableUrl(downloadUrl)) {
            downloadVerifiedFile(downloadedFile)
          }
          return
        } else {
          setVerificationResult({
            status: 'hash_mismatch',
            downloadedFile,
            calculatedHash,
            expectedHash: expectedHash!,
            downloadUrl,
            validationResult
          })

          return
        }
      } catch (error) {
        console.error(
          `[HashVerification] Error with URL ${downloadUrl}:`,
          error
        )
        lastError = error instanceof Error ? error : new Error('Unknown error')

        // For challengeable URLs, if we get a challenge-related error, don't continue to other URLs yet
        if (isChallengableUrl(downloadUrl) && error instanceof Error) {
          const errorMessage = error.message.toLowerCase()
          if (
            errorMessage.includes('challenge') ||
            errorMessage.includes('202') ||
            errorMessage.includes('expired') ||
            errorMessage.includes('forbidden')
          ) {
            // This is expected for challengeable URLs - the challenge flow will handle it
            console.log(
              '[HashVerification] Challenge-related error detected, stopping URL iteration:',
              errorMessage
            )

            // For expired challenges, we should try to get a fresh challenge
            if (errorMessage.includes('expired')) {
              console.log(
                '[HashVerification] Challenge expired, attempting to get fresh challenge'
              )
              try {
                await initializeChallenge(downloadUrl)
              } catch (initError) {
                console.error(
                  '[HashVerification] Failed to initialize fresh challenge:',
                  initError
                )
                setVerificationResult({
                  status: 'error',
                  error: 'Failed to get fresh challenge. Please try again.'
                })
              }
            }
            return
          }
        }

        // Continue to next URL if available
        if (i < urlsToTry.length - 1) {
          console.log('[HashVerification] Trying next URL...')
          continue
        }
      }
    }

    // If we get here, all URLs failed
    setVerificationResult({
      status: 'error',
      error: lastError?.message || 'Failed to download from all available URLs'
    })
  }

  /**
   * Get challenge status text for UI
   */
  const getChallengeStatusText = (): string => {
    console.log(
      '[Challenge] Getting status text for status:',
      challengeContext.status
    )
    switch (challengeContext.status) {
      case 'pending':
        return 'Initializing challenge...'
      case 'displaying':
        return 'Loading challenge...'
      case 'solving':
        return 'Solve the puzzle to continue'
      case 'verifying':
        return 'Verifying solution...'
      case 'completed':
        return 'Challenge completed!'
      case 'failed':
        return 'Challenge failed'
      case 'expired':
        return 'Challenge expired'
      default:
        return 'Challenge verification required'
    }
  }

  /**
   * Render challenge content based on current status
   */
  const renderChallengeContent = () => {
    // Challenge Info Row
    const challengeInfoRow = verificationResult.challengeInfo && (
      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
          <p>Challenge Info</p>
        </div>
        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
          <p style={{ fontSize: '0.9em' }}>
            Expires in{' '}
            {Math.round(verificationResult.challengeInfo.expires_in / 60)}{' '}
            minutes
          </p>
        </div>
      </div>
    )

    // Loading State
    if (
      challengeContext.status === 'pending' ||
      challengeContext.status === 'displaying'
    ) {
      return (
        <>
          {challengeInfoRow}
          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
              <p>Challenge</p>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '20px 0'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #f3f3f3',
                    borderTop: '2px solid #ffc107',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <span style={{ color: '#ffc107', fontSize: '0.9em' }}>
                  Loading challenge...
                </span>
              </div>
            </div>
          </div>
        </>
      )
    }

    // Challenge Component
    if (challengeContext.status === 'solving' && challengeContext.imageUrl) {
      console.log('[Challenge] Rendering challenge component with PNG image')
      return (
        <>
          {challengeInfoRow}
          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
              <p>Challenge</p>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
              <div style={{ padding: '10px 0' }}>
                <ChallengeComponent
                  imageUrl={challengeContext.imageUrl}
                  onPositionClick={handlePositionClick}
                  isVerifying={isVerifyingChallenge}
                  error={challengeContext.error}
                  showClickMarkers={false}
                />
              </div>
            </div>
          </div>
        </>
      )
    }

    // Verifying State
    if (challengeContext.status === 'verifying') {
      return (
        <>
          {challengeInfoRow}
          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
              <p>Challenge</p>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '20px 0'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #f3f3f3',
                    borderTop: '2px solid #28a745',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <span style={{ color: '#28a745', fontSize: '0.9em' }}>
                  Verifying solution...
                </span>
              </div>
            </div>
          </div>
        </>
      )
    }

    // Failed State
    if (challengeContext.status === 'failed') {
      return (
        <>
          {challengeInfoRow}
          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
              <p>Challenge Error</p>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <p style={{ color: '#dc3545', fontSize: '0.9em', margin: 0 }}>
                  {challengeContext.error || 'Challenge failed'}
                </p>
                <button
                  className="btn btnMain"
                  onClick={handleRetryChallenge}
                  style={{ fontSize: '0.9em', padding: '8px 16px' }}
                >
                  Retry Challenge
                </button>
              </div>
            </div>
          </div>
        </>
      )
    }

    // Completed State
    if (challengeContext.status === 'completed') {
      return (
        <>
          {challengeInfoRow}
          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
              <p>Challenge</p>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '20px 0'
                }}
              >
                <span style={{ color: '#28a745', fontSize: '1.2em' }}>✓</span>
                <span
                  style={{
                    color: '#28a745',
                    fontSize: '0.9em',
                    fontWeight: 'bold'
                  }}
                >
                  Challenge completed! Continuing download...
                </span>
              </div>
            </div>
          </div>
        </>
      )
    }

    return challengeInfoRow
  }

  const renderStatusContent = () => {
    switch (verificationResult.status) {
      case 'downloading':
        return (
          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
              <p>Status</p>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #f3f3f3',
                      borderTop: '2px solid #007bff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <span style={{ color: '#007bff', fontSize: '0.9em' }}>
                    Downloading from server {currentUrlIndex + 1}/
                    {allUrls.length}
                    {verificationResult.downloadProgress !== undefined
                      ? ` (${verificationResult.downloadProgress}%)`
                      : ''}
                    ...
                  </span>
                </div>
                {verificationResult.downloadProgress !== undefined && (
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#f3f3f3',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${verificationResult.downloadProgress}%`,
                        height: '100%',
                        backgroundColor: '#007bff',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease-in-out'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 'verifying':
        return (
          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
              <p>Status</p>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #f3f3f3',
                    borderTop: '2px solid #28a745',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <span style={{ color: '#28a745', fontSize: '0.9em' }}>
                  Calculating SHA-256 hash...
                </span>
              </div>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
              <p>Status</p>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span style={{ color: '#28a745', fontSize: '1.2em' }}>✓</span>
                <span
                  style={{
                    color: '#28a745',
                    fontSize: '0.9em',
                    fontWeight: 'bold'
                  }}
                >
                  {hasValidHash
                    ? 'Hash verified and file downloaded!'
                    : 'File downloaded!'}
                </span>
              </div>
            </div>
          </div>
        )

      case 'content_invalid':
        return (
          <>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                <p>Status</p>
              </div>
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ color: '#dc3545', fontSize: '1.2em' }}>✗</span>
                  <span
                    style={{
                      color: '#dc3545',
                      fontSize: '0.9em',
                      fontWeight: 'bold'
                    }}
                  >
                    Invalid file content detected!
                  </span>
                </div>
              </div>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                <p>Issue</p>
              </div>
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                <p
                  style={{
                    fontSize: '0.9em',
                    color: '#dc3545',
                    fontWeight: 'normal'
                  }}
                >
                  {verificationResult.validationResult?.reason ||
                    'Content validation failed'}
                </p>
              </div>
            </div>
            {verificationResult.validationResult?.detectedType && (
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                  <p>Detected Type</p>
                </div>
                <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                  <p
                    style={{
                      fontSize: '0.9em',
                      color: '#6c757d',
                      fontWeight: 'normal'
                    }}
                  >
                    {verificationResult.validationResult.detectedType}
                  </p>
                </div>
              </div>
            )}
            {verificationResult.validationResult?.fileSize && (
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                  <p>File Size</p>
                </div>
                <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                  <p
                    style={{
                      fontSize: '0.9em',
                      color: '#6c757d',
                      fontWeight: 'normal'
                    }}
                  >
                    {verificationResult.validationResult.fileSize} bytes
                  </p>
                </div>
              </div>
            )}
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                <p>Actions</p>
              </div>
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {allUrls.length > 1 && (
                    <button
                      className="btn btnMain"
                      onClick={handleDownloadFromAlternativeSource}
                      style={{
                        fontSize: '0.9em',
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        borderColor: '#007bff'
                      }}
                    >
                      Try Alternative Source ({currentUrlIndex + 1}/
                      {allUrls.length})
                    </button>
                  )}
                  <button
                    className="btn btnMain"
                    onClick={handleDownloadAnyway}
                    style={{
                      fontSize: '0.9em',
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      borderColor: '#dc3545'
                    }}
                  >
                    Download Anyway
                  </button>
                  <button
                    className="btn btnMain"
                    onClick={handleClose}
                    style={{
                      fontSize: '0.9em',
                      padding: '8px 16px',
                      backgroundColor: '#6c757d',
                      borderColor: '#6c757d'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        )

      case 'hash_mismatch':
        return (
          <>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                <p>Status</p>
              </div>
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ color: '#dc3545', fontSize: '1.2em' }}>✗</span>
                  <span
                    style={{
                      color: '#dc3545',
                      fontSize: '0.9em',
                      fontWeight: 'bold'
                    }}
                  >
                    Hash verification failed!
                  </span>
                </div>
              </div>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                <p>Expected Hash</p>
              </div>
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8em',
                    wordBreak: 'break-all',
                    color: '#28a745'
                  }}
                >
                  {verificationResult.expectedHash}
                </p>
              </div>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                <p>Calculated Hash</p>
              </div>
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8em',
                    wordBreak: 'break-all',
                    color: '#dc3545'
                  }}
                >
                  {verificationResult.calculatedHash}
                </p>
              </div>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                <p>Actions</p>
              </div>
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {allUrls.length > 1 && (
                    <button
                      className="btn btnMain"
                      onClick={handleDownloadFromAlternativeSource}
                      style={{
                        fontSize: '0.9em',
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        borderColor: '#007bff'
                      }}
                    >
                      Try Alternative Source ({currentUrlIndex + 1}/
                      {allUrls.length})
                    </button>
                  )}
                  <button
                    className="btn btnMain"
                    onClick={handleDownloadAnyway}
                    style={{
                      fontSize: '0.9em',
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      borderColor: '#dc3545'
                    }}
                  >
                    Download Anyway
                  </button>
                  <button
                    className="btn btnMain"
                    onClick={handleClose}
                    style={{
                      fontSize: '0.9em',
                      padding: '8px 16px',
                      backgroundColor: '#6c757d',
                      borderColor: '#6c757d'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        )

      case 'challenge_required':
        return (
          <>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                <p>Status</p>
              </div>
              <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ color: '#ffc107', fontSize: '1.2em' }}>
                    🧩
                  </span>
                  <span
                    style={{
                      color: '#ffc107',
                      fontSize: '0.9em',
                      fontWeight: 'bold'
                    }}
                  >
                    {getChallengeStatusText()}
                  </span>
                </div>
              </div>
            </div>
            {renderChallengeContent()}
          </>
        )

      case 'error':
        return (
          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
              <p>Status</p>
            </div>
            <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ color: '#dc3545', fontSize: '1.2em' }}>✗</span>
                  <span
                    style={{
                      color: '#dc3545',
                      fontSize: '0.9em',
                      fontWeight: 'bold'
                    }}
                  >
                    Verification failed
                  </span>
                </div>
                <p style={{ color: '#dc3545', fontSize: '0.9em' }}>
                  {verificationResult.error}
                </p>
                <button
                  className="btn btnMain"
                  onClick={performHashVerification}
                  style={{ fontSize: '0.9em', padding: '8px 16px' }}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      {createPortal(
        <div className="popUpMain">
          <div className="ContainerMain">
            <div className="popUpMainCardWrapper">
              <div className="popUpMainCard">
                <div className="popUpMainCardTop">
                  <div className="popUpMainCardTopInfo">
                    <h3>{title || 'Download and Hash Verification'}</h3>
                  </div>
                  <div className="popUpMainCardTopClose" onClick={handleClose}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="-96 0 512 512"
                      width="1em"
                      height="1em"
                      fill="currentColor"
                      style={{ zIndex: 1 }}
                    >
                      <path d="M310.6 361.4c12.5 12.5 12.5 32.75 0 45.25C304.4 412.9 296.2 416 288 416s-16.38-3.125-22.62-9.375L160 301.3L54.63 406.6C48.38 412.9 40.19 416 32 416S15.63 412.9 9.375 406.6c-12.5-12.5-12.5-32.75 0-45.25l105.4-105.4L9.375 150.6c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L160 210.8l105.4-105.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-105.4 105.4L310.6 361.4z"></path>
                    </svg>
                  </div>
                </div>
                {verificationResult.status === 'hash_mismatch' && (
                  <div
                    className="IBMSMSMBSSWarning"
                    style={{
                      margin: '16px',
                      marginBottom: '0',
                      maxWidth: 'calc(100% - 32px)',
                      boxSizing: 'border-box',
                      wordWrap: 'break-word'
                    }}
                  >
                    <p style={{ margin: '0', fontWeight: 'bold' }}>
                      ⚠️ Hash Verification Failed
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.9em' }}>
                      The downloaded file's hash does not match the expected
                      hash. This could indicate file corruption or tampering.
                      Proceed with caution.
                    </p>
                  </div>
                )}
                <div className="pUMCB_Zaps">
                  <div className="pUMCB_ZapsInside">
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTable">
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                          <p>Download URL</p>
                        </div>
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                          <p
                            style={{
                              wordBreak: 'break-all',
                              fontSize: '0.9em'
                            }}
                          >
                            {url}
                          </p>
                        </div>
                      </div>
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                          <p>Expected SHA-256</p>
                        </div>
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                          <p
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.8em',
                              wordBreak: 'break-all'
                            }}
                          >
                            {expectedHash || 'No hash provided'}
                          </p>
                        </div>
                      </div>
                      {allUrls.length > 1 && (
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                            <p>Available URLs</p>
                          </div>
                          <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                            <p style={{ fontSize: '0.9em' }}>
                              {allUrls.length} servers available for download
                            </p>
                          </div>
                        </div>
                      )}
                      {renderStatusContent()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <style>
            {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
          </style>
        </div>,
        document.body
      )}
    </>
  )
}
