import { Accept, useDropzone, FileRejection } from 'react-dropzone'
import React, { useCallback, useMemo, useState, useEffect } from 'react'
import {
  MediaOption,
  MEDIA_OPTIONS,
  ImageController,
  MEDIA_DROPZONE_OPTIONS
} from '../../controllers'
import { errorFeedback } from '../../types'
import { useBlossomList } from '../../hooks'
import { MediaInputPopover } from './MediaInputPopover'
import { Spinner } from 'components/Spinner'
import styles from './FileUpload.module.scss'
import { FileUploadPopup } from './FileUploadPopup'
import { getFileSha256 } from 'utils'
import { MirrorStatus, MirrorError } from './types'
import { BaseError, QueueContext } from 'types'
import { DegmodsErrorType } from 'controllers/image/degmods-server'

export interface FileUploadProps {
  simple?: boolean | undefined
  multiple?: boolean | undefined
  accept?: Accept | undefined
  onChange: (values: string[]) => void
  onUploadComplete?: (data: { urls: string[]; hashes: string[] }) => void
  defaultDropzoneLabel?: string | undefined
  maxSize?: number | undefined
}

export type ScanResult = {
  success: boolean
  result: string
}

export type StatusResult = {
  scanned?: ScanResult
}

export type UploadQueueInfo = {
  token: string | null
  position?: number
  retryCount: number
  timestamp: number
  cachedSignedEvent?: string // Base64 representation of the signed event
  auth?: string | null
}

