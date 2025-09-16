/**
 * Interactive SVG Challenge Component
 *
 * Displays and handles user interaction with the visual CAPTCHA-like challenge
 * for degmods-server ZIP file downloads.
 */

import React, { useRef, useCallback, useState, useEffect } from 'react'
import {
  ChallengePosition,
  CHALLENGE_CONFIG,
  ChallengeError
} from '../types/challenge'

interface ChallengeComponentProps {
  /** PNG image URL to display */
  imageUrl: string
  /** Callback when user drops the square */
  onPositionClick: (position: ChallengePosition) => void
  /** Whether the challenge is currently being verified */
  isVerifying?: boolean
  /** Error message to display */
  error?: string | ChallengeError
  /** Whether to show click markers for debugging */
  showClickMarkers?: boolean
}

interface ClickMarker {
  id: string
  x: number
  y: number
  timestamp: number
}

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  offsetX: number
  offsetY: number
}

/**
 * Interactive PNG Challenge Component
 */
export const ChallengeComponent: React.FC<ChallengeComponentProps> = ({
  imageUrl,
  onPositionClick,
  isVerifying = false,
  error,
  showClickMarkers = false
}) => {
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const dragSquareRef = useRef<HTMLDivElement>(null)
  const [clickMarkers, setClickMarkers] = useState<ClickMarker[]>([])
  const [isHovering, setIsHovering] = useState(false)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: CHALLENGE_CONFIG.SLIDER_START_X, // Always start 25px from left edge of image
    currentY: CHALLENGE_CONFIG.SLIDER_TRACK_Y, // Fixed Y position - 50px from top
    offsetX: 0,
    offsetY: 0
  })

  /**
   * Handle mouse down on the draggable square
   */
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isVerifying) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const rect = imageContainerRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      const offsetX = event.clientX - rect.left - dragState.currentX

      setDragState((prev) => ({
        ...prev,
        isDragging: true,
        startX: event.clientX,
        startY: event.clientY,
        offsetX,
        offsetY: 0 // No Y offset since movement is constrained to horizontal
      }))
    },
    [isVerifying, dragState.currentX]
  )

  /**
   * Handle mouse move during drag
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!dragState.isDragging || isVerifying) {
        return
      }

      const rect = imageContainerRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      const newX = Math.max(
        0,
        Math.min(
          CHALLENGE_CONFIG.IMAGE_WIDTH - CHALLENGE_CONFIG.GAP_WIDTH,
          event.clientX - rect.left - dragState.offsetX
        )
      )
      // Y position is fixed at track position
      const fixedY = CHALLENGE_CONFIG.SLIDER_TRACK_Y

      setDragState((prev) => ({
        ...prev,
        currentX: newX,
        currentY: fixedY
      }))
    },
    [dragState.isDragging, dragState.offsetX, isVerifying]
  )

  /**
   * Handle mouse up to complete drag and trigger challenge
   */
  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging || isVerifying) {
      return
    }

    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    // Calculate the left edge position of the dropped square
    const leftEdgeX = dragState.currentX
    const centerY = dragState.currentY + CHALLENGE_CONFIG.GAP_HEIGHT / 2

    const position: ChallengePosition = {
      x: Math.round(leftEdgeX),
      y: Math.round(centerY)
    }

    // Add click marker for visual feedback
    if (showClickMarkers) {
      const marker: ClickMarker = {
        id: `drop-${Date.now()}-${Math.random()}`,
        x: leftEdgeX,
        y: centerY,
        timestamp: Date.now()
      }
      setClickMarkers((prev) => [...prev, marker])

      // Remove marker after 3 seconds
      setTimeout(() => {
        setClickMarkers((prev) => prev.filter((m) => m.id !== marker.id))
      }, 3000)
    }

    setDragState((prev) => ({
      ...prev,
      isDragging: false
    }))

    console.log('[Challenge] Drop position:', position)
    onPositionClick(position)
  }, [
    dragState.isDragging,
    dragState.currentX,
    dragState.currentY,
    isVerifying,
    onPositionClick,
    showClickMarkers
  ])

  /**
   * Clear all click markers
   */
  const clearClickMarkers = useCallback(() => {
    setClickMarkers([])
  }, [])

  /**
   * Get error message string
   */
  const getErrorMessage = (): string | null => {
    if (!error) return null

    if (typeof error === 'string') {
      return error
    }

    return error.message || 'An error occurred'
  }

  /**
   * Set up global mouse event listeners for drag functionality
   */
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp])

  /**
   * Clean up old click markers periodically
   */
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      setClickMarkers((prev) =>
        prev.filter((marker) => now - marker.timestamp < 3000)
      )
    }, 1000)

    return () => clearInterval(cleanup)
  }, [])

  const errorMessage = getErrorMessage()

  return (
    <div className="challenge-component">
      <div className="challenge-instructions">
        <h3>Complete the Challenge</h3>
        <p>
          Drag the gray square horizontally to the correct position on the
          puzzle to complete it. Release the mouse button to submit your
          solution.
        </p>
      </div>

      <div
        className={`challenge-image-container ${isVerifying ? 'verifying' : ''} ${isHovering ? 'hovering' : ''} ${dragState.isDragging ? 'dragging' : ''}`}
        ref={imageContainerRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          position: 'relative',
          cursor: isVerifying ? 'wait' : 'default',
          backgroundColor: '#f9f9f9',
          display: 'inline-block',
          userSelect: 'none'
        }}
      >
        {/* PNG Image */}
        <img
          src={imageUrl}
          alt="Challenge puzzle"
          style={{
            display: 'block',
            width: `${CHALLENGE_CONFIG.IMAGE_WIDTH}px`,
            height: `${CHALLENGE_CONFIG.IMAGE_HEIGHT}px`,
            pointerEvents: isVerifying ? 'none' : 'auto',
            opacity: isVerifying ? 0.7 : 1,
            transition: 'opacity 0.2s ease'
          }}
        />

        {/* Draggable Yellow Square */}
        <div
          ref={dragSquareRef}
          className="draggable-square"
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            left: `${dragState.currentX}px`,
            top: `${dragState.currentY}px`,
            width: `${CHALLENGE_CONFIG.GAP_WIDTH}px`,
            height: `${CHALLENGE_CONFIG.GAP_HEIGHT}px`,
            backgroundColor: '#64748B', // Slate gray color
            border: '2px solid #475569', // Darker slate border
            borderRadius: '4px',
            cursor: isVerifying
              ? 'wait'
              : dragState.isDragging
                ? 'grabbing'
                : 'grab',
            pointerEvents: isVerifying ? 'none' : 'auto',
            opacity: isVerifying ? 0.7 : 1,
            transition: dragState.isDragging ? 'none' : 'all 0.2s ease',
            zIndex: dragState.isDragging ? 1000 : 10,
            boxShadow: dragState.isDragging
              ? '0 8px 16px rgba(0, 0, 0, 0.3)'
              : '0 2px 4px rgba(0, 0, 0, 0.2)',
            transform: dragState.isDragging ? 'scale(1.05)' : 'scale(1)',
            userSelect: 'none'
          }}
        >
          {/* Optional: Add some visual indication this is draggable */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '20px',
              color: '#E2E8F0', // Light gray for visibility on dark background
              pointerEvents: 'none',
              fontWeight: 'bold'
            }}
          >
            ⋮⋮
          </div>
        </div>

        {/* Click Markers */}
        {showClickMarkers &&
          clickMarkers.map((marker) => (
            <div
              key={marker.id}
              className="click-marker"
              style={{
                position: 'absolute',
                left: `${marker.x - 5}px`,
                top: `${marker.y - 5}px`,
                width: '10px',
                height: '10px',
                backgroundColor: 'red',
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 10,
                animation: 'pulse 0.5s ease-in-out'
              }}
            />
          ))}

        {/* Loading Overlay */}
        {isVerifying && (
          <div
            className="challenge-loading-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              zIndex: 20
            }}
          >
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Verifying...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="alert alert-danger mt-3" role="alert">
          <strong>Challenge Error:</strong> {errorMessage}
        </div>
      )}

      {/* Debug Controls */}
      {showClickMarkers && (
        <div className="challenge-debug-controls mt-3">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={clearClickMarkers}
          >
            Clear Click Markers
          </button>
          <small className="text-muted ms-2">
            Click markers: {clickMarkers.length}
          </small>
        </div>
      )}

      {/* Status */}
      <div className="challenge-status mt-2">
        {isVerifying ? (
          <small className="text-info">
            <i className="fas fa-spinner fa-spin me-1"></i>
            Verifying your solution...
          </small>
        ) : dragState.isDragging ? (
          <small className="text-primary">
            <i className="fas fa-hand-rock me-1"></i>
            Drag the square to the correct position and release...
          </small>
        ) : (
          <small className="text-muted">
            Drag the gray square horizontally into the gap to complete the
            puzzle
          </small>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
        }

        .challenge-image-container.hovering {
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }

        .challenge-image-container.verifying {
          border-color: #6c757d;
        }

        .challenge-image-container.dragging {
          border-color: #28a745;
          box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
        }

        .challenge-instructions h3 {
          color: #495057;
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .challenge-instructions p {
          color: #6c757d;
          margin-bottom: 0.5rem;
        }

        .challenge-hint {
          font-style: italic;
        }

        .challenge-debug-controls {
          padding: 0.5rem;
          background-color: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #dee2e6;
        }
      `}</style>
    </div>
  )
}

export default ChallengeComponent
