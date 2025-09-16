import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { DownloadUrl } from '../types'
import { Blossom, useBlossomList } from '../hooks/useBlossomList'
import { useAppSelector } from '../hooks/redux'
import {
  mirrorToBlossomServer,
  isValidBlossomServerUrl
} from '../utils/mirrorToBlossom'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { FileHashChecker } from './FileHashChecker'
import { useBodyScrollDisable } from '../hooks'

export const DownloadDetailsPopup = ({
  title,
  url,
  hash,
  malwareScanLink,
  modVersion,
  customNote,
  mediaUrl,
  automaticHash,
  automaticScanLink,
  allUrls,
  hostMirrors,
  defaultHostMirrors,
  handleClose
}: DownloadUrl & {
  allUrls?: string[]
  hostMirrors?: Blossom[]
  defaultHostMirrors?: Blossom[]
  handleClose: () => void
}) => {
  useBodyScrollDisable(true)
  const [scanLinkStatus, setScanLinkStatus] = useState<
    'loading' | 'available' | 'unavailable' | 'error'
  >('loading')
  const [hostName, setHostName] = useState<string>('')
  const [mirrorStatus, setMirrorStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [mirrorError, setMirrorError] = useState<string>('')
  const [serverWasAdded, setServerWasAdded] = useState<boolean>(false)

  // Get user authentication state
  const userState = useAppSelector((state) => state.user)
  const isAuthenticated = userState.auth && userState.user?.pubkey

  // Blossom list management
  const { hostMirrors: userBlossomList, setHostMirrors: setUserBlossomList } =
    useBlossomList()

  // Blossom server URL input state
  const [blossomServerUrl, setBlossomServerUrl] = useLocalStorage<string>(
    'preferred-blossom-server',
    'https://bs.degmods.com'
  )
  const [urlError, setUrlError] = useState<string>('')

  useEffect(() => {
    const checkScanLinkAvailability = async () => {
      if (!automaticScanLink) {
        setScanLinkStatus('unavailable')
        return
      }

      try {
        const url = new URL(automaticScanLink)
        setHostName(url.hostname)

        // Try to fetch the URL with a regular GET request first
        // This will work for same-origin requests and some CORS-enabled servers
        try {
          const response = await fetch(automaticScanLink, {
            method: 'GET'
            // Don't set mode: 'no-cors' initially to get proper status
          })

          if (response.ok) {
            setScanLinkStatus('available')
            return
          } else if (response.status === 404) {
            setScanLinkStatus('unavailable')
            return
          }
        } catch (corsError) {
          // If CORS fails, try with no-cors mode as fallback
          console.log('CORS check failed, trying no-cors fallback:', corsError)
        }

        // Fallback: Try with no-cors mode
        // Since we can't read the status, we'll use a different approach
        // Create an image element to test if the URL loads
        const testImage = new Image()

        testImage.onload = () => {
          setScanLinkStatus('available')
        }

        testImage.onerror = () => {
          // If image fails, try a script tag as another fallback
          const testScript = document.createElement('script')

          testScript.onload = () => {
            setScanLinkStatus('available')
            document.head.removeChild(testScript)
          }

          testScript.onerror = () => {
            setScanLinkStatus('unavailable')
            document.head.removeChild(testScript)
          }

          testScript.src = automaticScanLink
          document.head.appendChild(testScript)
        }

        // Add a timestamp to prevent caching
        testImage.src = `${automaticScanLink}?t=${Date.now()}`

        // Set a timeout to avoid hanging
        setTimeout(() => {
          if (scanLinkStatus === 'loading') {
            setScanLinkStatus('unavailable')
          }
        }, 5000) // 5 second timeout
      } catch (error) {
        console.warn('Scan link check failed:', error)
        setScanLinkStatus('unavailable')
      }
    }

    checkScanLinkAvailability()
  }, [automaticScanLink, setScanLinkStatus, scanLinkStatus])

  /**
   * Validate the blossom server URL
   */
  const validateBlossomUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('Blossom server URL is required')
      return false
    }

    if (!isValidBlossomServerUrl(url)) {
      setUrlError('Please enter a valid HTTP/HTTPS URL')
      return false
    }

    setUrlError('')
    return true
  }

  /**
   * Handle blossom server URL input change
   */
  const handleBlossomUrlChange = (value: string) => {
    setBlossomServerUrl(value)
    if (urlError) {
      // Clear error when user starts typing
      setUrlError('')
    }
  }

  /**
   * Add blossom server to user's blossom list if it's not already there
   */
  const addServerToBlossomList = (serverUrl: string) => {
    // Normalize the URL to ensure consistency
    const normalizedUrl = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`

    // Check if the server already exists in the user's list
    const serverExists = userBlossomList.mirrors.some(
      (mirror: Blossom) => mirror.url === normalizedUrl
    )

    if (!serverExists) {
      // Create a new blossom server entry
      const newBlossom: Blossom = {
        id: normalizedUrl,
        url: normalizedUrl,
        isActive: true
      }

      // Add to the user's blossom list
      const updatedMirrors = [...userBlossomList.mirrors, newBlossom]
      setUserBlossomList(userBlossomList.mainHost, updatedMirrors)

      return true // Server was added
    }

    return false // Server already existed
  }

  /**
   * Handle mirroring the file to the specified blossom server
   */
  const handleMirror = async () => {
    if (!hash || !url) {
      setMirrorError('Missing hash or URL for mirroring')
      setMirrorStatus('error')
      return
    }

    // Validate the blossom server URL
    if (!validateBlossomUrl(blossomServerUrl)) {
      return
    }

    setMirrorStatus('loading')
    setMirrorError('')
    setServerWasAdded(false)

    try {
      const result = await mirrorToBlossomServer(hash, url, blossomServerUrl)

      if (result === 'success') {
        setMirrorStatus('success')

        // Add the blossom server to the user's list on successful mirror
        const wasAdded = addServerToBlossomList(blossomServerUrl)
        setServerWasAdded(wasAdded)
      } else {
        setMirrorStatus('error')
        setMirrorError('Failed to mirror file to blossom server')
      }
    } catch (error) {
      setMirrorStatus('error')
      setMirrorError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      )
    }
  }

  const renderScanLinkContent = () => {
    switch (scanLinkStatus) {
      case 'loading':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <span style={{ color: '#666', fontSize: '0.9em' }}>
              Checking scan availability...
            </span>
          </div>
        )
      case 'available':
        return (
          <a
            href={automaticScanLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#007bff',
              textDecoration: 'underline',
              wordBreak: 'break-all'
            }}
          >
            {automaticScanLink}
          </a>
        )
      case 'unavailable':
        return (
          <span style={{ color: '#dc3545', fontSize: '0.9em' }}>
            Not supported by {hostName}
          </span>
        )
      case 'error':
        return (
          <span style={{ color: '#dc3545', fontSize: '0.9em' }}>
            Error checking scan availability
          </span>
        )
      default:
        return null
    }
  }

  return createPortal(
    <div
      className="popUpMain"
      style={{
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: '20px',
        paddingBottom: '20px'
      }}
    >
      <div className="ContainerMain">
        <div className="popUpMainCardWrapper">
          <div
            className="popUpMainCard"
            style={{
              display: 'flex',
              flexDirection: 'column',
              margin: '0',
              maxHeight: 'calc(100vh - 40px)',
              minHeight: 'auto'
            }}
          >
            <div className="popUpMainCardTop">
              <div className="popUpMainCardTopInfo">
                <h3>{title || 'Authentication Details'}</h3>
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
            <div
              className="pUMCB_Zaps"
              style={{
                flex: 1,
                overflowY: 'auto',
                minHeight: 0
              }}
            >
              <div className="pUMCB_ZapsInside">
                <div className="IBMSMSMBSSDownloadsElementInsideAltTable">
                  <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                      <p>Download URL</p>
                    </div>
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                      <p>{url}</p>
                    </div>
                  </div>
                  <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                      <p>SHA-256 hash</p>
                    </div>
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                      <p>{hash}</p>
                    </div>
                  </div>
                  <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                      <p>Scan</p>
                    </div>
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                      {malwareScanLink ? (
                        <a
                          href={malwareScanLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#007bff',
                            textDecoration: 'underline',
                            wordBreak: 'break-all'
                          }}
                        >
                          {malwareScanLink}
                        </a>
                      ) : (
                        <p>No scan link provided</p>
                      )}
                    </div>
                  </div>
                  {automaticHash && (
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                        <p>
                          <span style={{ color: 'white', fontWeight: 'bold' }}>
                            Automatic SHA-256 hash
                          </span>
                        </p>
                      </div>
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                        <p
                          style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
                        >
                          {automaticHash}
                        </p>
                      </div>
                    </div>
                  )}
                  {automaticScanLink && (
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                        <p>
                          <span style={{ color: 'white', fontWeight: 'bold' }}>
                            Automatic Scan
                          </span>
                        </p>
                      </div>
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                        {renderScanLinkContent()}
                      </div>
                    </div>
                  )}
                  <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                      <p>Mod Version</p>
                    </div>
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                      <p>{modVersion}</p>
                    </div>
                  </div>
                  <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                      <p>Note</p>
                    </div>
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                      <p>{customNote}</p>
                    </div>
                  </div>
                  {typeof mediaUrl !== 'undefined' && mediaUrl !== '' && (
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                        <p>Media</p>
                      </div>
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                        <img
                          src={mediaUrl}
                          className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol_Img"
                          alt=""
                        />
                      </div>
                    </div>
                  )}
                  {hash &&
                    (hostMirrors?.length || defaultHostMirrors?.length) && (
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                          <p>
                            <span
                              style={{ color: 'white', fontWeight: 'bold' }}
                            >
                              Blossom Server Downloads
                            </span>
                          </p>
                        </div>
                        <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            {allUrls?.map((url, index) => (
                              <div
                                key={index}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                              >
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: '#007bff',
                                    textDecoration: 'underline',
                                    fontSize: '0.85em',
                                    wordBreak: 'break-all',
                                    flex: 1
                                  }}
                                >
                                  {url}
                                </a>
                              </div>
                            ))}
                            {allUrls?.length === 0 && (
                              <span
                                style={{ color: '#dc3545', fontSize: '0.9em' }}
                              >
                                No working download URLs found
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  {/* Mirror/Backup Row for Authenticated Users */}
                  {isAuthenticated && hash && url && (
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                        <p>
                          <span style={{ color: 'white', fontWeight: 'bold' }}>
                            Mirror to Blossom
                          </span>
                        </p>
                      </div>
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                        <div style={{ marginBottom: '12px' }}>
                          <label
                            style={{
                              display: 'block',
                              marginBottom: '6px',
                              fontSize: '0.9em',
                              fontWeight: '500',
                              color: '#333'
                            }}
                          >
                            Blossom Server URL:
                          </label>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            {/* Input field with integrated dropdown for blossom server selection */}
                            <div style={{ position: 'relative', flex: 1 }}>
                              <input
                                type="url"
                                value={blossomServerUrl}
                                onChange={(e) =>
                                  handleBlossomUrlChange(e.target.value)
                                }
                                placeholder="https://your-blossom-server.com"
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  paddingRight:
                                    userBlossomList.mirrors.length > 0
                                      ? '40px'
                                      : '12px',
                                  border: `1px solid ${urlError ? '#dc3545' : '#ddd'}`,
                                  borderRadius: '4px',
                                  fontSize: '0.9em',
                                  backgroundColor: '#fff',
                                  color: '#333'
                                }}
                              />
                              {/* Dropdown to select from user's blossom server list */}
                              {userBlossomList.mirrors.length > 0 && (
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleBlossomUrlChange(e.target.value)
                                    }
                                  }}
                                  style={{
                                    position: 'absolute',
                                    right: '1px',
                                    top: '1px',
                                    bottom: '1px',
                                    width: '50px',
                                    border: 'none',
                                    borderRadius: '0 3px 3px 0',
                                    backgroundColor: '#f8f9fa',
                                    cursor: 'pointer',
                                    fontSize: '0.9em',
                                    color: '#007bff',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23007bff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '16px'
                                  }}
                                  title="Select from your blossom servers"
                                >
                                  <option value="">⚡</option>
                                  {userBlossomList.mirrors
                                    .filter((mirror) => mirror.isActive)
                                    .map((mirror) => (
                                      <option
                                        key={mirror.id}
                                        value={mirror.url}
                                      >
                                        {new URL(mirror.url).hostname}
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                            <button
                              onClick={handleMirror}
                              disabled={mirrorStatus === 'loading'}
                              style={{
                                padding: '8px 16px',
                                backgroundColor:
                                  mirrorStatus === 'success'
                                    ? '#28a745'
                                    : mirrorStatus === 'error'
                                      ? '#dc3545'
                                      : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor:
                                  mirrorStatus === 'loading'
                                    ? 'not-allowed'
                                    : 'pointer',
                                fontSize: '0.9em',
                                fontWeight: '500',
                                opacity: mirrorStatus === 'loading' ? 0.7 : 1,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {mirrorStatus === 'loading' && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '12px',
                                    height: '12px',
                                    border: '2px solid transparent',
                                    borderTop: '2px solid white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    marginRight: '6px'
                                  }}
                                />
                              )}
                              {mirrorStatus === 'loading'
                                ? 'Mirroring...'
                                : mirrorStatus === 'success'
                                  ? '✓ Mirrored'
                                  : mirrorStatus === 'error'
                                    ? '✗ Failed'
                                    : 'Mirror File'}
                            </button>
                          </div>
                          {urlError && (
                            <div
                              style={{
                                color: '#dc3545',
                                fontSize: '0.8em',
                                marginTop: '4px'
                              }}
                            >
                              {urlError}
                            </div>
                          )}
                        </div>
                        {(mirrorStatus === 'success' ||
                          (mirrorStatus === 'error' && mirrorError)) && (
                          <div style={{ marginBottom: '8px' }}>
                            {mirrorStatus === 'success' && (
                              <div
                                style={{ color: '#28a745', fontSize: '0.9em' }}
                              >
                                <div>
                                  File successfully mirrored to{' '}
                                  {new URL(blossomServerUrl).hostname}
                                </div>
                                {serverWasAdded && (
                                  <div
                                    style={{
                                      fontSize: '0.85em',
                                      marginTop: '4px'
                                    }}
                                  >
                                    ✓ Server added to your blossom server list
                                  </div>
                                )}
                              </div>
                            )}
                            {mirrorStatus === 'error' && mirrorError && (
                              <span
                                style={{ color: '#dc3545', fontSize: '0.9em' }}
                              >
                                {mirrorError}
                              </span>
                            )}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: '8px',
                            fontSize: '0.85em',
                            color: '#666'
                          }}
                        >
                          Mirror this file to your specified blossom server for
                          backup
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Manual File Hash Checker Row */}
                  {(hash || automaticHash) && (
                    <div className="IBMSMSMBSSDownloadsElementInsideAltTableRow">
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol IBMSMSMBSSDownloadsElementInsideAltTableRowColFirst">
                        <p>
                          <span style={{ color: 'white', fontWeight: 'bold' }}>
                            Manual Hash Verification
                          </span>
                        </p>
                      </div>
                      <div className="IBMSMSMBSSDownloadsElementInsideAltTableRowCol">
                        <FileHashChecker
                          expectedHash={hash || automaticHash || ''}
                          title={`Verify ${title || 'File'} Hash`}
                          className="IBMSMSMBSSDownloadsElementHashChecker"
                        />
                      </div>
                    </div>
                  )}
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
  )
}