export const FileUpload = React.memo(
  ({
    multiple = false,
    onChange,
    simple = false,
    accept,
    onUploadComplete,
    defaultDropzoneLabel,
    maxSize
  }: FileUploadProps) => {
    const [stage, setStage] = useState<'host' | 'scan' | 'mirrors' | 'queued'>(
      'host'
    )
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
    const [uploadedHashes, setUploadedHashes] = useState<string[]>([])
    const [uploadedFilenames, setUploadedFilenames] = useState<
      Record<string, string>
    >({})
    const [mirrorStatus, setMirrorStatus] = useState<
      Record<string, MirrorStatus>
    >({})
    const [mirrorErrors, setMirrorErrors] = useState<
      Record<string, MirrorError>
    >({})
    const {
      hostMirrors,
      setHostMirrors,
      defaultHostMirrors,
      setDefaultHostMirrors
    } = useBlossomList()
    const [isLoading, setIsLoading] = useState(false)
    const [popupOpen, setPopupOpen] = useState(false)
    const [cachedFiles, setCachedFiles] = useState<File[]>([])
    const [isScanned, setIsScanned] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    // For non-simple uploads, use the domain-based blossom server as default
    const getDefaultMediaOption = useCallback((): MediaOption => {
      if (!simple) {
        const currentDomain = window.location.hostname
        const isLocalhost = currentDomain.includes('localhost')

        if (isLocalhost) {
          return {
            name: `localhost`,
            host: 'http://localhost:3000/',
            type: 'degmods-server'
          }
        }

        const blossomServerUrl = `https://bs.${currentDomain}/`

        // Check if this domain-based server exists in MEDIA_OPTIONS
        const domainOption = MEDIA_OPTIONS.find(
          (option) => option.host === blossomServerUrl
        )
        if (domainOption) {
          return domainOption
        }

        // If not found, create a new option for this domain
        return {
          name: `bs.${currentDomain}`,
          host: blossomServerUrl,
          type: 'degmods-server'
        }
      }

      // For simple uploads, use the first available option
      return MEDIA_OPTIONS[0]
    }, [simple])

    const [mediaOption, setMediaOption] = useState<MediaOption>(
      getDefaultMediaOption()
    )
    const [uploadQueue, setUploadQueue] = useState<
      Record<string, UploadQueueInfo>
    >({})
    const [fileHashMap, setFileHashMap] = useState<Record<string, File>>({})
    const [retryInProgress, setRetryInProgress] = useState<
      Record<string, boolean>
    >({})

    const handleOptionChange = useCallback(
      (mo: MediaOption) => () => {
        setMediaOption(mo)
        setMirrorStatus({})
        setHostMirrors(mo.host, hostMirrors.mirrors)
        setScanError(null)
      },
      [setHostMirrors, setMirrorStatus, hostMirrors.mirrors]
    )

    const clearScanError = useCallback(() => {
      setScanError(null)
    }, [])

    const correspondingMediaOption = useMemo(
      () =>
        MEDIA_OPTIONS.find((mo) => mo.host === hostMirrors.mainHost) ||
        MEDIA_OPTIONS[0],
      [hostMirrors.mainHost]
    )

    const handleUpload = useCallback(
      async (acceptedFiles: File[]) => {
        if (acceptedFiles.length) {
          try {
            setIsLoading(true)
            setMirrorStatus({})
            setMirrorErrors({})
            setScanError(null)

            const imageController = new ImageController(
              correspondingMediaOption
            )
            const urls: string[] = []
            const hashes: string[] = []
            const filenameMap: Record<string, string> = {}
            let queueing = false
            let errorOccurred = false
            const failedFiles: { file: File; error: Error }[] = []

            console.log(
              `[FileUpload] Starting upload for ${acceptedFiles.length} files`
            )

            for (let i = 0; i < acceptedFiles.length; i++) {
              const file = acceptedFiles[i]
              const hash = await getFileSha256(file)

              console.log(
                `[FileUpload] Processing file ${i + 1}/${acceptedFiles.length}: ${file.name} (${hash})`
              )

              // Store file in hash mapping for queue retries
              setFileHashMap((prev) => ({ ...prev, [hash]: file }))

              try {
                // Check if we have a queue token for this file
                const queueInfo = uploadQueue[hash]
                let url: string

                if (correspondingMediaOption.type === 'degmods-server') {
                  // Retry with queue token for degmods server
                  const degmodsServer = imageController
                  if (
                    queueInfo &&
                    queueInfo.token &&
                    degmodsServer.retryWithQueueToken &&
                    degmodsServer.getMediaUrl &&
                    degmodsServer.auth
                  ) {
                    const mediaUrl = degmodsServer.getMediaUrl()
                    // Use cached signed event if available to avoid re-signing
                    let auth = queueInfo.auth || null
                    if (!auth) {
                      auth = await degmodsServer.auth(
                        hash,
                        queueInfo.cachedSignedEvent
                      )
                    }
                    const response = await degmodsServer.retryWithQueueToken(
                      mediaUrl,
                      auth,
                      file,
                      queueInfo.token
                    )
                    url = response || ''
                  } else {
                    url = await imageController.post(file)
                  }
                } else {
                  // Normal upload
                  url = await imageController.post(file)
                }

                if (url) {
                  urls.push(url)
                  hashes.push(hash)
                  filenameMap[file.name] = hash

                  console.log(
                    `[FileUpload] File ${i + 1}/${acceptedFiles.length} uploaded successfully: ${file.name}`
                  )

                  // Update state immediately for this individual file
                  setUploadedUrls((prev) => [...prev, url])
                  setUploadedHashes((prev) => [...prev, hash])
                  setUploadedFilenames((prev) => ({
                    ...prev,
                    [file.name]: hash
                  }))

                  // Clear queue info and file mapping on success
                  setUploadQueue((prev) => {
                    const newQueue = { ...prev }
                    delete newQueue[hash]
                    return newQueue
                  })
                  setFileHashMap((prev) => {
                    const newMap = { ...prev }
                    delete newMap[hash]
                    return newMap
                  })
                } else {
                  console.warn(
                    `[FileUpload] File ${i + 1}/${acceptedFiles.length} upload returned empty URL: ${file.name}`
                  )
                  failedFiles.push({
                    file,
                    error: new Error('Upload returned empty URL')
                  })
                }
              } catch (error) {
                console.log(
                  `[FileUpload] Error uploading file ${i + 1}/${acceptedFiles.length} (${file.name}):`,
                  error,
                  error instanceof BaseError
                )
                if (error instanceof BaseError) {
                  const errorMessage = error.message

                  if (
                    errorMessage === DegmodsErrorType.UPLOAD_QUEUE_FULL ||
                    errorMessage === DegmodsErrorType.UPLOAD_QUEUE_POSITION
                  ) {
                    // Handle queue scenario
                    const context = error.context as QueueContext
                    console.log(`[FileUpload] File queued - Context:`, context)
                    const queueToken = context?.queueToken || null
                    const position = context?.position
                    const auth = context?.auth || null

                    console.log(`[FileUpload] File queued for retry:`, {
                      hash,
                      fileName: file.name,
                      queueToken: !!queueToken,
                      position,
                      retryCount: (uploadQueue[hash]?.retryCount || 0) + 1
                    })

                    setUploadQueue((prev) => ({
                      ...prev,
                      [hash]: {
                        token: queueToken,
                        position,
                        retryCount: (prev[hash]?.retryCount || 0) + 1,
                        timestamp: Date.now(),
                        cachedSignedEvent: prev[hash]?.cachedSignedEvent, // Preserve existing signed event if available
                        auth
                      }
                    }))

                    // Set stage to queued if not already set
                    if (!queueing) {
                      setStage('queued')
                      queueing = true
                    }

                    // Don't throw error, let the queue retry mechanism handle it
                    continue
                  } else if (
                    errorMessage === DegmodsErrorType.SERVER_OUT_OF_SPACE
                  ) {
                    console.error(
                      `[FileUpload] Server out of space for file: ${file.name}`
                    )
                    failedFiles.push({
                      file,
                      error: new Error('File is too large for this server.')
                    })
                    errorOccurred = true
                  } else {
                    console.error(
                      `[FileUpload] BaseError for file ${file.name}:`,
                      error
                    )
                    failedFiles.push({ file, error: error as Error })
                    errorOccurred = true
                  }
                } else {
                  console.error(
                    `[FileUpload] Unknown error for file ${file.name}:`,
                    error
                  )
                  failedFiles.push({ file, error: error as Error })
                  errorOccurred = true
                }
              }
            }

            // Report any failed files
            if (failedFiles.length > 0) {
              console.warn(
                `[FileUpload] ${failedFiles.length} files failed to upload:`,
                failedFiles.map((f) => f.file.name)
              )
              // For multiple files, we can still proceed with successful uploads
              // Only show error feedback if ALL files failed
              if (failedFiles.length === acceptedFiles.length) {
                errorFeedback(
                  new Error(
                    `All ${acceptedFiles.length} files failed to upload`
                  )
                )
              } else {
                // Show a warning for partial failures
                const failedNames = failedFiles
                  .map((f) => f.file.name)
                  .join(', ')
                console.warn(
                  `[FileUpload] Some files failed to upload: ${failedNames}`
                )
              }
            }

            console.log(
              `[FileUpload] Upload completed. Successful: ${urls.length}/${acceptedFiles.length}`
            )

            if (simple) {
              onChange(urls)
              onUploadComplete?.({ urls, hashes })
            } else {
              // Don't overwrite individual file updates, just ensure final state is consistent
              setUploadedUrls((prev) => {
                // Merge with any existing uploads to avoid overwriting individual updates
                const allUrls = [...new Set([...prev, ...urls])]
                return allUrls
              })
              setUploadedHashes((prev) => {
                const allHashes = [...new Set([...prev, ...hashes])]
                return allHashes
              })
              setUploadedFilenames((prev) => ({
                ...prev,
                ...filenameMap
              }))
              setIsScanned(false)

              console.log(
                `[FileUpload] Upload batch completed. Total files uploaded: ${urls.length}/${acceptedFiles.length}`
              )

              // Check if the server supports scanning
              if (errorOccurred && urls.length === 0) {
                // Only reset to host stage if no files uploaded successfully
                setStage('host')
                setIsLoading(false)
              } else if (!queueing) {
                if (imageController.scan && urls.length > 0) {
                  console.log(
                    `[FileUpload] Moving to scan stage for ${urls.length} uploaded files`
                  )
                  setStage('scan')
                } else if (urls.length > 0) {
                  console.log(
                    `[FileUpload] Moving to mirrors stage for ${urls.length} uploaded files`
                  )
                  setStage('mirrors')
                } else {
                  console.log(
                    `[FileUpload] No files uploaded, staying in host stage`
                  )
                  setIsLoading(false)
                }
              }
            }
          } catch (error) {
            console.error(`[FileUpload] Critical error during upload:`, error)
            errorFeedback(error)
            setIsLoading(false)
          } finally {
            if (simple) {
              setIsLoading(false)
            }
          }
        }
      },
      [
        correspondingMediaOption,
        onChange,
        onUploadComplete,
        simple,
        setUploadedUrls,
        setMirrorStatus,
        setMirrorErrors,
        uploadQueue
      ]
    )

    // Queue retry mechanism
    useEffect(() => {
      console.log(`[FileUpload] Queue retry mechanism triggered`, {
        uploadQueue,
        correspondingMediaOption
      })
      const retryQueuedUploads = async () => {
        const queuedFiles = Object.keys(uploadQueue)
        if (queuedFiles.length === 0) return

        console.log(
          `[FileUpload] Retry mechanism triggered. Queued files: ${queuedFiles.length}`,
          {
            stage,
            isLoading,
            popupOpen,
            simple,
            correspondingMediaOptionType: correspondingMediaOption.type
          }
        )

        let retryAttempts = 0

        for (const hash of queuedFiles) {
          const queueInfo = uploadQueue[hash]
          const timeInQueue = Date.now() - queueInfo.timestamp

          console.log(`[FileUpload] Processing queue entry for hash ${hash}:`, {
            timeInQueue,
            retryCount: queueInfo.retryCount,
            hasToken: !!queueInfo.token,
            retryInProgress: retryInProgress[hash]
          })

          // No max retry limit - keep trying until server has space available

          // Only retry if it's been at least 5 seconds and no retry is in progress
          // And ensure we're not in a stage that might interfere with retries
          // And ensure the popup is open for non-simple uploads
          if (
            timeInQueue > 5000 &&
            !retryInProgress[hash] &&
            stage !== 'scan' &&
            (simple || popupOpen)
          ) {
            console.log(`[FileUpload] Attempting retry for hash ${hash}`)
            retryAttempts++

            // Mark retry as in progress
            setRetryInProgress((prev) => ({ ...prev, [hash]: true }))

            try {
              const imageController = new ImageController(
                correspondingMediaOption
              )

              if (correspondingMediaOption.type === 'degmods-server') {
                const degmodsServer = imageController
                if (
                  degmodsServer.retryWithQueueToken &&
                  degmodsServer.getMediaUrl &&
                  degmodsServer.auth
                ) {
                  // Find the file by hash using the hash mapping
                  const file = fileHashMap[hash]
                  if (file && queueInfo.token) {
                    console.log(
                      `[FileUpload] Retrying upload with queue token for hash ${hash}`
                    )

                    const mediaUrl = degmodsServer.getMediaUrl()
                    // Use cached signed event if available to avoid re-signing
                    let auth = queueInfo.auth || null
                    if (!auth) {
                      auth = await degmodsServer.auth(
                        hash,
                        queueInfo.cachedSignedEvent
                      )
                    }
                    const response = await degmodsServer.retryWithQueueToken(
                      mediaUrl,
                      auth,
                      file,
                      queueInfo.token
                    )

                    console.log(
                      `[FileUpload] Retry successful for hash ${hash}, response:`,
                      response
                    )

                    // Success - remove from queue and file mapping, add to results
                    console.log(
                      `[FileUpload] Retry successful, clearing queue for hash ${hash}`
                    )
                    setUploadQueue((prev) => {
                      const newQueue = { ...prev }
                      delete newQueue[hash]
                      return newQueue
                    })
                    setFileHashMap((prev) => {
                      const newMap = { ...prev }
                      delete newMap[hash]
                      return newMap
                    })
                    setRetryInProgress((prev) => {
                      const newRetry = { ...prev }
                      delete newRetry[hash]
                      return newRetry
                    })

                    // Add to uploaded results
                    const url = response || ''
                    if (url) {
                      setUploadedUrls((prev) => [...prev, url])
                      setUploadedHashes((prev) => [...prev, hash])

                      // Also update the filename mapping for the successfully uploaded file
                      const fileName = file.name
                      setUploadedFilenames((prev) => ({
                        ...prev,
                        [fileName]: hash
                      }))

                      console.log(
                        `[FileUpload] Queue retry successful - added file to results: ${fileName}`
                      )
                    }

                    // Check if all queued files are now processed
                    const remainingQueuedFiles = Object.keys(
                      uploadQueue
                    ).filter((queuedHash) => queuedHash !== hash)

                    console.log(
                      `[FileUpload] Queue status: ${remainingQueuedFiles.length} files remaining in queue`
                    )

                    if (
                      remainingQueuedFiles.length === 0 &&
                      stage === 'queued'
                    ) {
                      // All queued files processed, move to next stage
                      console.log(
                        `[FileUpload] All queued files processed, transitioning from queue stage`
                      )
                      const imageController = new ImageController(
                        correspondingMediaOption
                      )
                      if (imageController.scan) {
                        console.log(
                          `[FileUpload] Moving to scan stage after queue completion`
                        )
                        setStage('scan')
                      } else {
                        console.log(
                          `[FileUpload] Moving to mirrors stage after queue completion`
                        )
                        setStage('mirrors')
                      }
                    }
                  } else {
                    console.warn(
                      `[FileUpload] Missing file or token for retry:`,
                      {
                        hasFile: !!file,
                        hasToken: !!queueInfo.token,
                        hash
                      }
                    )
                    // Clear retry in progress if we can't retry
                    setRetryInProgress((prev) => {
                      const newRetry = { ...prev }
                      delete newRetry[hash]
                      return newRetry
                    })
                  }
                } else {
                  console.warn(
                    `[FileUpload] Degmods server missing required methods for retry`
                  )
                  // Clear retry in progress if server doesn't support retry
                  setRetryInProgress((prev) => {
                    const newRetry = { ...prev }
                    delete newRetry[hash]
                    return newRetry
                  })
                }
              } else {
                console.warn(
                  `[FileUpload] Server type ${correspondingMediaOption.type} doesn't support queue retry`
                )
                // Clear retry in progress for unsupported server types
                setRetryInProgress((prev) => {
                  const newRetry = { ...prev }
                  delete newRetry[hash]
                  return newRetry
                })
              }
            } catch (error) {
              console.error(
                `[FileUpload] Retry failed for hash ${hash}:`,
                error
              )

              if (
                error instanceof BaseError &&
                (error.message === DegmodsErrorType.UPLOAD_QUEUE_FULL ||
                  error.message === DegmodsErrorType.UPLOAD_QUEUE_POSITION)
              ) {
                // Update queue position and preserve token
                const context = error.context as QueueContext
                const position = context?.position
                const queueToken =
                  context?.queueToken || queueInfo.token || null

                console.log(
                  `[FileUpload] Queue position updated for hash ${hash}:`,
                  {
                    position,
                    hasNewToken: !!context?.queueToken,
                    retryCount: queueInfo.retryCount + 1
                  }
                )

                setUploadQueue((prev) => ({
                  ...prev,
                  [hash]: {
                    ...prev[hash],
                    token: queueToken,
                    position,
                    retryCount: prev[hash].retryCount + 1,
                    cachedSignedEvent: prev[hash].cachedSignedEvent, // Preserve the cached signed event
                    auth: prev[hash].auth,
                    timestamp: Date.now() // Reset timestamp on retry
                  }
                }))
                // Clear retry in progress flag for queue position updates
                setRetryInProgress((prev) => {
                  const newRetry = { ...prev }
                  delete newRetry[hash]
                  return newRetry
                })
              } else {
                console.error(
                  `[FileUpload] Non-queue error during retry, removing from queue:`,
                  error
                )
                // Remove from queue and file mapping on other errors
                console.log(
                  `[FileUpload] Clearing queue due to non-queue error for hash ${hash}`
                )
                setUploadQueue((prev) => {
                  const newQueue = { ...prev }
                  delete newQueue[hash]
                  return newQueue
                })
                setFileHashMap((prev) => {
                  const newMap = { ...prev }
                  delete newMap[hash]
                  return newMap
                })
                setRetryInProgress((prev) => {
                  const newRetry = { ...prev }
                  delete newRetry[hash]
                  return newRetry
                })
                errorFeedback(error)
              }
            }
          } else {
            console.log(`[FileUpload] Skipping retry for hash ${hash}:`, {
              timeInQueue,
              retryInProgress: retryInProgress[hash],
              isLoading,
              stage,
              popupOpen,
              simple,
              willRetry:
                timeInQueue > 5000 &&
                !retryInProgress[hash] &&
                !isLoading &&
                stage !== 'scan' &&
                (simple || popupOpen)
            })
          }
        }

        if (queuedFiles.length > 0 && retryAttempts === 0) {
          console.log(
            `[FileUpload] No retry attempts made despite having queued files`
          )
        }
      }

      const interval = setInterval(retryQueuedUploads, 5000) // Retry every 5 seconds
      return () => clearInterval(interval)
    }, [
      uploadQueue,
      correspondingMediaOption,
      fileHashMap,
      retryInProgress,
      uploadedFilenames,
      isLoading,
      stage,
      popupOpen,
      simple
    ])

    useEffect(() => {
      console.log(`[FileUpload] Stage:`, stage)
    }, [stage])

    const handleDrop = useCallback(
      (acceptedFiles: File[], fileRejections: FileRejection[]) => {
        if (simple) {
          handleUpload(acceptedFiles)
        } else {
          // Only open popup if there are no file rejections
          if (fileRejections.length === 0) {
            setPopupOpen(true)
            setCachedFiles(acceptedFiles)
          }
        }
      },
      [handleUpload, simple, setCachedFiles]
    )
    const {
      getRootProps,
      getInputProps,
      isDragActive,
      acceptedFiles,
      isFileDialogActive,
      isDragAccept,
      isDragReject,
      fileRejections
    } = useDropzone({
      ...MEDIA_DROPZONE_OPTIONS,
      maxSize: maxSize || MEDIA_DROPZONE_OPTIONS.maxSize,
      accept: accept || MEDIA_DROPZONE_OPTIONS.accept,
      onDrop: handleDrop,
      multiple: multiple
    })

    useEffect(() => {
      let scanInterval: NodeJS.Timeout | null = null

      if (stage === 'scan' && uploadedHashes.length && isLoading) {
        console.log(
          `[FileUpload] Starting scan process for ${uploadedHashes.length} files`
        )

        const scan = async () => {
          const results: string[] = []
          let allScansFound = true
          let scannedCount = 0

          // Use uploadedHashes instead of acceptedFiles to ensure we only scan successfully uploaded files
          for (let i = 0; i < uploadedHashes.length; i++) {
            const hash = uploadedHashes[i]
            const imageController = new ImageController(
              correspondingMediaOption
            )

            console.log(
              `[FileUpload] Scanning file ${i + 1}/${uploadedHashes.length} with hash: ${hash}`
            )

            const response = imageController.scan
              ? await imageController.scan(hash)
              : undefined

            if (response) {
              results.push(response)

              // Check if this response has a "scan" key
              try {
                const parsedResult = JSON.parse(response)
                if (parsedResult.scanned) {
                  scannedCount++
                  console.log(
                    `[FileUpload] File ${i + 1}/${uploadedHashes.length} scan completed`
                  )
                } else {
                  allScansFound = false
                  console.log(
                    `[FileUpload] File ${i + 1}/${uploadedHashes.length} scan still in progress`
                  )
                }
              } catch (parseError) {
                console.warn(
                  `[FileUpload] Failed to parse scan response for file ${i + 1}:`,
                  parseError
                )
                allScansFound = false
              }
            } else {
              allScansFound = false
              console.log(
                `[FileUpload] File ${i + 1}/${uploadedHashes.length} scan not available yet`
              )
            }
          }

          console.log(
            `[FileUpload] Scan progress: ${scannedCount}/${uploadedHashes.length} files scanned, all found: ${allScansFound}`
          )

          // Only proceed to mirrors stage if all scans have been found
          if (allScansFound && results.length === uploadedHashes.length) {
            const scanResults: ScanResult[] = results.map((result, index) => {
              try {
                const parsedResult = JSON.parse(result)

                if (!parsedResult.scanned) {
                  return {
                    success: false,
                    result: 'Unknown error occurred'
                  }
                }

                return {
                  success: parsedResult.scanned.success === 1,
                  result: parsedResult.scanned.result
                }
              } catch (parseError) {
                console.warn(
                  `[FileUpload] Failed to parse scan result ${index + 1}:`,
                  parseError
                )
                return {
                  success: false,
                  result: 'Failed to parse scan result'
                }
              }
            })

            console.log(
              `[FileUpload] All ${uploadedHashes.length} files scanned, proceeding to mirrors stage`
            )

            onChange(uploadedUrls)
            setStage('mirrors')
            onUploadComplete?.({ urls: uploadedUrls, hashes: uploadedHashes })

            const hasScanErrors = scanResults.some((result) => !result.success)

            if (hasScanErrors) {
              const errorMessages = scanResults
                .filter((result) => !result.success)
                .map((result, index) => `File ${index + 1}: ${result.result}`)
                .join('\n')

              setScanError(errorMessages)
              console.warn(`[FileUpload] Scan errors detected:`, errorMessages)
              // Still add the URLs to the form field even if scan fails
              // Set loading to false since we're not proceeding to mirrors
              setIsLoading(false)
              return
            }

            const hasAllScanned = scanResults.every((result) => result.success)

            if (hasAllScanned) {
              setIsScanned(true)
              setScanError(null)
              console.log(
                `[FileUpload] All ${uploadedHashes.length} files passed scanning`
              )
            }
          }
          // If not all scans found, continue polling (don't clear interval)
        }

        scanInterval = setInterval(scan, 5000)
      }

      return () => {
        if (scanInterval) {
          clearInterval(scanInterval)
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      hostMirrors.mainHost,
      stage,
      uploadedHashes.length,
      isLoading,
      onChange
    ])

    useEffect(() => {
      const mirrorCompleted: Record<string, boolean> = {}

      if (stage === 'mirrors' && uploadedUrls.length && isLoading) {
        console.log(
          `[FileUpload] Starting mirror process for ${uploadedUrls.length} files`
        )

        const allMirrors = [...defaultHostMirrors, ...hostMirrors.mirrors]
        const activeMirrors = allMirrors.filter((mirror) => mirror.isActive)

        if (activeMirrors.length === 0) {
          console.log(
            `[FileUpload] No active mirrors to process, completing upload`
          )
          // No mirrors to process, so we're done
          setIsLoading(false)
          return
        }

        console.log(
          `[FileUpload] Found ${activeMirrors.length} active mirrors to process`
        )

        const uploadMirrors = async (fileHash: string) => {
          const imageController = new ImageController(correspondingMediaOption)

          if (!imageController.uploadMirrors) {
            return
          }

          await imageController.uploadMirrors(
            fileHash,
            activeMirrors.map((mirror) => mirror.url)
          )
        }

        const startMirrors = async () => {
          let completedMirrors = 0
          const totalMirrorOperations =
            activeMirrors.filter(
              (mirror) => mirror.url !== hostMirrors.mainHost
            ).length * uploadedUrls.length

          console.log(
            `[FileUpload] Total mirror operations expected: ${totalMirrorOperations}`
          )

          // Create mirror operation functions (but don't execute them yet)
          const mirrorOperations: (() => Promise<void>)[] = []

          for (let m = 0; m < activeMirrors.length; m++) {
            const mirror = activeMirrors[m]

            if (mirror.url === hostMirrors.mainHost) {
              console.log(
                `[FileUpload] Skipping main host mirror: ${mirror.url}`
              )
              continue
            }

            console.log(
              `[FileUpload] Preparing mirror ${m + 1}/${activeMirrors.length}: ${mirror.url}`
            )

            const mirrorMediaOption = MEDIA_OPTIONS.find(
              (mo) => mo.host === mirror.url
            ) || {
              name: mirror.url,
              host: mirror.url,
              type: 'degmods-server' as const
            }

            // Create a function that will process all files for this mirror sequentially
            const mirrorOperation = async () => {
              console.log(
                `[FileUpload] Processing ${uploadedUrls.length} files sequentially for mirror: ${mirror.url}`
              )

              // Process files sequentially for this mirror
              for (let i = 0; i < uploadedUrls.length; i++) {
                const url = uploadedUrls[i]
                const hash = uploadedHashes[i]
                const fileIndex = i

                const mirrorProcessStartTime = performance.now()
                console.log(
                  `[FileUpload] Mirroring file ${fileIndex + 1}/${uploadedUrls.length} to ${mirror.url}`
                )
                console.log(`[FileUpload] Mirror details:`, {
                  fileIndex: fileIndex + 1,
                  totalFiles: uploadedUrls.length,
                  fileName: uploadedFilenames[hash] || 'unknown',
                  hash: hash,
                  sourceUrl: url,
                  mirrorUrl: mirror.url,
                  mirrorName: (mirror as { name?: string }).name || mirror.url,
                  mirrorType: mirrorMediaOption.type
                })

                const imageController = new ImageController(mirrorMediaOption)

                if (!hash || !imageController.mirror || !imageController.head) {
                  console.warn(
                    `[FileUpload] Skipping mirror for file ${fileIndex + 1} - missing hash or mirror methods`
                  )
                  completedMirrors++
                  continue
                }

                if (mirrorCompleted[`${mirror.url}-${hash}`]) {
                  console.log(
                    `[FileUpload] Mirror already completed for ${mirror.url}-${hash}`
                  )
                  continue
                }

                const mirrorKey = `${mirror.url}-file-${fileIndex + 1}`

                setMirrorStatus((prev) => ({
                  ...prev,
                  [mirrorKey]: 'loading'
                }))

                let status: MirrorStatus = 'error'
                let errorMessage = 'Unknown error occurred'

                try {
                  const abortController = new AbortController()
                  const timeoutId = setTimeout(() => {
                    abortController.abort()
                  }, 15000) // Increased timeout to 15 seconds

                  // First check if the file exists using HEAD request
                  console.log(
                    `[FileUpload] Checking if file exists on ${mirror.url} using HEAD request...`
                  )
                  const headStartTime = performance.now()
                  let headStatus: string = 'error'
                  try {
                    headStatus = await imageController.head(
                      hash,
                      abortController.signal
                    )
                    const headEndTime = performance.now()
                    console.log(
                      `[FileUpload] HEAD request completed: ${headStatus} (took ${headEndTime - headStartTime}ms)`
                    )
                  } catch (headError) {
                    const headEndTime = performance.now()
                    // HEAD request failure is not critical, continue with mirror attempt
                    console.log(
                      `[FileUpload] HEAD request failed for ${mirror.url} (took ${headEndTime - headStartTime}ms), proceeding with mirror attempt:`,
                      headError
                    )
                  }

                  // Only proceed with mirror if HEAD request fails (file doesn't exist)
                  if (headStatus !== 'success') {
                    console.log(
                      `[FileUpload] File doesn't exist on ${mirror.url}, proceeding with mirror...`
                    )
                    const mirrorStartTime = performance.now()
                    try {
                      status = (await imageController.mirror(
                        url,
                        hash,
                        abortController.signal
                      )) as MirrorStatus
                      const mirrorEndTime = performance.now()
                      console.log(
                        `[FileUpload] Mirror result for file ${fileIndex + 1} to ${mirror.url}: ${status} (took ${mirrorEndTime - mirrorStartTime}ms)`
                      )
                    } catch (mirrorError) {
                      const mirrorEndTime = performance.now()
                      console.error(
                        `[FileUpload] Mirror failed for file ${fileIndex + 1} to ${mirror.url} (took ${mirrorEndTime - mirrorStartTime}ms):`,
                        mirrorError
                      )
                      if (mirrorError instanceof Error) {
                        errorMessage = `Mirror request failed: ${mirrorError.message}`
                      } else {
                        errorMessage = 'Mirror request failed: Unknown error'
                      }
                      throw mirrorError
                    }
                  } else {
                    status = 'success' // File exists, skip mirroring
                    console.log(
                      `[FileUpload] File ${fileIndex + 1} already exists on ${mirror.url}, skipping mirror`
                    )
                  }

                  clearTimeout(timeoutId)
                } catch (error) {
                  const mirrorProcessEndTime = performance.now()
                  console.error(
                    `[FileUpload] Mirror process failed for file ${fileIndex + 1} to ${mirror.url} (total time: ${mirrorProcessEndTime - mirrorProcessStartTime}ms)`
                  )

                  if (error instanceof Error) {
                    if (error.name === 'AbortError') {
                      errorMessage = 'Request timed out after 15 seconds'
                      console.error(
                        `[FileUpload] Mirror timed out after 15 seconds`
                      )
                    } else {
                      // Use the error message we set above, or fallback to the error's message
                      if (errorMessage === 'Unknown error occurred') {
                        errorMessage = error.message || 'Network error occurred'
                      }
                    }
                  } else {
                    errorMessage = 'Unknown error occurred'
                  }
                  status = 'error'
                  console.error(
                    `[FileUpload] Mirror error for file ${fileIndex + 1} to ${mirror.url}:`,
                    errorMessage
                  )
                }

                // Always update status and mark as completed, even on error
                const mirrorProcessEndTime = performance.now()
                console.log(
                  `[FileUpload] Mirror process completed for file ${fileIndex + 1} to ${mirror.url}: ${status} (total time: ${mirrorProcessEndTime - mirrorProcessStartTime}ms)`
                )

                setMirrorStatus((prev) => ({
                  ...prev,
                  [mirrorKey]: status
                }))

                // Store error message if status is error
                if (status === 'error') {
                  setMirrorErrors((prev) => ({
                    ...prev,
                    [mirrorKey]: {
                      message: errorMessage,
                      timestamp: Date.now()
                    }
                  }))
                } else {
                  // Clear error if status is not error
                  setMirrorErrors((prev) => {
                    const newErrors = { ...prev }
                    delete newErrors[mirrorKey]
                    return newErrors
                  })
                }

                // CRITICAL: Always mark as completed regardless of success/failure
                mirrorCompleted[`${mirror.url}-${hash}`] = true
                completedMirrors++

                console.log(
                  `[FileUpload] Mirror operation completed (${status}) for file ${fileIndex + 1} to ${mirror.url}. Progress: ${completedMirrors}/${totalMirrorOperations}`
                )

                // Add delay between files within the same mirror (except for the last file)
                if (i < uploadedUrls.length - 1) {
                  console.log(
                    `[FileUpload] Adding 500ms delay before next file for mirror ${mirror.url}`
                  )
                  await new Promise((resolve) => setTimeout(resolve, 500))
                }
              }

              console.log(
                `[FileUpload] Completed all ${uploadedUrls.length} files for mirror: ${mirror.url}`
              )
            }

            mirrorOperations.push(mirrorOperation)
          }

          // Execute mirror operations sequentially with delays
          try {
            console.log(
              `[FileUpload] Executing ${mirrorOperations.length} mirror operations sequentially`
            )

            for (let i = 0; i < mirrorOperations.length; i++) {
              const mirrorOperation = mirrorOperations[i]
              console.log(
                `[FileUpload] Executing mirror operation ${i + 1}/${mirrorOperations.length}`
              )

              await mirrorOperation()

              // Add delay between mirror operations (except for the last one)
              if (i < mirrorOperations.length - 1) {
                console.log(
                  `[FileUpload] Adding 1 second delay before next mirror operation`
                )
                await new Promise((resolve) => setTimeout(resolve, 1000))
              }
            }

            console.log(
              `[FileUpload] All mirror operations finished sequentially. Completed: ${completedMirrors}/${totalMirrorOperations}`
            )
          } catch (error) {
            console.error(
              `[FileUpload] Error in sequential mirror operations:`,
              error
            )
          } finally {
            // Always complete the loading state
            console.log(
              `[FileUpload] Mirror stage completed, setting loading to false`
            )
            setIsLoading(false)
          }
        }

        // Process uploadMirrors sequentially for each hash, then start mirrors
        const processUploadMirrors = async () => {
          console.log(
            `[FileUpload] Processing uploadMirrors sequentially for ${uploadedHashes.length} files`
          )

          for (let i = 0; i < uploadedHashes.length; i++) {
            const hash = uploadedHashes[i]
            console.log(
              `[FileUpload] Processing uploadMirrors for file ${i + 1}/${uploadedHashes.length} (hash: ${hash})`
            )

            await uploadMirrors(hash)

            // Add delay between uploadMirrors calls (except for the last one)
            if (i < uploadedHashes.length - 1) {
              console.log(
                `[FileUpload] Adding 500ms delay before next uploadMirrors call`
              )
              await new Promise((resolve) => setTimeout(resolve, 500))
            }
          }

          console.log(
            `[FileUpload] Completed uploadMirrors for all ${uploadedHashes.length} files, starting mirror operations`
          )

          await startMirrors()
        }

        processUploadMirrors()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage, uploadedUrls.length, isLoading])

    useEffect(() => {
      if (!popupOpen) {
        console.log(`[FileUpload] Popup closed, resetting upload state`)
        setStage('host')
        setUploadedUrls([])
        setUploadedHashes([])
        setUploadedFilenames({})
        setMirrorStatus({})
        setMirrorErrors({})
        setIsScanned(false)
        setScanError(null)
        // Also clear any queue state
        setUploadQueue({})
        setFileHashMap({})
        setRetryInProgress({})
      }
    }, [
      popupOpen,
      setStage,
      setUploadedUrls,
      setUploadedHashes,
      setMirrorStatus,
      setMirrorErrors
    ])

    useEffect(() => {
      if (simple) {
        // For simple uploads, use the hostMirrors.mainHost if available
        setMediaOption(
          MEDIA_OPTIONS.find((mo) => mo.host === hostMirrors.mainHost) ||
            MEDIA_OPTIONS[0]
        )
      } else {
        // For non-simple uploads, always use the domain-based default
        setMediaOption(getDefaultMediaOption())
      }
    }, [hostMirrors.mainHost, simple, getDefaultMediaOption])

    // Debug effect to monitor upload queue changes
    useEffect(() => {
      const queueKeys = Object.keys(uploadQueue)
      if (queueKeys.length > 0) {
        console.log(`[FileUpload] Upload queue state changed:`, {
          queueSize: queueKeys.length,
          queueEntries: queueKeys.map((hash) => ({
            hash,
            retryCount: uploadQueue[hash].retryCount,
            hasToken: !!uploadQueue[hash].token,
            position: uploadQueue[hash].position,
            timeInQueue: Date.now() - uploadQueue[hash].timestamp
          }))
        })
      }
    }, [uploadQueue])

    // Cleanup effect for component unmount
    useEffect(() => {
      return () => {
        console.log(
          `[FileUpload] Component unmounting, clearing all queue state`
        )
        // Clear all queue and file mappings on unmount
        setUploadQueue({})
        setFileHashMap({})
        setRetryInProgress({})
      }
    }, [])

    const dropzoneLabel = useMemo(() => {
      const fileText = multiple ? 'files' : 'file'
      return isFileDialogActive
        ? `Select ${fileText} in dialog`
        : isDragActive
          ? isDragAccept
            ? `Drop the ${fileText} here...`
            : isDragReject
              ? `Drop the ${fileText} here (one or more unsupported types)...`
              : `Drop the ${fileText} here...`
          : defaultDropzoneLabel || `Click or drag ${fileText} here`
    }, [
      isDragAccept,
      isDragActive,
      isDragReject,
      isFileDialogActive,
      defaultDropzoneLabel,
      multiple
    ])

    return (
      <div aria-label="upload featuredFileUrl" className="uploadBoxMain">
        {popupOpen && !simple && (
          <FileUploadPopup
            loading={isLoading}
            stage={stage}
            title="Host & Mirrors"
            files={cachedFiles}
            uploadedFilenames={uploadedFilenames}
            uploadedHashes={uploadedHashes}
            onClose={() => setPopupOpen(false)}
            onSetHostMirrors={setHostMirrors}
            onSetDefaultHostMirrors={setDefaultHostMirrors}
            mainHost={hostMirrors.mainHost}
            defaultMirrors={defaultHostMirrors}
            mirrors={hostMirrors.mirrors}
            mirrorStatus={mirrorStatus}
            mirrorErrors={mirrorErrors}
            onUpload={() => handleUpload(cachedFiles)}
            onReset={() => {
              console.log(`[FileUpload] Manual reset triggered`)
              setStage('host')
              setUploadedUrls([])
              setUploadedHashes([])
              setUploadedFilenames({})
              setMirrorStatus({})
              setMirrorErrors({})
              setIsScanned(false)
              setScanError(null)
              setUploadQueue({})
              setFileHashMap({})
              setRetryInProgress({})
              setIsLoading(false)
            }}
            supportsScanning={(() => {
              const imageController = new ImageController(
                correspondingMediaOption
              )
              return !!imageController.scan
            })()}
            scanned={isScanned}
            scanError={scanError}
            onClearScanError={clearScanError}
            uploadQueue={uploadQueue}
          />
        )}
        <MediaInputPopover
          acceptedFiles={acceptedFiles}
          fileRejections={fileRejections}
        />
        <div className="uploadBoxMainInside" {...getRootProps()} tabIndex={-1}>
          <input id="featuredFileUrl-upload" {...getInputProps()} />
          <span>{dropzoneLabel}</span>
          {simple && (
            <div
              className="FiltersMainElement"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dropdown dropdownMain">
                <button
                  className="btn dropdown-toggle btnMain btnMainDropdown"
                  aria-expanded="false"
                  data-bs-toggle="dropdown"
                  type="button"
                >
                  File Host: {mediaOption.name}
                </button>
                <div className="dropdown-menu dropdownMainMenu">
                  {MEDIA_OPTIONS.map((mo) => {
                    return (
                      <div
                        key={mo.host}
                        onClick={handleOptionChange(mo)}
                        className="dropdown-item dropdownMainMenuItem"
                      >
                        {mo.name}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          {isLoading && (
            <div className={styles.spinner}>
              <Spinner />
            </div>
          )}
        </div>
      </div>
    )
  }
)
