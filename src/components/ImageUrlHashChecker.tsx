import { useState } from 'react'

interface ImageUrlHashCheckerProps {
  /** Optional title for the checker */
  title?: string
  /** Optional custom styling */
  className?: string
}

type DownloadStatus =
  | 'idle'
  | 'downloading'
  | 'calculating'
  | 'success'
  | 'error'

interface HashResult {
  status: DownloadStatus
  hash?: string
  imageUrl?: string
  fileName?: string
  fileSize?: number
  error?: string
}

/**
 * Calculates SHA-256 hash from an ArrayBuffer
 */
async function calculateSha256(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Downloads an image from URL and returns its ArrayBuffer
 */
async function downloadImage(url: string): Promise<{
  arrayBuffer: ArrayBuffer
  fileName: string
  fileSize: number
}> {
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors'
  })

  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`
    )
  }

  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.startsWith('image/')) {
    throw new Error('URL does not point to an image file')
  }

  const arrayBuffer = await response.arrayBuffer()

  // Extract filename from URL or use a default
  const urlParts = url.split('/')
  const fileName = urlParts[urlParts.length - 1] || 'downloaded-image'

  return {
    arrayBuffer,
    fileName,
    fileSize: arrayBuffer.byteLength
  }
}

/**
 * ImageUrlHashChecker - Component that downloads an image from a URL
 * and calculates its SHA-256 hash
 */
export const ImageUrlHashChecker: React.FC<ImageUrlHashCheckerProps> = ({
  title = 'Image URL Hash Checker',
  className = ''
}) => {
  const [imageUrl, setImageUrl] = useState('')
  const [result, setResult] = useState<HashResult>({ status: 'idle' })

  /**
   * Handles the download and hash calculation process
   */
  const handleCalculateHash = async () => {
    if (!imageUrl.trim()) {
      setResult({
        status: 'error',
        error: 'Please enter a valid image URL'
      })
      return
    }

    // Basic URL validation
    try {
      new URL(imageUrl)
    } catch {
      setResult({
        status: 'error',
        error: 'Please enter a valid URL'
      })
      return
    }

    setResult({ status: 'downloading', imageUrl })

    try {
      // Download the image
      const { arrayBuffer, fileName, fileSize } = await downloadImage(imageUrl)

      setResult({
        status: 'calculating',
        imageUrl,
        fileName,
        fileSize
      })

      // Calculate hash
      const hash = await calculateSha256(arrayBuffer)

      setResult({
        status: 'success',
        hash,
        imageUrl,
        fileName,
        fileSize
      })
    } catch (error) {
      console.error('Error processing image:', error)
      setResult({
        status: 'error',
        imageUrl,
        error:
          error instanceof Error ? error.message : 'Failed to process image'
      })
    }
  }

  /**
   * Resets the component state
   */
  const handleReset = () => {
    setImageUrl('')
    setResult({ status: 'idle' })
  }

  /**
   * Handles Enter key press in input field
   */
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && result.status === 'idle') {
      handleCalculateHash()
    }
  }

  const getStatusColor = () => {
    switch (result.status) {
      case 'downloading':
      case 'calculating':
        return '#007bff'
      case 'success':
        return '#28a745'
      case 'error':
        return '#dc3545'
      default:
        return '#6c757d'
    }
  }

  const getStatusIcon = () => {
    switch (result.status) {
      case 'downloading':
      case 'calculating':
        return (
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
        )
      case 'success':
        return <span style={{ color: '#28a745', fontSize: '1.2em' }}>✓</span>
      case 'error':
        return <span style={{ color: '#dc3545', fontSize: '1.2em' }}>✗</span>
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (result.status) {
      case 'downloading':
        return 'Downloading image...'
      case 'calculating':
        return 'Calculating hash...'
      case 'success':
        return 'Hash calculated successfully!'
      case 'error':
        return `Error: ${result.error}`
      default:
        return 'Enter an image URL to calculate its hash'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`image-url-hash-checker ${className}`}>
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Title */}
        <h2
          style={{
            margin: '0 0 20px 0',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.5em',
            textAlign: 'center'
          }}
        >
          {title}
        </h2>

        {/* URL Input */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="image-url-input"
            style={{
              display: 'block',
              marginBottom: '8px',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.9em',
              fontWeight: 'bold'
            }}
          >
            Image URL:
          </label>
          <input
            id="image-url-input"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://example.com/image.jpg"
            disabled={
              result.status === 'downloading' || result.status === 'calculating'
            }
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.9em',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.9)',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#007bff'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }}
          />
        </div>

        {/* Action Button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={
              result.status === 'idle' ? handleCalculateHash : handleReset
            }
            disabled={
              result.status === 'downloading' || result.status === 'calculating'
            }
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: result.status === 'idle' ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor:
                result.status === 'downloading' ||
                result.status === 'calculating'
                  ? 'not-allowed'
                  : 'pointer',
              fontSize: '0.9em',
              fontWeight: 'bold',
              opacity:
                result.status === 'downloading' ||
                result.status === 'calculating'
                  ? 0.6
                  : 1,
              transition: 'background-color 0.3s ease'
            }}
          >
            {result.status === 'idle'
              ? 'Calculate Hash'
              : result.status === 'downloading' ||
                  result.status === 'calculating'
                ? 'Processing...'
                : 'Reset'}
          </button>
        </div>

        {/* Status Display */}
        {result.status !== 'idle' && (
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: `1px solid ${getStatusColor()}`,
              marginBottom: '16px'
            }}
          >
            {/* Status header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px'
              }}
            >
              {getStatusIcon()}
              <span
                style={{
                  color: getStatusColor(),
                  fontWeight: 'bold',
                  fontSize: '1em'
                }}
              >
                {getStatusText()}
              </span>
            </div>

            {/* Image URL */}
            {result.imageUrl && (
              <div style={{ marginBottom: '12px' }}>
                <p
                  style={{
                    margin: '0 0 4px 0',
                    fontSize: '0.85em',
                    fontWeight: 'bold',
                    color: 'rgba(255, 255, 255, 0.75)'
                  }}
                >
                  Image URL:
                </p>
                <p
                  style={{
                    margin: '0',
                    fontSize: '0.8em',
                    wordBreak: 'break-all',
                    color: 'rgba(255, 255, 255, 0.6)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {result.imageUrl}
                </p>
              </div>
            )}

            {/* File details */}
            {(result.fileName || result.fileSize) && (
              <div style={{ marginBottom: '12px' }}>
                {result.fileName && (
                  <p
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '0.85em',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}
                  >
                    <strong>File:</strong> {result.fileName}
                  </p>
                )}
                {result.fileSize && (
                  <p
                    style={{
                      margin: '0',
                      fontSize: '0.85em',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}
                  >
                    <strong>Size:</strong> {formatFileSize(result.fileSize)}
                  </p>
                )}
              </div>
            )}

            {/* Hash result */}
            {result.status === 'success' && result.hash && (
              <div>
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '0.9em',
                    fontWeight: 'bold',
                    color: 'rgba(255, 255, 255, 0.75)'
                  }}
                >
                  SHA-256 Hash:
                </p>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8em',
                    wordBreak: 'break-all',
                    color: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(40, 167, 69, 0.3)',
                    position: 'relative'
                  }}
                >
                  {result.hash}
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(result.hash || '')
                    }
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px 8px',
                      fontSize: '0.7em',
                      backgroundColor: 'rgba(40, 167, 69, 0.2)',
                      border: '1px solid rgba(40, 167, 69, 0.4)',
                      borderRadius: '4px',
                      color: '#28a745',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'rgba(40, 167, 69, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'rgba(40, 167, 69, 0.2)'
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help text */}
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '6px',
            fontSize: '0.8em',
            color: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <p style={{ margin: '0' }}>
            <strong style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
              How to use:
            </strong>{' '}
            Enter the URL of an image file and click "Calculate Hash". The tool
            will download the image and calculate its SHA-256 hash. This is
            useful for verifying file integrity or generating hashes for content
            verification.
          </p>
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}
