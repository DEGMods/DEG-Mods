import React, { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useCellValues, usePublisher } from '@mdxeditor/gurx'
import {
  closeImageDialog$,
  editorRootElementRef$,
  imageDialogState$,
  imageUploadHandler$,
  saveImage$
} from '@mdxeditor/editor'
import styles from './Dialog.module.scss'
import { createPortal } from 'react-dom'

interface ImageFormFields {
  src: string
  title: string
  altText: string
  file: FileList
}

export const ImageDialog: React.FC = () => {
  const [state, editorRootElementRef, imageUploadHandler] = useCellValues(
    imageDialogState$,
    editorRootElementRef$,
    imageUploadHandler$
  )
  const saveImage = usePublisher(saveImage$)
  const closeImageDialog = usePublisher(closeImageDialog$)
  const { register, handleSubmit, setValue, reset } = useForm<ImageFormFields>({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    values: state.type === 'editing' ? (state.initialValues as any) : {}
  })
  const [open, setOpen] = useState(state.type !== 'inactive')

  useEffect(() => {
    setOpen(state.type !== 'inactive')
  }, [state.type])

  useEffect(() => {
    if (!open) {
      closeImageDialog()
      reset({ src: '', title: '', altText: '' })
    }
  }, [closeImageDialog, open, reset])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  if (!open) return null
  if (!editorRootElementRef?.current) return null

  return createPortal(
    <div className='popUpMain'>
      <div className='ContainerMain'>
        <div className='popUpMainCardWrapper'>
          <div className='popUpMainCard popUpMainCardQR'>
            <div className='popUpMainCardTop'>
              <div className='popUpMainCardTopInfo'>
                <h3>Add an image</h3>
              </div>
              <div className='popUpMainCardTopClose' onClick={handleClose}>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='-96 0 512 512'
                  width='1em'
                  height='1em'
                  fill='currentColor'
                  style={{ zIndex: 1 }}
                >
                  <path d='M310.6 361.4c12.5 12.5 12.5 32.75 0 45.25C304.4 412.9 296.2 416 288 416s-16.38-3.125-22.62-9.375L160 301.3L54.63 406.6C48.38 412.9 40.19 416 32 416S15.63 412.9 9.375 406.6c-12.5-12.5-12.5-32.75 0-45.25l105.4-105.4L9.375 150.6c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L160 210.8l105.4-105.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-105.4 105.4L310.6 361.4z'></path>
                </svg>
              </div>
            </div>
            <div className='pUMCB_Zaps'>
              <form
                className='pUMCB_ZapsInside'
                onSubmit={(e) => {
                  void handleSubmit(saveImage)(e)
                  reset({ src: '', title: '', altText: '' })
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                {imageUploadHandler === null ? (
                  <input type='hidden' accept='image/*' {...register('file')} />
                ) : (
                  <div className='inputLabelWrapperMain'>
                    <label className='form-label labelMain' htmlFor='file'>
                      Upload an image from your device:
                    </label>
                    <input type='file' accept='image/*' {...register('file')} />
                  </div>
                )}

                <div className='inputLabelWrapperMain'>
                  <label className='form-label labelMain' htmlFor='src'>
                    {imageUploadHandler !== null
                      ? 'Or add an image from an URL:'
                      : 'Add an image from an URL:'}
                  </label>
                  <input
                    defaultValue={
                      state.type === 'editing'
                        ? state.initialValues.src ?? ''
                        : ''
                    }
                    className='inputMain'
                    size={40}
                    autoFocus
                    {...register('src')}
                    onChange={(e) => setValue('src', e.currentTarget.value)}
                    placeholder={'Paste an image src'}
                  />
                </div>

                <div className='inputLabelWrapperMain'>
                  <label className='form-label labelMain' htmlFor='alt'>
                    Alt:
                  </label>
                  <input
                    type='text'
                    {...register('altText')}
                    className='inputMain'
                  />
                </div>

                <div className='inputLabelWrapperMain'>
                  <label className='form-label labelMain' htmlFor='title'>
                    Title:
                  </label>
                  <input
                    type='text'
                    {...register('title')}
                    className='inputMain'
                  />
                </div>

                <div className={styles.formAction}>
                  <button
                    type='submit'
                    title={'Save'}
                    aria-label={'Save'}
                    className='btn btnMain btnMainPopup'
                  >
                    Save
                  </button>
                  <button
                    type='reset'
                    title={'Cancel'}
                    aria-label={'Cancel'}
                    className='btn btnMain btnMainPopup'
                    onClick={handleClose}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>,
    editorRootElementRef?.current
  )
}
