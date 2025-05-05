import * as Popover from '@radix-ui/react-popover'
import { v4 as uuidv4 } from 'uuid'
import { useMemo } from 'react'
import { FileRejection, FileWithPath } from 'react-dropzone'
import { MediaInputError } from './MediaInputError'
import { InputSuccess } from './Success'
import styles from './MediaInputPopover.module.scss'

interface MediaInputPopoverProps {
  acceptedFiles: readonly FileWithPath[]
  fileRejections: readonly FileRejection[]
}

export const MediaInputPopover = ({
  acceptedFiles,
  fileRejections
}: MediaInputPopoverProps) => {
  const uuid = useMemo(() => uuidv4(), [])
  const acceptedFileItems = useMemo(
    () =>
      acceptedFiles.map((file) => (
        <InputSuccess
          key={file.path}
          message={`${file.path} - ${file.size} bytes`}
        />
      )),
    [acceptedFiles]
  )
  const fileRejectionItems = useMemo(() => {
    const id = `errors-${uuid}`
    return (
      <div
        className={`accordion accordion-flush ${styles.mediaInputError}`}
        role="tablist"
        id={id}
      >
        {fileRejections.map(({ file, errors }, index) => (
          <MediaInputError
            rootId={id}
            index={index}
            key={file.path}
            message={`${file.path} - ${file.size} bytes`}
            errors={errors}
          />
        ))}
      </div>
    )
  }, [fileRejections, uuid])

  if (acceptedFiles.length === 0 && fileRejections.length === 0) return null

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <div className={styles.trigger}>
          {acceptedFiles.length > 0 ? (
            <svg
              width="1.5em"
              height="1.5em"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 576 512"
            >
              <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 38.6C310.1 219.5 256 287.4 256 368c0 59.1 29.1 111.3 73.7 143.3c-3.2 .5-6.4 .7-9.7 .7L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128zM288 368a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm211.3-43.3c-6.2-6.2-16.4-6.2-22.6 0L416 385.4l-28.7-28.7c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6l40 40c6.2 6.2 16.4 6.2 22.6 0l72-72c6.2-6.2 6.2-16.4 0-22.6z" />
            </svg>
          ) : (
            <svg
              width="1.5em"
              height="1.5em"
              fill="tomato"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 576 512"
            >
              <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 38.6C310.1 219.5 256 287.4 256 368c0 59.1 29.1 111.3 73.7 143.3c-3.2 .5-6.4 .7-9.7 .7L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128zm48 96a144 144 0 1 1 0 288 144 144 0 1 1 0-288zm0 240a24 24 0 1 0 0-48 24 24 0 1 0 0 48zm0-192c-8.8 0-16 7.2-16 16l0 80c0 8.8 7.2 16 16 16s16-7.2 16-16l0-80c0-8.8-7.2-16-16-16z" />
            </svg>
          )}
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.popover} sideOffset={5}>
          <div className="popUpMainCardTop">
            <div className="popUpMainCardTopInfo">
              <h3>Selected files</h3>
            </div>
            <Popover.Close asChild aria-label="Close">
              <div className="popUpMainCardTopClose">
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
            </Popover.Close>
          </div>
          <div className={styles.content}>
            {acceptedFileItems}
            {fileRejectionItems}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
