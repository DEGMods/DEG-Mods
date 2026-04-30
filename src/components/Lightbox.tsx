import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ImageWithFallback } from './ImageWithFallback'
import '../styles/lightbox.css'

interface LightboxSource {
  url: string
  type: 'image' | 'video' | 'youtube'
}

interface LightboxProps {
  /** Toggle this value to open/close the lightbox */
  toggler: boolean
  /** Array of source URLs (strings) or source objects with type */
  sources: (string | LightboxSource)[]
  /** 1-indexed slide to open on */
  slide?: number
  /** Optional types array (for backward compat with FsLightbox API) */
  types?: ('image' | 'video' | 'youtube')[]
}

/**
 * Custom lightbox/gallery component that replaces FsLightbox.
 * Uses ImageWithFallback for images, providing the full blossom
 * mirror fallback chain in the gallery view.
 */
export const Lightbox: React.FC<LightboxProps> = ({
  toggler,
  sources,
  slide = 1,
  types
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Normalize sources to LightboxSource objects
  const normalizedSources: LightboxSource[] = sources.map((s, i) => {
    if (typeof s === 'string') {
      const type = types?.[i] || 'image'
      return { url: s, type }
    }
    return s
  })

  // Skip the initial render — only open when toggler actually changes
  const isFirstRender = React.useRef(true)

  // Toggle open/close when toggler changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (sources.length === 0) return
    setIsOpen(true)
    setCurrentIndex(Math.max(0, Math.min(slide - 1, sources.length - 1)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggler])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex((prev) =>
      prev < normalizedSources.length - 1 ? prev + 1 : 0
    )
  }, [normalizedSources.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) =>
      prev > 0 ? prev - 1 : normalizedSources.length - 1
    )
  }, [normalizedSources.length])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          close()
          break
        case 'ArrowRight':
          goNext()
          break
        case 'ArrowLeft':
          goPrev()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, close, goNext, goPrev])

  if (!isOpen || normalizedSources.length === 0) return null

  const current = normalizedSources[currentIndex]
  const hasMultiple = normalizedSources.length > 1

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not the content
    if (e.target === e.currentTarget) {
      close()
    }
  }

  return createPortal(
    <div className="lightbox-overlay" onClick={handleBackdropClick}>
      {/* Close button */}
      <button
        className="lightbox-close"
        onClick={close}
        aria-label="Close lightbox"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 384 512"
          width="20"
          height="20"
          fill="currentColor"
        >
          <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
        </svg>
      </button>

      {/* Slide counter */}
      {hasMultiple && (
        <div className="lightbox-counter">
          {currentIndex + 1} / {normalizedSources.length}
        </div>
      )}

      {/* Previous button */}
      {hasMultiple && (
        <button
          className="lightbox-nav lightbox-nav-prev"
          onClick={goPrev}
          aria-label="Previous"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 320 512"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z" />
          </svg>
        </button>
      )}

      {/* Content area */}
      <div className="lightbox-content">
        {current.type === 'image' && (
          <ImageWithFallback
            src={current.url}
            alt={`Slide ${currentIndex + 1}`}
            className="lightbox-image"
            enableFallback={true}
          />
        )}
        {current.type === 'video' && (
          <video
            className="lightbox-video"
            src={current.url}
            controls
            autoPlay
          />
        )}
        {current.type === 'youtube' && (
          <iframe
            className="lightbox-iframe"
            title={`Video ${currentIndex + 1}`}
            src={current.url}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>

      {/* Next button */}
      {hasMultiple && (
        <button
          className="lightbox-nav lightbox-nav-next"
          onClick={goNext}
          aria-label="Next"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 320 512"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
          </svg>
        </button>
      )}
    </div>,
    document.body
  )
}
