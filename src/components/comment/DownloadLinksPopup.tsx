import { createPortal } from 'react-dom'
import { useState } from 'react'
import { extractHashFromUrl } from '../../utils/hashBlocking'
import { HashVerificationPopup } from '../HashVerificationPopup'
import { useBodyScrollDisable } from '../../hooks'

interface RTagLink {
  url: string
  title?: string
}

interface DownloadLinksPopupProps {
  links: RTagLink[]
  onClose: () => void
}

/**
 * Safely gets hostname from URL, returns fallback if URL is invalid
 * Fails silently without throwing errors
 */
const safeGetHostname = (url: string): string => {
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return 'Invalid URL'
    }
    return new URL(url).hostname
  } catch {
    return 'Invalid URL'
  }
}

/**
 * Popup component to display download links from comment r-tags
 * Uses consistent styling with other popups in the application
 */
export const DownloadLinksPopup = ({
  links,
  onClose
}: DownloadLinksPopupProps) => {
  useBodyScrollDisable(true)

  const [showHashVerification, setShowHashVerification] = useState(false)
  const [selectedLink, setSelectedLink] = useState<RTagLink | null>(null)

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleAttemptDownload = (link: RTagLink) => {
    const hash = extractHashFromUrl(link.url)
    if (hash) {
      // Set the selected link and show hash verification popup
      setSelectedLink(link)
      setShowHashVerification(true)
    } else {
      // Fallback to direct download if no hash (shouldn't happen due to conditional rendering)
      const anchorElement = document.createElement('a')
      anchorElement.href = link.url
      anchorElement.download = '' // This will use the filename from the URL or default
      document.body.appendChild(anchorElement)
      anchorElement.click()
      document.body.removeChild(anchorElement)
    }
  }

  const handleCloseHashVerification = () => {
    setShowHashVerification(false)
    setSelectedLink(null)
  }

  return createPortal(
    <div className="popUpMain">
      <div className="ContainerMain">
        <div className="popUpMainCardWrapper">
          <div className="popUpMainCard popUpMainCardQR">
            <div className="popUpMainCardTop">
              <div className="popUpMainCardTopInfo">
                <h3>Download Links</h3>
              </div>
              <div className="popUpMainCardTopClose" onClick={onClose}>
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
            <div className="pUMCB_Zaps">
              <div className="pUMCB_ZapsInside">
                <div className="inputLabelWrapperMain">
                  <label
                    className="form-label labelMain"
                    style={{ fontWeight: 'bold', marginBottom: '15px' }}
                  >
                    Available download links from this comment:
                  </label>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {links.map((link, index) => (
                      <div
                        key={`download-link-${index}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          gap: '12px'
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center'
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ color: '#007bff', flexShrink: 0 }}
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7,10 12,15 17,10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          <div
                            style={{
                              flex: '1 1 0%',
                              minWidth: '0px'
                            }}
                          >
                            <div
                              style={{
                                fontWeight: '500',
                                marginBottom: '4px',
                                wordBreak: 'break-word'
                              }}
                            >
                              {link.title || safeGetHostname(link.url)}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                opacity: 0.7,
                                wordBreak: 'break-all'
                              }}
                            >
                              {link.url}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '10px'
                          }}
                        >
                          {extractHashFromUrl(link.url) && (
                            <button
                              className="btn btnMain"
                              style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                flexShrink: 0
                              }}
                              onClick={() => handleAttemptDownload(link)}
                            >
                              Attempt download
                            </button>
                          )}
                          <button
                            className="btn btnMain"
                            style={{
                              padding: '8px 16px',
                              fontSize: '14px',
                              flexShrink: 0,
                              flexGrow: 1
                            }}
                            onClick={() => handleLinkClick(link.url)}
                          >
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: '15px',
                      padding: '10px',
                      border: '1px solid rgba(255, 193, 7, 0.3)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      opacity: 0.8
                    }}
                  >
                    ⚠️ Always verify downloads from trusted sources and scan
                    files for security before opening.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hash Verification Popup */}
      {showHashVerification && selectedLink && (
        <HashVerificationPopup
          title={selectedLink.title || safeGetHostname(selectedLink.url)}
          url={selectedLink.url}
          hash={extractHashFromUrl(selectedLink.url) || ''}
          allUrls={[selectedLink.url]}
          handleClose={handleCloseHashVerification}
          malwareScanLink={selectedLink.url}
          modVersion={selectedLink.url}
          customNote={selectedLink.url}
        />
      )}
    </div>,
    document.body
  )
}
