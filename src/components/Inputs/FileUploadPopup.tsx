import { createPortal } from 'react-dom'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Blossom } from '../../hooks'
import { Spinner } from 'components/Spinner'
import { MirrorStatus, MirrorError } from './types'
import FileUploadMirrorItem from './FileUploadMirrorItem'
import { useBodyScrollDisable } from '../../hooks'

import { UploadQueueInfo } from './FileUpload'
import { MEDIA_OPTIONS } from '../../controllers'

interface FileUploadPopupProps {
  loading: boolean
  stage: 'host' | 'scan' | 'mirrors' | 'queued'
  title: string
  files?: File[]
  uploadedFilenames?: Record<string, string>
  uploadedHashes?: string[]
  onClose: () => void
  onSetHostMirrors?: (mainHost: string, mirrors: Blossom[]) => void
  onSetDefaultHostMirrors?: (defaultMirrors: Blossom[]) => void
  onUpload?: () => void
  mainHost?: string
  defaultMirrors?: Blossom[]
  mirrors?: Blossom[]
  mirrorStatus: Record<string, MirrorStatus>
  mirrorErrors: Record<string, MirrorError>
  onReset?: () => void
  supportsScanning?: boolean
  scanned?: boolean
  scanError?: string | null
  onClearScanError?: () => void
  uploadQueue?: Record<string, UploadQueueInfo>
}

