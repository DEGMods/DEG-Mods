import { ImageUrlHashChecker } from 'components/ImageUrlHashChecker'

/**
 * HashCheckerPage - A simple page that demonstrates the ImageUrlHashChecker component
 */
export const HashCheckerPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto'
        }}
      >
        {/* Page Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          <h1
            style={{
              margin: '0 0 16px 0',
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: '2.5em',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}
          >
            Image Hash Calculator
          </h1>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.1em',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.5'
            }}
          >
            Download any image from a URL and calculate its SHA-256 hash for
            verification purposes.
          </p>
        </div>

        {/* Main Component */}
        <ImageUrlHashChecker />

        {/* Additional Information */}
        <div
          style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <h3
            style={{
              margin: '0 0 16px 0',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '1.2em'
            }}
          >
            About SHA-256 Hashes
          </h3>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: '0.9em',
              lineHeight: '1.6'
            }}
          >
            <p style={{ margin: '0 0 12px 0' }}>
              SHA-256 (Secure Hash Algorithm 256-bit) is a cryptographic hash
              function that produces a unique 64-character hexadecimal string
              for any given input. Even the smallest change in the input will
              result in a completely different hash.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Common use cases:
              </strong>
            </p>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '6px' }}>
                <strong>File Integrity:</strong> Verify that a downloaded file
                hasn't been corrupted or tampered with
              </li>
              <li style={{ marginBottom: '6px' }}>
                <strong>Content Verification:</strong> Confirm that an image
                matches an expected version
              </li>
              <li style={{ marginBottom: '6px' }}>
                <strong>Duplicate Detection:</strong> Identify identical files
                even if they have different names
              </li>
              <li style={{ marginBottom: '6px' }}>
                <strong>Security:</strong> Ensure files haven't been modified by
                malicious actors
              </li>
            </ul>
          </div>
        </div>

        {/* Technical Notes */}
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <h4
            style={{
              margin: '0 0 12px 0',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '1em'
            }}
          >
            Technical Notes
          </h4>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.85em',
              lineHeight: '1.5'
            }}
          >
            <p style={{ margin: '0 0 8px 0' }}>
              • This tool downloads images directly in your browser using the
              Fetch API
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              • Hash calculation is performed using the Web Crypto API
              (SubtleCrypto)
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              • No data is sent to external servers - all processing happens
              locally
            </p>
            <p style={{ margin: '0' }}>
              • CORS restrictions may prevent downloading from some domains
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
