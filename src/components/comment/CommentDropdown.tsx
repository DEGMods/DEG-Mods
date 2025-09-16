import { useState, useRef, useEffect } from 'react'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { DownloadLinksPopup } from './DownloadLinksPopup'

interface CommentDropdownProps {
  comment: NDKEvent
  userPubkey?: string
  onRequestDeletion: () => void
}

interface RTagLink {
  url: string
  title?: string
}

/**
 * Validates if a URL is properly formatted
 * Returns true for valid URLs, false otherwise (fails silently)
 */
const isValidUrl = (url: string): boolean => {
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return false
    }
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Extracts all r-tag links from a comment event
 * Format: ["r", url] or ["r", url, "type"] or ["r", url, "type", "title"]
 * Only includes valid URLs (invalid ones are silently filtered out)
 */
const extractRTagLinks = (event: NDKEvent): RTagLink[] => {
  const rTags = event.getMatchingTags('r')
  const links: RTagLink[] = []

  for (const tag of rTags) {
    if (tag.length >= 2) {
      const url = tag[1]

      // Skip if URL is empty or invalid (fail silently)
      if (!isValidUrl(url)) {
        continue
      }

      // If there's a 4th element, it's the title, otherwise use the 3rd element if it's not a type
      const title =
        tag.length >= 4
          ? tag[3]
          : tag.length === 3 && !['download', 'image', 'video'].includes(tag[2])
            ? tag[2]
            : undefined

      links.push({ url, title })
    }
  }

  return links
}

export const CommentDropdown = ({
  comment,
  userPubkey,
  onRequestDeletion
}: CommentDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showDownloadPopup, setShowDownloadPopup] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const rTagLinks = extractRTagLinks(comment)
  const isOwner = userPubkey === comment.pubkey

  // Always show dropdown if user is owner (for delete button) or if there are download links
  const shouldShowDropdown = isOwner || rTagLinks.length > 0

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Don't render if there's nothing to show
  if (!shouldShowDropdown) {
    return null
  }

  const handleDownloadLinksClick = () => {
    setShowDownloadPopup(true)
    setIsOpen(false)
  }

  const handleDeleteClick = () => {
    onRequestDeletion()
    setIsOpen(false)
  }

  const handleCloseDownloadPopup = () => {
    setShowDownloadPopup(false)
  }

  return (
    <>
      <div className="IBMSMSMBSSCL_CommentDropdownContainer">
        <button
          ref={buttonRef}
          className="IBMSMSMBSSCL_CommentDropdownButton"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Comment options"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-192 0 512 512"
            width="1em"
            height="1em"
            fill="currentColor"
            className="IBMSMSMBSSCL_CommentDropdownIcon"
          >
            <path d="M64 360C94.93 360 120 385.1 120 416C120 446.9 94.93 472 64 472C33.07 472 8 446.9 8 416C8 385.1 33.07 360 64 360zM64 200C94.93 200 120 225.1 120 256C120 286.9 94.93 312 64 312C33.07 312 8 286.9 8 256C8 225.1 33.07 200 64 200zM64 152C33.07 152 8 126.9 8 96C8 65.07 33.07 40 64 40C94.93 40 120 65.07 120 96C120 126.9 94.93 152 64 152z"></path>
          </svg>
        </button>

        {isOpen && (
          <div ref={dropdownRef} className="IBMSMSMBSSCL_CommentDropdownMenu">
            {/* Deletion section - only show for comment owner */}
            {isOwner && (
              <div className="IBMSMSMBSSCL_CommentDropdownSection">
                <button
                  className="IBMSMSMBSSCL_CommentDropdownItem IBMSMSMBSSCL_CommentDropdownItemDanger"
                  onClick={handleDeleteClick}
                >
                  Request Deletion
                </button>
              </div>
            )}

            {/* Download links section */}
            {rTagLinks.length > 0 && (
              <div className="IBMSMSMBSSCL_CommentDropdownSection">
                <button
                  className="IBMSMSMBSSCL_CommentDropdownItem"
                  onClick={handleDownloadLinksClick}
                  title={`View ${rTagLinks.length} download link${rTagLinks.length === 1 ? '' : 's'}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="IBMSMSMBSSCL_CommentDropdownItemIcon"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download links ({rTagLinks.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download Links Popup */}
      {showDownloadPopup && (
        <DownloadLinksPopup
          links={rTagLinks}
          onClose={handleCloseDownloadPopup}
        />
      )}
    </>
  )
}
