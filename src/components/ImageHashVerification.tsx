import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getFileSha256 } from '../utils/getFileSha256'
import { isValidSha256Hash } from '../utils/hashBlocking'
import { validateImageContent } from '../utils/imageValidation'
import { useBodyScrollDisable } from '../hooks'
import '../styles/popup.css'

interface ImageHashVerificationProps {
  imageUrl: string
  expectedHash: string
  allUrls: string[]
  onClose: () => void
}

type VerificationStatus =
  | 'idle'
  | 'downloading'
  | 'verifying'
  | 'success'
  | 'hash_mismatch'
  | 'content_invalid'
  | 'error'

interface VerificationResult {
  status: VerificationStatus
  calculatedHash?: string
  expectedHash?: string
  error?: string
  downloadUrl?: string
  fileSize?: number
  downloadProgress?: number
}

/**
 * Popup component for manual image hash verification
 * Triggered by clicking the verification icon on images
 */
export const ImageHashVerification: React.FC<ImageHashVerificationProps> = ({
  imageUrl,
  expectedHash,
  allUrls,
  onClose
}) => {
  useBodyScrollDisable(true)
  // Wrapper to prevent event bubbling when closing
  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
      }
      onClose()
    },
    [onClose]
  )
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult>({
      status: 'idle'
    })
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0)

  const hasValidHash = expectedHash && isValidSha256Hash(expectedHash)

  // Start verification when component mounts
  useEffect(() => {
    if (hasValidHash) {
      performVerification()
    } else {
      setVerificationResult({
        status: 'error',
        error: 'Invalid or missing hash for verification'
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const performVerification = useCallback(
    async (urlIndex: number = 0) => {
      if (!hasValidHash || urlIndex >= allUrls.length) {
        setVerificationResult({
          status: 'error',
          error: 'No more URLs to try'
        })
        return
      }

      const urlToVerify = allUrls[urlIndex]
      setCurrentUrlIndex(urlIndex)

      setVerificationResult({
        status: 'downloading',
        downloadUrl: urlToVerify,
        downloadProgress: 0
      })

      try {
        console.log(
          `[ImageVerification] Starting verification for: ${urlToVerify}`
        )
        console.log(`[ImageVerification] Expected hash: ${expectedHash}`)

        // Download the image with proper handling of blossom server responses
        let response = await fetch(urlToVerify, {
          redirect: 'follow',
          headers: {
            Accept:
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors'
          }
        })

        // Handle blossom server responses: 200, 206 (Partial Content), 302/301 (Redirects)
        const validStatuses = [200, 206]
        if (!validStatuses.includes(response.status)) {
          // Try to handle redirects or other responses
          if (response.status === 302 || response.status === 301) {
            const location = response.headers.get('location')
            if (location) {
              console.log(
                `[ImageVerification] Following redirect to: ${location}`
              )
              response = await fetch(location, {
                redirect: 'follow',
                headers: {
                  Accept:
                    'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                  'Sec-Fetch-Dest': 'image',
                  'Sec-Fetch-Mode': 'no-cors'
                }
              })
              if (!validStatuses.includes(response.status)) {
                throw new Error(
                  `HTTP error after redirect! status: ${response.status}`
                )
              }
            } else {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
          } else {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
        }

        console.log(
          `[ImageVerification] Successfully fetched image with status: ${response.status}`
        )

        const contentLength = response.headers.get('content-length')
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0

        setVerificationResult((prev) => ({
          ...prev,
          status: 'downloading',
          fileSize: totalSize
        }))

        // Read the response as array buffer with progress tracking
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('Failed to get response reader')
        }

        const chunks: Uint8Array[] = []
        let receivedLength = 0

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          chunks.push(value)
          receivedLength += value.length

          // Update progress
          if (totalSize > 0) {
            const progress = Math.round((receivedLength / totalSize) * 100)
            setVerificationResult((prev) => ({
              ...prev,
              downloadProgress: progress
            }))
          }
        }

        // Combine chunks into single array buffer
        const arrayBuffer = new Uint8Array(receivedLength)
        let position = 0
        for (const chunk of chunks) {
          arrayBuffer.set(chunk, position)
          position += chunk.length
        }

        // Convert to File object for hash calculation
        const blob = new Blob([arrayBuffer])
        const file = new File([blob], 'image', {
          type: response.headers.get('content-type') || 'image/*'
        })

        setVerificationResult((prev) => ({
          ...prev,
          status: 'verifying',
          fileSize: file.size
        }))

        // Validate image content
        try {
          const isValidImage = await validateImageContent(urlToVerify)
          if (!isValidImage) {
            setVerificationResult({
              status: 'content_invalid',
              error: 'File does not appear to be a valid image',
              downloadUrl: urlToVerify
            })
            return
          }
        } catch (validationError) {
          console.warn(
            '[ImageVerification] Content validation failed:',
            validationError
          )
          // Continue with hash verification even if content validation fails
        }

        // Calculate hash
        const calculatedHash = await getFileSha256(file)

        console.log(`[ImageVerification] Expected hash: ${expectedHash}`)
        console.log(`[ImageVerification] Calculated hash: ${calculatedHash}`)

        // Compare hashes (case-insensitive)
        const hashesMatch =
          calculatedHash.toLowerCase() === expectedHash.toLowerCase()

        if (hashesMatch) {
          console.log('[ImageVerification] ✓ Hash verification successful!')
          setVerificationResult({
            status: 'success',
            calculatedHash,
            expectedHash,
            downloadUrl: urlToVerify,
            fileSize: file.size
          })
        } else {
          console.log('[ImageVerification] ✗ Hash mismatch!')
          setVerificationResult({
            status: 'hash_mismatch',
            calculatedHash,
            expectedHash,
            downloadUrl: urlToVerify,
            fileSize: file.size
          })
        }
      } catch (error) {
        console.error(
          `[ImageVerification] Error verifying ${urlToVerify}:`,
          error
        )

        // Try next URL if available
        if (urlIndex + 1 < allUrls.length) {
          console.log(
            `[ImageVerification] Trying next URL (${urlIndex + 1}/${allUrls.length})`
          )
          performVerification(urlIndex + 1)
        } else {
          setVerificationResult({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            downloadUrl: urlToVerify
          })
        }
      }
    },
    [hasValidHash, allUrls, expectedHash]
  )

  const handleRetry = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault() // Prevent default link behavior
      e.stopPropagation() // Prevent triggering parent onClick
      e.nativeEvent.stopImmediatePropagation() // Stop all other event listeners
      performVerification(0)
    },
    [performVerification]
  )

  const handleTryNextUrl = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault() // Prevent default link behavior
      e.stopPropagation() // Prevent triggering parent onClick
      e.nativeEvent.stopImmediatePropagation() // Stop all other event listeners
      if (currentUrlIndex + 1 < allUrls.length) {
        performVerification(currentUrlIndex + 1)
      }
    },
    [currentUrlIndex, allUrls.length, performVerification]
  )

  const getStatusIcon = () => {
    const iconStyle = {
      display: 'flex',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      lineHeight: '1'
    }

    switch (verificationResult.status) {
      case 'success':
        return (
          <span
            className="verification-icon success"
            style={{ ...iconStyle, backgroundColor: '#28a745', color: 'white' }}
          >
            ✓
          </span>
        )
      case 'hash_mismatch':
      case 'content_invalid':
      case 'error':
        return (
          <span
            className="verification-icon error"
            style={{ ...iconStyle, backgroundColor: '#dc3545', color: 'white' }}
          >
            ✗
          </span>
        )
      case 'downloading':
      case 'verifying':
        return (
          <span
            className="verification-icon loading"
            style={{
              ...iconStyle,
              backgroundColor: 'transparent',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid #ffffff',
              animation: 'spin 1s linear infinite'
            }}
          ></span>
        )
      default:
        return (
          <span
            className="verification-icon idle"
            style={{ ...iconStyle, backgroundColor: '#6c757d', color: 'white' }}
          >
            ?
          </span>
        )
    }
  }

  const getStatusMessage = () => {
    switch (verificationResult.status) {
      case 'downloading':
        return `Downloading image... ${verificationResult.downloadProgress || 0}%`
      case 'verifying':
        return 'Calculating hash...'
      case 'success':
        return 'Hash verification successful!'
      case 'hash_mismatch':
        return 'Hash verification failed - file may be corrupted or modified'
      case 'content_invalid':
        return 'File does not appear to be a valid image'
      case 'error':
        return `Verification error: ${verificationResult.error}`
      default:
        return 'Ready to verify'
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return createPortal(
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div className="popUpMain">
        <div className="ContainerMain">
          <div className="popUpMainCardWrapper">
            <div className="popUpMainCard">
              <div className="popUpMainCardTop">
                <div className="popUpMainCardTopInfo">
                  <h3>Image Hash Verification</h3>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                >
                  <div className="verification-status-icon">
                    {getStatusIcon()}
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
              </div>
              <div className="pUMCB_Zaps">
                <div className="pUMCB_ZapsInside">
                  <div
                    className="verification-status"
                    style={{ marginBottom: '20px', textAlign: 'center' }}
                  >
                    <span className="status-message">{getStatusMessage()}</span>
                  </div>

                  <div className="IBMSMSMBSSDownloadsElementInsideAltTable">
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                        <p>Current URL</p>
                      </div>
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                        <p
                          style={{ wordBreak: 'break-all', fontSize: '0.9em' }}
                        >
                          {verificationResult.downloadUrl || imageUrl}
                        </p>
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
                            wordBreak: 'break-all'
                          }}
                        >
                          {expectedHash}
                        </p>
                      </div>
                    </div>

                    {verificationResult.calculatedHash && (
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
                              color:
                                verificationResult.status === 'success'
                                  ? '#28a745'
                                  : '#dc3545'
                            }}
                          >
                            {verificationResult.calculatedHash}
                          </p>
                        </div>
                      </div>
                    )}

                    {verificationResult.fileSize && (
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                          <p>File Size</p>
                        </div>
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                          <p>{formatFileSize(verificationResult.fileSize)}</p>
                        </div>
                      </div>
                    )}

                    {allUrls.length > 1 && (
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                          <p>Available URLs</p>
                        </div>
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                          <p>{allUrls.length} servers found</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {verificationResult.status === 'downloading' &&
                    verificationResult.downloadProgress !== undefined && (
                      <div
                        className="progress-bar"
                        style={{ margin: '20px 0' }}
                      >
                        <div
                          className="progress-fill"
                          style={{
                            width: `${verificationResult.downloadProgress}%`
                          }}
                        />
                      </div>
                    )}

                  <div
                    className="verification-actions"
                    style={{
                      marginTop: '20px',
                      display: 'flex',
                      gap: '10px',
                      justifyContent: 'center'
                    }}
                  >
                    {(verificationResult.status === 'error' ||
                      verificationResult.status === 'hash_mismatch') && (
                      <>
                        <button className="btn btnMain" onClick={handleRetry}>
                          Retry Verification
                        </button>
                        {currentUrlIndex + 1 < allUrls.length && (
                          <button
                            className="btn btnSecondary"
                            onClick={handleTryNextUrl}
                          >
                            Try Next Server ({currentUrlIndex + 1}/
                            {allUrls.length})
                          </button>
                        )}
                      </>
                    )}

                    <button className="btn btnSecondary" onClick={handleClose}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
