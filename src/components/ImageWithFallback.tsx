import React, { useState, useCallback, useEffect } from 'react'
import { useImageFallback } from '../hooks/useImageFallback'
import { useBlossomList } from '../hooks/useBlossomList'
import { Blossom } from '../hooks/useBlossomList'
import { ImageHashVerification } from '../components/ImageHashVerification'
import '../styles/imageWithFallback.css'

interface ImageWithFallbackProps {
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void
  // Blossom server context (optional - will use defaults if not provided)
  personalBlossomList?: Blossom[]
  defaultBlossomList?: Blossom[]
  commenterBlossomList?: Blossom[]
  // Control features
  showVerificationIcon?: boolean
  enableFallback?: boolean
  prioritizeOriginal?: boolean // If true, prioritizes the original URL even if hash doesn't match (for mod posts)
}

/**
 * Image component with automatic fallback to alternative blossom servers
 * and optional hash verification popup
 */
export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = '',
  className = '',
  style,
  onClick,
  onError,
  personalBlossomList,
  defaultBlossomList,
  commenterBlossomList,
  showVerificationIcon = true,
  enableFallback = true,
  prioritizeOriginal = false
}) => {
  const [showVerification, setShowVerification] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [actualImageUrl, setActualImageUrl] = useState(src)

  // Get blossom lists from hook if not provided
  const { hostMirrors, defaultHostMirrors } = useBlossomList()
  const finalPersonalList = personalBlossomList || hostMirrors.mirrors
  const finalDefaultList = defaultBlossomList || defaultHostMirrors

  const {
    currentUrl,
    isSearching,
    hasAlternatives,
    error,
    allUrls,
    hash,
    retryWithFallback,
    isBlobUrl,
    loadImageWithBlobSupport
  } = useImageFallback({
    originalUrl: src,
    personalBlossomList: finalPersonalList,
    defaultBlossomList: finalDefaultList,
    commenterBlossomList,
    enabled: enableFallback,
    prioritizeOriginal
  })

  const handleImageError = useCallback(
    async (e: React.SyntheticEvent<HTMLImageElement>) => {
      console.log(`[ImageWithFallback] Image error for URL: ${currentUrl}`)

      // If this is already a blob URL, don't try to convert again
      if (currentUrl.startsWith('blob:')) {
        console.log(`[ImageWithFallback] Blob URL failed, trying alternatives`)
        setImageError(true)

        // Try next URL if available
        if (hasAlternatives && allUrls.length > 1) {
          const currentIndex = allUrls.indexOf(currentUrl)
          const nextIndex = currentIndex + 1
          if (nextIndex < allUrls.length) {
            const nextUrl = allUrls[nextIndex]
            try {
              const blobUrl = await loadImageWithBlobSupport(nextUrl)
              e.currentTarget.src = blobUrl
              console.log(
                `[ImageWithFallback] Trying fallback with blob conversion: ${nextUrl}`
              )
              return
            } catch (blobError) {
              console.log(
                `[ImageWithFallback] Blob conversion failed for ${nextUrl}:`,
                blobError
              )
            }
          }
        }

        if (onError) {
          onError(e)
        }
        return
      }

      // For regular URLs, try to convert to blob URL first
      try {
        console.log(
          `[ImageWithFallback] Attempting blob conversion for: ${currentUrl}`
        )
        const blobUrl = await loadImageWithBlobSupport(currentUrl)
        e.currentTarget.src = blobUrl
        console.log(
          `[ImageWithFallback] Successfully converted to blob URL: ${blobUrl}`
        )
        setImageError(false) // Reset error state on success
        return // Success! Don't treat as error
      } catch (blobError) {
        console.log(`[ImageWithFallback] Blob conversion failed:`, blobError)
      }

      setImageError(true)

      // Call the provided onError handler
      if (onError) {
        onError(e)
      }

      // If we have alternatives, try the next URL with blob conversion
      if (hasAlternatives && allUrls.length > 1) {
        const currentIndex = allUrls.indexOf(currentUrl)
        const nextIndex = currentIndex + 1
        if (nextIndex < allUrls.length) {
          const nextUrl = allUrls[nextIndex]
          try {
            const blobUrl = await loadImageWithBlobSupport(nextUrl)
            e.currentTarget.src = blobUrl
            console.log(
              `[ImageWithFallback] Trying fallback with blob conversion: ${nextUrl}`
            )
          } catch (fallbackError) {
            console.log(
              `[ImageWithFallback] Fallback blob conversion failed:`,
              fallbackError
            )
            // Fall back to direct URL
            e.currentTarget.src = nextUrl
            console.log(
              `[ImageWithFallback] Trying direct fallback URL: ${nextUrl}`
            )
          }
        }
      }
    },
    [onError, hasAlternatives, allUrls, currentUrl, loadImageWithBlobSupport]
  )

  const handleVerificationClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault() // Prevent default link behavior
    e.stopPropagation() // Prevent triggering parent onClick
    e.nativeEvent.stopImmediatePropagation() // Stop all other event listeners
    setShowVerification(true)
  }, [])

  const handleVerificationClose = useCallback(() => {
    setShowVerification(false)
  }, [])

  const handleRetryClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault() // Prevent default link behavior
      e.stopPropagation() // Prevent triggering parent onClick
      e.nativeEvent.stopImmediatePropagation() // Stop all other event listeners
      retryWithFallback()
    },
    [retryWithFallback]
  )

  // Proactively convert images to blob URLs if they might have blossom server issues
  useEffect(() => {
    const convertToBlob = async () => {
      if (!currentUrl.startsWith('blob:') && hash && !imageError) {
        try {
          const blobUrl = await loadImageWithBlobSupport(currentUrl)
          if (blobUrl !== currentUrl) {
            setActualImageUrl(blobUrl)
            console.log(
              `[ImageWithFallback] Proactively converted to blob URL: ${blobUrl}`
            )
          }
        } catch (error) {
          // If proactive conversion fails, that's okay - we'll handle it in onError
          console.log(
            `[ImageWithFallback] Proactive blob conversion failed, will handle in onError:`,
            error
          )
        }
      }
    }

    // Small delay to avoid immediate conversion on mount
    const timer = setTimeout(convertToBlob, 100)
    return () => clearTimeout(timer)
  }, [currentUrl, hash, imageError, loadImageWithBlobSupport])

  const shouldShowIcon = showVerificationIcon && hash && !isSearching

  return (
    <div className="image-with-fallback-container">
      <img
        src={actualImageUrl}
        alt={alt}
        className={`image-with-fallback ${className}`}
        style={style}
        onClick={onClick}
        onError={handleImageError}
      />

      {/* Show blob indicator */}
      {isBlobUrl && actualImageUrl.startsWith('blob:') && (
        <div
          className="image-blob-indicator"
          title="Loaded via blob conversion"
        >
          <span>B</span>
        </div>
      )}

      {/* Loading indicator */}
      {isSearching && (
        <div className="image-fallback-loading">
          <div className="image-fallback-spinner" />
        </div>
      )}

      {/* Success indicator for alternative server */}
      {hasAlternatives && currentUrl !== src && !imageError && (
        <div className="image-fallback-success">
          <span title="Loaded from mirror server">✓</span>
        </div>
      )}

      {/* Verification icon */}
      {shouldShowIcon && (
        <div
          className="image-verification-icon"
          onClick={handleVerificationClick}
          title="Verify image hash"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            <path
              d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"
              fill="white"
            />
          </svg>
        </div>
      )}

      {/* Error retry button */}
      {error && !isSearching && (
        <div className="image-fallback-error">
          <button
            className="image-retry-button"
            onClick={handleRetryClick}
            title="Retry with alternative servers"
          >
            ↻
          </button>
        </div>
      )}

      {/* Hash verification popup */}
      {showVerification && hash && (
        <ImageHashVerification
          imageUrl={currentUrl}
          expectedHash={hash}
          allUrls={allUrls}
          onClose={handleVerificationClose}
        />
      )}
    </div>
  )
}
