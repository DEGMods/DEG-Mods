import { useState, useRef } from 'react'
import { getFileSha256 } from '../utils/getFileSha256'
import { isValidSha256Hash } from '../utils/hashBlocking'

interface FileHashCheckerProps {
  /** The expected SHA-256 hash to compare against */
  expectedHash: string
  /** Optional title for the checker */
  title?: string
  /** Optional custom styling */
  className?: string
}

type VerificationStatus =
  | 'idle'
  | 'calculating'
  | 'match'
  | 'mismatch'
  | 'error'

interface VerificationResult {
  status: VerificationStatus
  calculatedHash?: string
  fileName?: string
  error?: string
}

/**
 * FileHashChecker - Experimental component that allows users to select a local file
 * and verify its SHA-256 hash against an expected hash value.
 */
export const FileHashChecker: React.FC<FileHashCheckerProps> = ({
  expectedHash,
  title,
  className = ''
}) => {
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult>({
      status: 'idle'
    })
  const [isExpanded, setIsExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate the expected hash
  const hasValidExpectedHash = expectedHash && isValidSha256Hash(expectedHash)

  /**
   * Handles file selection and hash calculation
   */
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setVerificationResult({
      status: 'calculating',
      fileName: file.name
    })

    try {
      // Calculate the SHA-256 hash of the selected file
      const calculatedHash = await getFileSha256(file)

      // Compare hashes (case-insensitive)
      const hashesMatch =
        calculatedHash.toLowerCase() === expectedHash.toLowerCase()

      setVerificationResult({
        status: hashesMatch ? 'match' : 'mismatch',
        calculatedHash,
        fileName: file.name
      })
    } catch (error) {
      console.error('Error calculating file hash:', error)
      setVerificationResult({
        status: 'error',
        fileName: file.name,
        error:
          error instanceof Error ? error.message : 'Failed to calculate hash'
      })
    }

    // Clear the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * Triggers the file input dialog
   */
  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }

  /**
   * Resets the verification state
   */
  const handleReset = () => {
    setVerificationResult({ status: 'idle' })
  }

  /**
   * Toggles the expanded view
   */
  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded && verificationResult.status !== 'idle') {
      handleReset()
    }
  }

  if (!hasValidExpectedHash) {
    return null
  }

  const getStatusColor = () => {
    switch (verificationResult.status) {
      case 'calculating':
        return '#007bff'
      case 'match':
        return '#28a745'
      case 'mismatch':
      case 'error':
        return '#dc3545'
      default:
        return '#6c757d'
    }
  }

  const getStatusIcon = () => {
    switch (verificationResult.status) {
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
      case 'match':
        return <span style={{ color: '#28a745', fontSize: '1.2em' }}>✓</span>
      case 'mismatch':
      case 'error':
        return <span style={{ color: '#dc3545', fontSize: '1.2em' }}>✗</span>
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (verificationResult.status) {
      case 'calculating':
        return 'Calculating hash...'
      case 'match':
        return 'Hash verified! File matches.'
      case 'mismatch':
        return 'Hash mismatch! File does not match.'
      case 'error':
        return `Error: ${verificationResult.error}`
      default:
        return 'Select a file to verify its hash'
    }
  }

  return (
    <div className={`file-hash-checker ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="*/*"
      />

      {/* Toggle button */}
      <div style={{ marginBottom: '8px' }}>
        <button
          type="button"
          onClick={handleToggleExpanded}
          style={{
            fontSize: '0.85em',
            padding: '10px 15px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'ease 0.4s',
            fontWeight: 'bold'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'
            e.currentTarget.style.transform = 'scale(1.01)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          {title || 'Verify Local File Hash'}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          style={{
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.1)',
            boxShadow: 'inset 0 0 8px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Expected hash display */}
          <div style={{ marginBottom: '12px' }}>
            <p
              style={{
                margin: '0 0 4px 0',
                fontSize: '0.9em',
                fontWeight: 'bold',
                color: 'rgba(255, 255, 255, 0.75)'
              }}
            >
              Expected SHA-256 Hash:
            </p>
            <p
              style={{
                margin: '0',
                fontFamily: 'monospace',
                fontSize: '0.8em',
                wordBreak: 'break-all',
                color: 'rgba(255, 255, 255, 0.75)',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                padding: '8px',
                borderRadius: '5px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {expectedHash}
            </p>
          </div>

          {/* File selection and status */}
          <div style={{ marginBottom: '12px' }}>
            <button
              type="button"
              onClick={handleSelectFile}
              disabled={verificationResult.status === 'calculating'}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  verificationResult.status === 'calculating'
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: '0.9em',
                opacity: verificationResult.status === 'calculating' ? 0.6 : 1,
                minWidth: '200px',
                width: '100%'
              }}
            >
              {verificationResult.status === 'calculating'
                ? 'Processing...'
                : 'Select File to Verify'}
            </button>
          </div>

          {/* Status display */}
          {verificationResult.status !== 'idle' && (
            <div
              style={{
                padding: '12px',
                borderRadius: '5px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: `1px solid ${getStatusColor()}`,
                marginBottom: '12px'
              }}
            >
              {/* Status header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}
              >
                {getStatusIcon()}
                <span
                  style={{
                    color: getStatusColor(),
                    fontWeight: 'bold',
                    fontSize: '0.9em'
                  }}
                >
                  {getStatusText()}
                </span>
              </div>

              {/* File name */}
              {verificationResult.fileName && (
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '0.85em',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}
                >
                  File: {verificationResult.fileName}
                </p>
              )}

              {/* Calculated hash (for mismatch case) */}
              {verificationResult.status === 'mismatch' &&
                verificationResult.calculatedHash && (
                  <div>
                    <p
                      style={{
                        margin: '0 0 4px 0',
                        fontSize: '0.85em',
                        fontWeight: 'bold',
                        color: 'rgba(255, 255, 255, 0.75)'
                      }}
                    >
                      Calculated Hash:
                    </p>
                    <p
                      style={{
                        margin: '0',
                        fontFamily: 'monospace',
                        fontSize: '0.75em',
                        wordBreak: 'break-all',
                        color: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        padding: '6px',
                        borderRadius: '5px'
                      }}
                    >
                      {verificationResult.calculatedHash}
                    </p>
                  </div>
                )}

              {/* Success message with calculated hash */}
              {verificationResult.status === 'match' &&
                verificationResult.calculatedHash && (
                  <div>
                    <p
                      style={{
                        margin: '0 0 4px 0',
                        fontSize: '0.85em',
                        fontWeight: 'bold',
                        color: 'rgba(255, 255, 255, 0.75)'
                      }}
                    >
                      Calculated Hash:
                    </p>
                    <p
                      style={{
                        margin: '0',
                        fontFamily: 'monospace',
                        fontSize: '0.75em',
                        wordBreak: 'break-all',
                        color: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        padding: '6px',
                        borderRadius: '5px'
                      }}
                    >
                      {verificationResult.calculatedHash}
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* Reset button */}
          {verificationResult.status !== 'idle' &&
            verificationResult.status !== 'calculating' && (
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  transition: 'ease 0.4s'
                }}
              >
                Reset
              </button>
            )}

          {/* Help text */}
          <div
            style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '5px',
              fontSize: '0.8em',
              color: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <p style={{ margin: '0' }}>
              <strong style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                How to use:
              </strong>{' '}
              Click "Select File to Verify" and choose a file from your
              computer. The tool will calculate the file's SHA-256 hash and
              compare it with the expected hash above. This helps verify that
              your local file matches the downloadable file exactly.
            </p>
          </div>
        </div>
      )}

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
