import { NDKEvent } from '@nostr-dev-kit/ndk'
import { useState } from 'react'

interface DownloadLinksProps {
  event: NDKEvent
}

interface ParsedDownloadLink {
  url: string
  title?: string
}

/**
 * Extracts download links from comment r tags
 * Expected format: ["r", url, "download"] or ["r", url, "download", title]
 */
const extractDownloadLinks = (event: NDKEvent): ParsedDownloadLink[] => {
  const downloadLinks: ParsedDownloadLink[] = []

  // Get all r tags
  const rTags = event.getMatchingTags('r')

  for (const tag of rTags) {
    // Check if this is a download link: ["r", url, "download", ...optional title]
    if (tag.length >= 3 && tag[2] === 'download') {
      const url = tag[1]
      const title = tag.length >= 4 ? tag[3] : undefined

      downloadLinks.push({ url, title })
    }
  }

  return downloadLinks
}

/**
 * Component to display download links from a comment event
 */
export const DownloadLinks = ({ event }: DownloadLinksProps) => {
  const [downloadLinks] = useState<ParsedDownloadLink[]>(() =>
    extractDownloadLinks(event)
  )

  if (downloadLinks.length === 0) {
    return null
  }

  return (
    <div
      className="comment-download-links"
      style={{
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}
    >
      <h6
        style={{
          margin: '0 0 8px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#495057'
        }}
      >
        📥 Download Links
      </h6>

      <div className="download-links-list">
        {downloadLinks.map((link, index) => (
          <div
            key={index}
            className="download-link-item"
            style={{
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="download-link"
              style={{
                color: '#007bff',
                textDecoration: 'none',
                fontSize: '14px',
                wordBreak: 'break-all',
                flex: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              {link.title || link.url}
            </a>

            {link.title && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#6c757d',
                  fontStyle: 'italic'
                }}
                title={link.url}
              >
                🔗
              </span>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: '11px',
          color: '#6c757d',
          marginTop: '8px',
          fontStyle: 'italic'
        }}
      >
        ⚠️ Always verify downloads from trusted sources
      </div>
    </div>
  )
}
