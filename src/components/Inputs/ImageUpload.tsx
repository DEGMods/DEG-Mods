import { useDropzone } from 'react-dropzone'
import React, { useCallback, useMemo, useState } from 'react'
import {
  MediaOption,
  MEDIA_OPTIONS,
  ImageController,
  MEDIA_DROPZONE_OPTIONS
} from '../../controllers'
import { errorFeedback } from '../../types'
import { MediaInputPopover } from './MediaInputPopover'
import { Spinner } from 'components/Spinner'
import styles from './ImageUpload.module.scss'

export interface ImageUploadProps {
  multiple?: boolean | undefined
  onChange: (values: string[]) => void
}
export const ImageUpload = React.memo(
  ({ multiple = false, onChange }: ImageUploadProps) => {
    const [isLoading, setIsLoading] = useState(false)
    const [mediaOption, setMediaOption] = useState<MediaOption>(
      MEDIA_OPTIONS[0]
    )
    const handleOptionChange = useCallback(
      (mo: MediaOption) => () => {
        setMediaOption(mo)
      },
      []
    )
    const handleUpload = useCallback(
      async (acceptedFiles: File[]) => {
        if (acceptedFiles.length) {
          try {
            setIsLoading(true)
            const imageController = new ImageController(mediaOption)
            const urls: string[] = []
            for (let i = 0; i < acceptedFiles.length; i++) {
              const file = acceptedFiles[i]
              urls.push(await imageController.post(file))
            }
            onChange(urls)
          } catch (error) {
            errorFeedback(error)
          } finally {
            setIsLoading(false)
          }
        }
      },
      [mediaOption, onChange]
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
      onDrop: handleUpload,
      multiple: multiple
    })

    const dropzoneLabel = useMemo(
      () =>
        isFileDialogActive
          ? 'Select files in dialog'
          : isDragActive
            ? isDragAccept
              ? 'Drop the files here...'
              : isDragReject
                ? 'Drop the files here (one more more unsupported types)...'
                : 'Drop the files here...'
            : 'Click or drag files here',
      [isDragAccept, isDragActive, isDragReject, isFileDialogActive]
    )

    return (
      <div aria-label="upload featuredImageUrl" className="uploadBoxMain">
        <MediaInputPopover
          acceptedFiles={acceptedFiles}
          fileRejections={fileRejections}
        />
        <div className="uploadBoxMainInside" {...getRootProps()} tabIndex={-1}>
          <input id="featuredImageUrl-upload" {...getInputProps()} />
          <span>{dropzoneLabel}</span>
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
                Image Host: {mediaOption.name}
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