export const FileUploadPopup = ({
  loading,
  stage,
  title,
  files = [],
  uploadedFilenames = {},
  uploadedHashes = [],
  onClose,
  onSetHostMirrors,
  onSetDefaultHostMirrors,
  onUpload,
  mainHost: externalMainHost = '',
  defaultMirrors: externalDefaultMirrors = [],
  mirrors: externalMirrors = [],
  mirrorStatus,
  onReset,
  supportsScanning = false,
  scanned = false,
  mirrorErrors,
  scanError,
  onClearScanError,
  uploadQueue
}: FileUploadPopupProps) => {
  useBodyScrollDisable(true)
  // Set mainHost to first item in MEDIA_OPTIONS if externalMainHost is empty or not set
  const defaultMainHost = externalMainHost || MEDIA_OPTIONS[0]?.host || ''
  const initialMainHostRef = useRef(defaultMainHost)
  const [mainHost, setMainHost] = useState(initialMainHostRef.current)
  const initialMirrorsRef = useRef(externalMirrors)
  const [mirrors, setMirrors] = useState<Blossom[]>(initialMirrorsRef.current)
  const mirrorsFlag = mirrors.reduce(
    (acc, mirror) => acc + mirror.url + (mirror.isActive ? '1' : '0'),
    ''
  )
  const initialDefaultMirrorsRef = useRef(externalDefaultMirrors)
  const [defaultMirrors, setDefaultMirrors] = useState<Blossom[]>(
    initialDefaultMirrorsRef.current
  )
  const defaultMirrorsFlag = defaultMirrors.reduce(
    (acc, mirror) => acc + mirror.url + (mirror.isActive ? '1' : '0'),
    ''
  )
  const [newMirrorUrl, setNewMirrorUrl] = useState('')
  const [isScanErrorExpanded, setIsScanErrorExpanded] = useState(false)

  // Check if there are files in the upload queue
  const hasQueuedFiles = useMemo(() => {
    return uploadQueue ? Object.keys(uploadQueue).length > 0 : false
  }, [uploadQueue])

  // Get the minimum queue position for display
  const queuePosition = useMemo(() => {
    if (!uploadQueue) return undefined
    const positions = Object.values(uploadQueue)
      .map((info) => info.position)
      .filter((pos) => pos !== undefined) as number[]
    return positions.length > 0 ? Math.min(...positions) : undefined
  }, [uploadQueue])

  // Generate title with first filename if files are provided
  const displayTitle = useMemo(() => {
    if (files.length === 0) {
      return title
    }

    if (files.length === 1) {
      return `${title}: ${files[0].name}`
    }

    return `${title}: ${files.length} files`
  }, [title, files])

  // File status tracking
  const fileStatuses = useMemo(() => {
    return files.map((file, fileIndex) => {
      const hash = uploadedFilenames[file.name]
      const isUploaded = hash && uploadedHashes.includes(hash)
      const isQueued = uploadQueue && hash && uploadQueue[hash]

      let status:
        | 'pending'
        | 'uploading'
        | 'uploaded'
        | 'queued'
        | 'scanning'
        | 'mirroring'
        | 'completed'
        | 'mirror_error' = 'pending'

      // Check if this file has any mirror errors
      const fileHasMirrorErrors =
        isUploaded &&
        stage === 'mirrors' &&
        !loading &&
        (() => {
          const allMirrors = [...defaultMirrors, ...mirrors]
          const activeMirrors = allMirrors.filter((mirror) => mirror.isActive)

          return activeMirrors.some((mirror) => {
            const mirrorKey = `${mirror.url}-file-${fileIndex + 1}`
            return mirrorStatus[mirrorKey] === 'error'
          })
        })()

      // Determine status based on file's individual state
      if (isQueued) {
        status = 'queued'
      } else if (isUploaded) {
        // File has been uploaded successfully
        if (stage === 'scan' && supportsScanning && loading) {
          status = 'scanning'
        } else if (stage === 'mirrors' && loading) {
          status = 'mirroring'
        } else if (fileHasMirrorErrors) {
          // File uploaded but has mirror errors
          status = 'mirror_error'
        } else if (
          !loading &&
          (stage === 'mirrors' ||
            stage === 'scan' ||
            (stage === 'host' && isUploaded))
        ) {
          // Upload and all processing completed - only mark as completed if we've actually been through the process
          status = 'completed'
        } else {
          status = 'uploaded'
        }
      } else if (loading && stage === 'host') {
        // Currently being uploaded
        status = 'uploading'
      } else {
        // File not uploaded and not currently uploading
        status = 'pending'
      }

      console.log(`[FileUploadPopup] File ${file.name} status: ${status}`, {
        hash,
        isUploaded,
        isQueued,
        stage,
        loading,
        supportsScanning,
        fileHasMirrorErrors
      })

      return {
        file,
        status,
        hash,
        isUploaded
      }
    })
  }, [
    files,
    uploadedFilenames,
    uploadedHashes,
    uploadQueue,
    stage,
    loading,
    supportsScanning,
    mirrorStatus,
    defaultMirrors,
    mirrors
  ])

  // Prepare scan error message
  const scanErrorMessage = useMemo(() => {
    if (!scanError) {
      return null
    }

    let baseMessage = scanError

    for (const file of files) {
      const fileHash = uploadedFilenames[file.name]
      const fileName = file.name
      baseMessage = baseMessage.replace(fileHash, fileName)
    }

    return baseMessage.split('\n').map((line) => <div key={line}>{line}</div>)
  }, [scanError, uploadedFilenames, files])

  // Aggregate mirror status for checkboxes (for multiple files)
  const aggregatedMirrorStatus = useMemo(() => {
    const aggregated: Record<string, MirrorStatus> = {}
    const allMirrors = [...defaultMirrors, ...mirrors]

    allMirrors.forEach((mirror) => {
      const fileStatuses: MirrorStatus[] = []

      // Check status for each file on this mirror
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const mirrorKey = `${mirror.url}-file-${fileIndex + 1}`
        const status = mirrorStatus[mirrorKey]
        if (status) {
          fileStatuses.push(status)
        }
      }

      // Determine aggregated status
      if (fileStatuses.length === 0) {
        // No status yet - use undefined (will show checkbox)
        return
      } else if (fileStatuses.some((status) => status === 'error')) {
        // At least one file failed
        aggregated[mirror.url] = 'error'
      } else if (fileStatuses.some((status) => status === 'loading')) {
        // At least one file still loading
        aggregated[mirror.url] = 'loading'
      } else if (fileStatuses.every((status) => status === 'success')) {
        // All files succeeded
        aggregated[mirror.url] = 'success'
      } else {
        // Mixed or unknown states - show as loading
        aggregated[mirror.url] = 'loading'
      }
    })

    return aggregated
  }, [mirrorStatus, defaultMirrors, mirrors, files])

  // Aggregate mirror errors for checkboxes (for multiple files)
  const aggregatedMirrorErrors = useMemo(() => {
    const aggregated: Record<string, { message: string; timestamp: number }> =
      {}
    const allMirrors = [...defaultMirrors, ...mirrors]

    allMirrors.forEach((mirror) => {
      const errors: string[] = []

      // Check errors for each file on this mirror
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const mirrorKey = `${mirror.url}-file-${fileIndex + 1}`
        const error = mirrorErrors[mirrorKey]
        if (error) {
          errors.push(`File ${fileIndex + 1}: ${error.message}`)
        }
      }

      if (errors.length > 0) {
        aggregated[mirror.url] = {
          message: errors.join('; '),
          timestamp: Date.now()
        }
      }
    })

    return aggregated
  }, [mirrorErrors, defaultMirrors, mirrors, files])

  // Derived state: is the new mirror URL invalid?
  /**
   * Returns true if the new mirror URL is non-empty and does not contain 'https://'.
   * Used to show a warning banner and disable buttons.
   */
  const isNewMirrorUrlInvalid: boolean =
    newMirrorUrl.trim().length > 0 && !newMirrorUrl.includes('https://')

  useEffect(() => {
    if (mainHost && mirrors.length > 0) {
      onSetHostMirrors?.(mainHost, mirrors)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSetHostMirrors, mainHost, mirrorsFlag])

  useEffect(() => {
    if (defaultMirrors.length > 0) {
      onSetDefaultHostMirrors?.(defaultMirrors)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSetDefaultHostMirrors, defaultMirrorsFlag])

  const handleAddMirror = useCallback(() => {
    if (newMirrorUrl.trim()) {
      const newMirror: Blossom = {
        id: Date.now().toString(),
        url: newMirrorUrl.trim(),
        isActive: true
      }
      setMirrors((prev) => [...prev, newMirror])
      setNewMirrorUrl('')
    }
  }, [newMirrorUrl])

  const handleRemoveMirror = useCallback((id: string) => {
    setMirrors((prev) => prev.filter((mirror) => mirror.id !== id))
  }, [])

  const handleToggleMirror = useCallback((id: string) => {
    setMirrors((prev) =>
      prev.map((mirror) =>
        mirror.id === id ? { ...mirror, isActive: !mirror.isActive } : mirror
      )
    )
  }, [])

  const handleToggleDefaultMirror = useCallback((id: string) => {
    setDefaultMirrors((prev) =>
      prev.map((mirror) =>
        mirror.id === id ? { ...mirror, isActive: !mirror.isActive } : mirror
      )
    )
  }, [])

  const handleReset = useCallback(() => {
    setMainHost(initialMainHostRef.current)
    setMirrors(initialMirrorsRef.current)
    setDefaultMirrors(initialDefaultMirrorsRef.current)
    setNewMirrorUrl('')
    onSetDefaultHostMirrors?.(initialDefaultMirrorsRef.current)
    onReset?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReset])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAddMirror()
      }
    },
    [handleAddMirror]
  )

  return createPortal(
    <div
      className="popUpMain"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '20px',
        paddingBottom: '20px',
        overflowY: 'auto'
      }}
    >
      <div
        className="ContainerMain"
        style={{
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto'
        }}
      >
        <div className="popUpMainCardWrapper">
          <div className="popUpMainCard">
            {/* Header Section */}
            <div className="popUpMainCardTop">
              <div className="popUpMainCardTopInfo">
                <h3>{displayTitle}</h3>
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

            {/* File List Section */}
            {files.length > 1 && (
              <div style={{ padding: '0 20px 20px 20px' }}>
                <label className="form-label labelMain">
                  Files ({files.length})
                </label>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    padding: '12px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}
                >
                  {fileStatuses.map((fileStatus, index) => {
                    const { file, status } = fileStatus
                    return (
                      <div
                        key={`${file.name}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 0',
                          borderBottom:
                            index < fileStatuses.length - 1
                              ? '1px solid rgba(0, 0, 0, 0.1)'
                              : 'none'
                        }}
                      >
                        {/* Status Icon */}
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            flexShrink: 0
                          }}
                        >
                          {(status === 'uploaded' ||
                            status === 'completed') && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 640 640"
                              width="20"
                              height="20"
                              fill="#28a745"
                            >
                              <path d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z" />
                            </svg>
                          )}
                          {status === 'mirror_error' && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 512 512"
                              width="20"
                              height="20"
                              fill="#ffc107"
                            >
                              <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z" />
                            </svg>
                          )}
                          {(status === 'uploading' ||
                            status === 'scanning' ||
                            status === 'mirroring') && (
                            <div style={{ width: '20px', height: '20px' }}>
                              <Spinner height={20} />
                            </div>
                          )}
                          {status === 'queued' && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 512 512"
                              width="20"
                              height="20"
                              fill="#ffc107"
                            >
                              <path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z" />
                            </svg>
                          )}
                          {status === 'pending' && (
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: '2px solid #dee2e6',
                                backgroundColor: 'transparent'
                              }}
                            />
                          )}
                        </div>

                        {/* File Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#dee2e6',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {file.name}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#6c757d',
                              marginTop: '2px'
                            }}
                          >
                            {(() => {
                              const bytes = file.size
                              if (bytes === 0) return '0 B'
                              if (bytes < 1024) return `${bytes} B`
                              if (bytes < 1024 * 1024)
                                return `${(bytes / 1024).toFixed(1)} KB`
                              if (bytes < 1024 * 1024 * 1024)
                                return `${(bytes / 1024 / 1024).toFixed(2)} MB`
                              return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
                            })()}{' '}
                            •{' '}
                            {status === 'pending'
                              ? 'Waiting'
                              : status === 'uploading'
                                ? 'Uploading...'
                                : status === 'uploaded'
                                  ? 'Uploaded'
                                  : status === 'completed'
                                    ? 'Complete'
                                    : status === 'queued'
                                      ? 'In queue'
                                      : status === 'scanning'
                                        ? 'Scanning...'
                                        : status === 'mirroring'
                                          ? 'Mirroring...'
                                          : status === 'mirror_error'
                                            ? 'Mirror Issues'
                                            : 'Unknown'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Main Host Section */}
            <div className="popUpMainCardBody" style={{ padding: '20px' }}>
              <div className="inputLabelWrapperMain">
                <label className="form-label labelMain">Main host</label>
                <p className="labelDescriptionMain">
                  Here's where the first your file will be uploaded to
                </p>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="inputMain"
                    value={mainHost}
                    onChange={(e) => setMainHost(e.target.value)}
                    placeholder="Main host URL"
                    disabled={loading}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    {scanned && (
                      <div
                        style={{
                          backgroundColor: '#60ae60',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: 'white',
                          fontWeight: '500'
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 640 640"
                          width="12"
                          height="12"
                          fill="currentColor"
                        >
                          <path d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z" />
                        </svg>
                        Scanned
                      </div>
                    )}
                    {loading && (
                      <>
                        {stage === 'host' && (
                          <div>
                            <p className="labelDescriptionMain">Uploading...</p>
                          </div>
                        )}
                        {stage === 'scan' && supportsScanning && (
                          <div>
                            <p className="labelDescriptionMain">Scanning...</p>
                          </div>
                        )}
                        {stage === 'scan' && !supportsScanning && (
                          <div>
                            <p className="labelDescriptionMain">
                              Processing...
                            </p>
                          </div>
                        )}
                        {stage === 'queued' && (
                          <div>
                            <p className="labelDescriptionMain">In Queue...</p>
                          </div>
                        )}
                        {stage === 'mirrors' && (
                          <div>
                            <p className="labelDescriptionMain">Mirroring...</p>
                          </div>
                        )}
                        <div className="spinner">
                          <Spinner height={20} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Malware Scanning Alert */}
              {!(
                mainHost.includes('https://') &&
                mainHost.includes('bs.degmods.com')
              ) && (
                <div
                  style={{
                    marginTop: '15px',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '8px',
                    color: '#856404'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                      width="16"
                      height="16"
                      fill="currentColor"
                      style={{ marginTop: '2px', flexShrink: 0 }}
                    >
                      <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z" />
                    </svg>
                    <div>
                      <strong>Malware Scanning Notice:</strong> Malware scanning
                      is only supported when using{' '}
                      <button
                        type="button"
                        onClick={() => setMainHost('https://bs.degmods.com/')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          font: 'inherit'
                        }}
                        title="Click to set as main host"
                      >
                        "https://bs.degmods.com/"
                      </button>{' '}
                      as the main host. Files uploaded to other hosts will not
                      be scanned for malware.
                    </div>
                  </div>
                </div>
              )}

              {/* Scan Error Alert */}
              {scanError && (
                <div
                  style={{
                    marginTop: '15px',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    border: '1px solid rgba(220, 53, 69, 0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                      width="16"
                      height="16"
                      fill="currentColor"
                      style={{
                        marginTop: '2px',
                        flexShrink: 0,
                        color: '#721c24'
                      }}
                    >
                      <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9L273 256l47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L256 289.9l-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z" />
                    </svg>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <strong>Scan Error:</strong> Malware detected within
                          the uploaded files. The file was uploaded to the main
                          server, but it hasn't been mirrored to other servers.
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setIsScanErrorExpanded(!isScanErrorExpanded)
                            }
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#6c757d',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              textDecoration: 'underline'
                            }}
                            title={
                              isScanErrorExpanded
                                ? 'Hide details'
                                : 'Show details'
                            }
                          >
                            {isScanErrorExpanded ? 'Hide' : 'Show'} Details
                          </button>
                          {onClearScanError && (
                            <button
                              type="button"
                              onClick={onClearScanError}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#6c757d',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                textDecoration: 'underline'
                              }}
                              title="Dismiss error"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isScanErrorExpanded && (
                    <div style={{ color: '#6c757d', fontSize: '14px' }}>
                      {scanErrorMessage}
                    </div>
                  )}
                </div>
              )}

              {/* Default Mirrors Section */}
              {!scanError && (
                <div style={{ marginTop: '20px' }}>
                  <label className="form-label labelMain">
                    Mirrors (Site list)
                  </label>
                  <p className="labelDescriptionMain">
                    Here's where your file will be mirrored to if successful.
                    This is the site's list of third-party Blossom servers.
                  </p>

                  {/* Existing Default Mirrors List */}
                  <div
                    style={{
                      marginTop: '15px',
                      background: 'rgba(0, 0, 0, 0.1)',
                      border: 'solid 1px rgba(255, 255, 255, 0.1)',
                      boxShadow: 'inset 0 0 8px 0 rgb(0, 0, 0, 0.1)',
                      padding: '10px 15px'
                    }}
                  >
                    {defaultMirrors.map((mirror) => (
                      <div
                        key={mirror.id}
                        className="inputWrapperMain"
                        style={{
                          marginBottom: '8px',
                          width: '100%',
                          borderRadius: '0'
                        }}
                      >
                        <div
                          className="inputLabelWrapperMain inputLabelWrapperMainAlt"
                          style={{ width: '100%', margin: 0, flex: 1 }}
                        >
                          <FileUploadMirrorItem
                            loading={loading}
                            mirror={mirror}
                            status={aggregatedMirrorStatus[mirror.url]}
                            errorMessage={
                              aggregatedMirrorErrors[mirror.url]?.message
                            }
                            onChange={() =>
                              handleToggleDefaultMirror(mirror.id)
                            }
                          />
                          <label
                            className="form-label labelMain"
                            style={{ margin: 0, flex: 1 }}
                          >
                            {mirror.url}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mirrors Section */}
              {!scanError && (
                <div style={{ marginTop: '20px' }}>
                  <label className="form-label labelMain">
                    Mirrors (User list)
                  </label>
                  <p className="labelDescriptionMain">
                    Here's where your file will be mirrored to if successful.
                    This is your list of third-party or personal Blossom
                    servers.
                  </p>

                  {/* Add Mirror Input */}
                  <div
                    className="inputWrapperMain"
                    style={{ marginTop: '10px' }}
                  >
                    <input
                      type="text"
                      className="inputMain"
                      placeholder="Add Blossom server"
                      value={newMirrorUrl}
                      onChange={(e) => setNewMirrorUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={loading}
                    />
                    <button
                      className="btn btnMain btnMainAdd"
                      type="button"
                      onClick={handleAddMirror}
                      // Disable if input is empty, loading, or invalid
                      disabled={
                        !newMirrorUrl.trim() || loading || isNewMirrorUrlInvalid
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="-32 0 512 512"
                        width="1em"
                        height="1em"
                        fill="currentColor"
                      >
                        <path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"></path>
                      </svg>
                    </button>
                  </div>
                  {/* Blossom server input validation banner */}
                  {isNewMirrorUrlInvalid && (
                    <div
                      style={{
                        marginTop: '15px',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '8px',
                        color: '#856404'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 512 512"
                          width="16"
                          height="16"
                          fill="currentColor"
                          style={{ marginTop: '2px', flexShrink: 0 }}
                        >
                          <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z" />
                        </svg>
                        <div>
                          <strong>Invalid Blossom server URL:</strong> Please
                          enter a valid URL starting with <code>https://</code>.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing Mirrors List */}
                  <div
                    style={{
                      marginTop: '15px',
                      background: 'rgba(0, 0, 0, 0.1)',
                      border: 'solid 1px rgba(255, 255, 255, 0.1)',
                      boxShadow: 'inset 0 0 8px 0 rgb(0, 0, 0, 0.1)',
                      padding: '10px 15px'
                    }}
                  >
                    {mirrors.map((mirror) => (
                      <div
                        key={mirror.id}
                        className="inputWrapperMain"
                        style={{
                          marginBottom: '8px',
                          width: '100%',
                          borderRadius: '0'
                        }}
                      >
                        <div
                          className="inputLabelWrapperMain inputLabelWrapperMainAlt"
                          style={{ width: '100%', margin: 0, flex: 1 }}
                        >
                          <FileUploadMirrorItem
                            loading={loading}
                            mirror={mirror}
                            status={aggregatedMirrorStatus[mirror.url]}
                            errorMessage={
                              aggregatedMirrorErrors[mirror.url]?.message
                            }
                            onChange={() => handleToggleMirror(mirror.id)}
                          />
                          <label
                            className="form-label labelMain"
                            style={{ margin: 0, flex: 1 }}
                          >
                            {mirror.url}
                          </label>
                        </div>
                        <button
                          className="btn btnMain btnMainRemove"
                          type="button"
                          onClick={() => handleRemoveMirror(mirror.id)}
                          title="Remove"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="-32 0 512 512"
                            width="1em"
                            height="1em"
                            fill="currentColor"
                          >
                            <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Section */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '30px',
                  gap: '10px'
                }}
              >
                <button
                  className="btn btnMain"
                  type="button"
                  onClick={onClose}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btnMain"
                  type="button"
                  onClick={handleReset}
                  style={{ flex: 1 }}
                >
                  Reset
                </button>
                <button
                  className={`btn btnMain btnMainPrimary ${hasQueuedFiles ? 'swooshLoading' : ''}`}
                  type="button"
                  onClick={
                    hasQueuedFiles
                      ? undefined
                      : !loading && (stage === 'mirrors' || stage === 'queued')
                        ? () => {
                            handleReset()
                            onClose()
                          }
                        : onUpload
                  }
                  style={{
                    flex: 1,
                    backgroundColor: hasQueuedFiles
                      ? 'rgba(138, 43, 226, 0.8)'
                      : !loading && (stage === 'mirrors' || stage === 'queued')
                        ? '#28a745'
                        : '#007bff',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    padding: '12px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    cursor:
                      hasQueuedFiles || loading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s ease',
                    opacity: hasQueuedFiles || loading ? 0.6 : 1
                  }}
                  // Disable upload if loading, blossom input is invalid, or files are in queue
                  disabled={loading || isNewMirrorUrlInvalid || hasQueuedFiles}
                >
                  {hasQueuedFiles
                    ? queuePosition === 0
                      ? 'Next in queue'
                      : queuePosition !== undefined
                        ? `Queue position: ${queuePosition}`
                        : 'Checking with server...'
                    : !loading && (stage === 'mirrors' || stage === 'queued')
                      ? 'Done'
                      : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
