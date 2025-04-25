import _ from 'lodash'
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit
} from 'react-router-dom'
import { FixedSizeList } from 'react-window'
import '../styles/styles.css'
import {
  DownloadUrl,
  ModFormState,
  ModPageLoaderResult,
  ModPermissions,
  MODPERMISSIONS_CONF,
  MODPERMISSIONS_DESC,
  SubmitModActionResult
} from '../types'
import {
  initializeFormState,
  log,
  LogType,
  memoizedNormalizeSearchString,
  MOD_DRAFT_CACHE_KEY,
  normalizeSearchString
} from '../utils'
import { CheckboxField, InputField, InputFieldWithImageUpload } from './Inputs'
import { OriginalAuthor } from './OriginalAuthor'
import { CategoryAutocomplete } from './CategoryAutocomplete'
import { AlertPopup } from './AlertPopup'
import { Editor, EditorRef } from './Markdown/Editor'
import { MEDIA_OPTIONS } from 'controllers'
import { InputError } from './Inputs/Error'
import { ImageUpload } from './Inputs/ImageUpload'
import { useLocalCache } from 'hooks/useLocalCache'
import { toast } from 'react-toastify'
import { useGames } from 'hooks'

export const ModForm = () => {
  const data = useLoaderData() as ModPageLoaderResult
  const mod = data?.mod
  const actionData = useActionData() as SubmitModActionResult
  const formErrors = useMemo(
    () => (actionData?.type === 'validation' ? actionData.error : undefined),
    [actionData]
  )
  const navigation = useNavigation()
  const submit = useSubmit()

  // Enable cache for the new mod
  const isEditing = typeof mod !== 'undefined'
  const [cache, setCache, clearCache] =
    useLocalCache<ModFormState>(MOD_DRAFT_CACHE_KEY)
  const [formState, setFormState] = useState<ModFormState>(
    isEditing ? initializeFormState(mod) : cache ? cache : initializeFormState()
  )

  // Enable backwards compatibility with the mods that used html
  const body = useMemo(() => {
    // Replace the most problematic HTML tags (<br>)
    const fixed = formState.body.replaceAll(/<br>/g, '\r\n')
    return fixed
  }, [formState.body])

  useEffect(() => {
    if (!isEditing) {
      const newCache = _.cloneDeep(formState)

      // Remove aTag, dTag and published_at from cache
      // These are used for editing and try again timeout
      newCache.aTag = ''
      newCache.dTag = ''
      newCache.published_at = 0

      setCache(newCache)
    }
  }, [formState, isEditing, setCache])

  const editorRef = useRef<EditorRef>(null)

  const handleInputChange = useCallback((name: string, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [name]: value
    }))
  }, [])

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target
      setFormState((prevState) => ({
        ...prevState,
        [name]: checked
      }))
    },
    []
  )

  const handleRadioChange = useCallback((name: string, value: boolean) => {
    setFormState((prevState) => ({
      ...prevState,
      [name]: value
    }))
  }, [])

  const addScreenshotUrl = useCallback(() => {
    setFormState((prevState) => ({
      ...prevState,
      screenshotsUrls: [...prevState.screenshotsUrls, '']
    }))
  }, [])

  const removeScreenshotUrl = useCallback((index: number) => {
    setFormState((prevState) => ({
      ...prevState,
      screenshotsUrls: prevState.screenshotsUrls.filter((_, i) => i !== index)
    }))
  }, [])

  const handleScreenshotUrlChange = useCallback(
    (index: number, value: string) => {
      setFormState((prevState) => ({
        ...prevState,
        screenshotsUrls: [
          ...prevState.screenshotsUrls.map((url, i) => {
            if (index === i) return value
            return url
          })
        ]
      }))
    },
    []
  )

  const addDownloadUrl = useCallback(() => {
    setFormState((prevState) => ({
      ...prevState,
      downloadUrls: [
        ...prevState.downloadUrls,
        {
          url: '',
          hash: '',
          signatureKey: '',
          malwareScanLink: '',
          modVersion: '',
          customNote: ''
        }
      ]
    }))
  }, [])

  const removeDownloadUrl = useCallback((index: number) => {
    setFormState((prevState) => ({
      ...prevState,
      downloadUrls: prevState.downloadUrls.filter((_, i) => i !== index)
    }))
  }, [])

  const handleDownloadUrlChange = useCallback(
    (index: number, field: keyof DownloadUrl, value: string) => {
      setFormState((prevState) => ({
        ...prevState,
        downloadUrls: [
          ...prevState.downloadUrls.map((url, i) => {
            if (index === i) url[field] = value
            return url
          })
        ]
      }))
    },
    []
  )
  const [showTryAgainPopup, setShowTryAgainPopup] = useState<boolean>(false)
  useEffect(() => {
    const isTimeout = actionData?.type === 'timeout'
    setShowTryAgainPopup(isTimeout)
    if (isTimeout) {
      setFormState((prev) => ({
        ...prev,
        aTag: actionData.data.aTag,
        dTag: actionData.data.dTag,
        published_at: actionData.data.published_at
      }))
    }
  }, [actionData])
  const handleTryAgainConfirm = useCallback(
    (confirm: boolean) => {
      setShowTryAgainPopup(false)

      // Cancel if not confirmed
      if (!confirm) return
      submit(JSON.stringify(formState), {
        method: isEditing ? 'put' : 'post',
        encType: 'application/json'
      })
    },
    [formState, isEditing, submit]
  )

  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false)
  const handleReset = useCallback(() => {
    setShowConfirmPopup(true)
  }, [])
  const handleResetConfirm = useCallback(
    (confirm: boolean) => {
      setShowConfirmPopup(false)

      // Cancel if not confirmed
      if (!confirm) return

      // Reset fields to the initial or original existing data
      const initialState = initializeFormState(mod)

      // Reset editor
      editorRef.current?.setMarkdown(initialState.body)
      setFormState(initialState)

      // Clear cache
      !isEditing && clearCache()
    },
    [clearCache, isEditing, mod]
  )

  const handlePublish = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      submit(JSON.stringify(formState), {
        method: isEditing ? 'put' : 'post',
        encType: 'application/json'
      })
    },
    [formState, isEditing, submit]
  )

  const extraBoxRef = useRef<HTMLDivElement>(null)
  const handleExtraBoxButtonClick = () => {
    if (extraBoxRef.current) {
      if (extraBoxRef.current.style.display === '') {
        extraBoxRef.current.style.display = 'none'
      } else {
        extraBoxRef.current.style.display = ''
      }
    }
  }

  return (
    <form className='IBMSMSMBS_Write' onSubmit={handlePublish}>
      <GameDropdown
        selected={formState?.game}
        error={formErrors?.game}
        onChange={handleInputChange}
      />

      <InputField
        label='Title'
        placeholder='Return the banana mod'
        name='title'
        value={formState.title}
        error={formErrors?.title}
        onChange={handleInputChange}
      />

      <div className='inputLabelWrapperMain'>
        <label className='form-label labelMain'>Body</label>
        <div className='inputMain'>
          <Editor
            ref={editorRef}
            markdown={body}
            placeholder="Here's what this mod is all about"
            onChange={(md) => {
              handleInputChange('body', md)
            }}
            onError={(payload) => {
              toast.error('Markdown error. Fix manually in the source mode.')
              log(true, LogType.Error, payload.error)
            }}
          />
        </div>
        {typeof formErrors?.body !== 'undefined' && (
          <InputError message={formErrors?.body} />
        )}
        <input
          name='body'
          hidden
          value={encodeURIComponent(formState?.body)}
          readOnly
        />
      </div>

      <InputFieldWithImageUpload
        label='Featured Image URL'
        description={`We recommend to upload images to ${MEDIA_OPTIONS[0].host}`}
        inputMode='url'
        placeholder='Image URL'
        name='featuredImageUrl'
        value={formState.featuredImageUrl}
        error={formErrors?.featuredImageUrl}
        onInputChange={handleInputChange}
      />
      <InputField
        label='Summary'
        type='textarea'
        placeholder='This is a quick description of my mod'
        name='summary'
        value={formState.summary}
        error={formErrors?.summary}
        onChange={handleInputChange}
      />
      <CheckboxField
        label='This mod not safe for work (NSFW)'
        name='nsfw'
        isChecked={formState.nsfw}
        handleChange={handleCheckboxChange}
        type='stylized'
      />
      <CheckboxField
        label='This is a repost of a mod I did not create'
        name='repost'
        isChecked={formState.repost}
        handleChange={handleCheckboxChange}
        type='stylized'
      />
      {formState.repost && (
        <>
          <InputField
            label={
              <span>
                Created by:{' '}
                {<OriginalAuthor value={formState.originalAuthor || ''} />}
              </span>
            }
            type='text'
            placeholder="Original author's name, npub or nprofile"
            name='originalAuthor'
            value={formState.originalAuthor || ''}
            error={formErrors?.originalAuthor}
            onChange={handleInputChange}
          />
        </>
      )}
      <div className='inputLabelWrapperMain'>
        <div className='labelWrapperMain'>
          <label className='form-label labelMain'>Screenshots URLs</label>
          <button
            className='btn btnMain btnMainAdd'
            type='button'
            onClick={addScreenshotUrl}
            title='Add'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-32 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z'></path>
            </svg>
          </button>
        </div>
        <p className='labelDescriptionMain'>
          We recommend to upload images to {MEDIA_OPTIONS[0].host}
        </p>

        <ImageUpload
          multiple={true}
          onChange={(values) => {
            setFormState((prevState) => ({
              ...prevState,
              screenshotsUrls: Array.from(
                new Set([
                  ...prevState.screenshotsUrls.filter((url) => url),
                  ...values
                ])
              )
            }))
          }}
        />

        {formState.screenshotsUrls.map((url, index) => (
          <Fragment key={`screenShot-${index}`}>
            <ScreenshotUrlFields
              index={index}
              url={url}
              onUrlChange={handleScreenshotUrlChange}
              onRemove={removeScreenshotUrl}
            />
            {formErrors?.screenshotsUrls &&
              formErrors?.screenshotsUrls[index] && (
                <InputError message={formErrors?.screenshotsUrls[index]} />
              )}
          </Fragment>
        ))}
        {formState.screenshotsUrls.length === 0 &&
          formErrors?.screenshotsUrls &&
          formErrors?.screenshotsUrls[0] && (
            <InputError message={formErrors?.screenshotsUrls[0]} />
          )}
      </div>
      <InputField
        label='Tags'
        description='Separate each tag with a comma. (Example: tag1, tag2, tag3)'
        placeholder='Tags'
        name='tags'
        value={formState.tags}
        error={formErrors?.tags}
        onChange={handleInputChange}
      />
      <CategoryAutocomplete
        game={formState.game}
        LTags={formState.LTags}
        setFormState={setFormState}
      />
      <div className='inputLabelWrapperMain'>
        <div className='labelWrapperMain'>
          <label className='form-label labelMain'>Download URLs</label>
          <button
            className='btn btnMain btnMainAdd'
            type='button'
            onClick={addDownloadUrl}
            title='Add'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-32 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z'></path>
            </svg>
          </button>
        </div>
        <p className='labelDescriptionMain'>
          You can upload your game mod to Github, as an example, and keep
          updating it there (another option is{' '}
          <a
            href='https://catbox.moe/'
            target='_blank'
            rel='noopener noreferrer'
          >
            catbox.moe
          </a>
          ). Also, it's advisable that you hash your package as well with your
          nostr public key. Malware scan service suggestion:{' '}
          <a
            href='https://virustotal.com'
            target='_blank'
            rel='noopener noreferrer'
          >
            https://virustotal.com
          </a>
        </p>

        {formState.downloadUrls.map((download, index) => (
          <Fragment key={`download-${index}`}>
            <DownloadUrlFields
              index={index}
              title={download.title}
              url={download.url}
              hash={download.hash}
              signatureKey={download.signatureKey}
              malwareScanLink={download.malwareScanLink}
              modVersion={download.modVersion}
              customNote={download.customNote}
              mediaUrl={download.mediaUrl}
              onUrlChange={handleDownloadUrlChange}
              onRemove={removeDownloadUrl}
            />
            {formErrors?.downloadUrls && formErrors?.downloadUrls[index] && (
              <InputError message={formErrors?.downloadUrls[index]} />
            )}
          </Fragment>
        ))}
        {formState.downloadUrls.length === 0 &&
          formErrors?.downloadUrls &&
          formErrors?.downloadUrls[0] && (
            <InputError message={formErrors?.downloadUrls[0]} />
          )}
      </div>
      <div className='IBMSMSMBSSExtra'>
        <button
          className='btn btnMain IBMSMSMBSSExtraBtn'
          type='button'
          onClick={handleExtraBoxButtonClick}
        >
          Permissions &amp; Details
        </button>
        <div
          className='IBMSMSMBSSExtraBox'
          ref={extraBoxRef}
          style={{
            display: 'none'
          }}
        >
          <p
            className='labelDescriptionMain'
            style={{ marginBottom: `10px`, textAlign: `center` }}
          >
            What permissions users have with your published mod/post
          </p>
          <div className='IBMSMSMBSSExtraBoxElementWrapper'>
            {Object.keys(MODPERMISSIONS_CONF).map((k) => {
              const permKey = k as keyof ModPermissions
              const confKey = k as keyof typeof MODPERMISSIONS_CONF
              const modPermission = MODPERMISSIONS_CONF[confKey]
              const value = formState[permKey]

              return (
                <div className='IBMSMSMBSSExtraBoxElement' key={k}>
                  <div className='IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColStart'>
                    <p>{modPermission.header}</p>
                  </div>
                  <div className='IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColSecond'>
                    <label
                      htmlFor={`${permKey}_true`}
                      className='IBMSMSMBSSExtraBoxElementColChoice'
                    >
                      <p>
                        {MODPERMISSIONS_DESC[`${permKey}_true`]}
                        <br />
                      </p>
                      <input
                        className='IBMSMSMBSSExtraBoxElementColChoiceRadio'
                        type='radio'
                        name={permKey}
                        id={`${permKey}_true`}
                        value={'true'}
                        checked={
                          typeof value !== 'undefined'
                            ? value === true
                            : modPermission.default === true
                        }
                        onChange={(e) =>
                          handleRadioChange(
                            permKey,
                            e.currentTarget.value === 'true'
                          )
                        }
                      />
                      <div className='IBMSMSMBSSExtraBoxElementColChoiceBox'></div>
                    </label>
                    <label
                      htmlFor={`${permKey}_false`}
                      className='IBMSMSMBSSExtraBoxElementColChoice'
                    >
                      <p>
                        {MODPERMISSIONS_DESC[`${permKey}_false`]}
                        <br />
                      </p>
                      <input
                        className='IBMSMSMBSSExtraBoxElementColChoiceRadio'
                        type='radio'
                        id={`${permKey}_false`}
                        value={'false'}
                        name={permKey}
                        checked={
                          typeof value !== 'undefined'
                            ? value === false
                            : modPermission.default === false
                        }
                        onChange={(e) =>
                          handleRadioChange(
                            permKey,
                            e.currentTarget.value === 'true'
                          )
                        }
                      />
                      <div className='IBMSMSMBSSExtraBoxElementColChoiceBox'></div>
                    </label>
                  </div>
                </div>
              )
            })}
            <div className='IBMSMSMBSSExtraBoxElement'>
              <div className='IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColStart'>
                <p>Publisher Notes</p>
              </div>
              <div className='IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColSecond'>
                <textarea
                  className='inputMain'
                  value={formState.publisherNotes || ''}
                  onChange={(e) =>
                    handleInputChange('publisherNotes', e.currentTarget.value)
                  }
                />
              </div>
            </div>
            <div className='IBMSMSMBSSExtraBoxElement'>
              <div className='IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColStart'>
                <p>Extra Credits</p>
              </div>
              <div className='IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColSecond'>
                <textarea
                  className='inputMain'
                  value={formState.extraCredits || ''}
                  onChange={(e) =>
                    handleInputChange('extraCredits', e.currentTarget.value)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='IBMSMSMBS_WriteAction'>
        <button
          className='btn btnMain'
          type='button'
          onClick={handleReset}
          disabled={
            navigation.state === 'loading' || navigation.state === 'submitting'
          }
        >
          {isEditing ? 'Reset' : 'Clear fields'}
        </button>
        <button
          className='btn btnMain'
          type='submit'
          disabled={
            navigation.state === 'loading' || navigation.state === 'submitting'
          }
        >
          {navigation.state === 'submitting' ? 'Publishing...' : 'Publish'}
        </button>
      </div>
      {showTryAgainPopup && (
        <AlertPopup
          handleConfirm={handleTryAgainConfirm}
          handleClose={() => setShowTryAgainPopup(false)}
          header={'Publish'}
          label={`Submission timed out. Do you want to try again?`}
        />
      )}
      {showConfirmPopup && (
        <AlertPopup
          handleConfirm={handleResetConfirm}
          handleClose={() => setShowConfirmPopup(false)}
          header={'Are you sure?'}
          label={
            isEditing
              ? `Are you sure you want to clear all changes?`
              : `Are you sure you want to clear all field data?`
          }
        />
      )}
    </form>
  )
}
type DownloadUrlFieldsProps = {
  index: number
  url: string
  title?: string
  hash: string
  signatureKey: string
  malwareScanLink: string
  modVersion: string
  customNote: string
  mediaUrl?: string
  onUrlChange: (index: number, field: keyof DownloadUrl, value: string) => void
  onRemove: (index: number) => void
}

const DownloadUrlFields = React.memo(
  ({
    index,
    url,
    title,
    hash,
    signatureKey,
    malwareScanLink,
    modVersion,
    customNote,
    mediaUrl,
    onUrlChange,
    onRemove
  }: DownloadUrlFieldsProps) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target
      onUrlChange(index, name as keyof DownloadUrl, value)
    }

    return (
      <div className='inputWrapperMainWrapper'>
        <div className='inputWrapperMain'>
          <input
            type='text'
            className='inputMain'
            name='url'
            placeholder='Download URL'
            value={url}
            onChange={handleChange}
          />

          <button
            className='btn btnMain btnMainRemove'
            type='button'
            onClick={() => onRemove(index)}
            title='Remove'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-32 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z'></path>
            </svg>
          </button>
        </div>
        <div className='inputWrapperMain'>
          <div className='inputWrapperMainBox'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-96 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M320 448c0 17.67-14.31 32-32 32H64c-17.69 0-32-14.33-32-32v-384C32 46.34 46.31 32.01 64 32.01S96 46.34 96 64.01v352h192C305.7 416 320 430.3 320 448z'></path>
            </svg>
          </div>
          <input
            type='text'
            className='inputMain'
            name='title'
            placeholder='Download Title'
            value={title || ''}
            onChange={handleChange}
          />
          <div className='inputWrapperMainBox'></div>
        </div>
        <div className='inputWrapperMain'>
          <div className='inputWrapperMainBox'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-96 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M320 448c0 17.67-14.31 32-32 32H64c-17.69 0-32-14.33-32-32v-384C32 46.34 46.31 32.01 64 32.01S96 46.34 96 64.01v352h192C305.7 416 320 430.3 320 448z'></path>
            </svg>
          </div>
          <input
            type='text'
            className='inputMain'
            name='hash'
            placeholder='SHA-256 Hash'
            value={hash}
            onChange={handleChange}
          />
          <div className='inputWrapperMainBox'></div>
        </div>
        <div className='inputWrapperMain'>
          <div className='inputWrapperMainBox'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-96 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M320 448c0 17.67-14.31 32-32 32H64c-17.69 0-32-14.33-32-32v-384C32 46.34 46.31 32.01 64 32.01S96 46.34 96 64.01v352h192C305.7 416 320 430.3 320 448z'></path>
            </svg>
          </div>
          <input
            type='text'
            className='inputMain'
            placeholder='Signature public key'
            name='signatureKey'
            value={signatureKey}
            onChange={handleChange}
          />
          <div className='inputWrapperMainBox'></div>
        </div>
        <div className='inputWrapperMain'>
          <div className='inputWrapperMainBox'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-96 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M320 448c0 17.67-14.31 32-32 32H64c-17.69 0-32-14.33-32-32v-384C32 46.34 46.31 32.01 64 32.01S96 46.34 96 64.01v352h192C305.7 416 320 430.3 320 448z'></path>
            </svg>
          </div>
          <input
            type='text'
            className='inputMain'
            name='malwareScanLink'
            placeholder='Malware Scan Link'
            value={malwareScanLink}
            onChange={handleChange}
          />
          <div className='inputWrapperMainBox'></div>
        </div>
        <div className='inputWrapperMain'>
          <div className='inputWrapperMainBox'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-96 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M320 448c0 17.67-14.31 32-32 32H64c-17.69 0-32-14.33-32-32v-384C32 46.34 46.31 32.01 64 32.01S96 46.34 96 64.01v352h192C305.7 416 320 430.3 320 448z'></path>
            </svg>
          </div>
          <input
            type='text'
            className='inputMain'
            placeholder='Mod version (1.0)'
            name='modVersion'
            value={modVersion}
            onChange={handleChange}
          />
          <div className='inputWrapperMainBox'></div>
        </div>
        <div className='inputWrapperMain'>
          <div className='inputWrapperMainBox'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-96 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M320 448c0 17.67-14.31 32-32 32H64c-17.69 0-32-14.33-32-32v-384C32 46.34 46.31 32.01 64 32.01S96 46.34 96 64.01v352h192C305.7 416 320 430.3 320 448z'></path>
            </svg>
          </div>
          <input
            type='text'
            className='inputMain'
            placeholder='Custom note/message'
            name='customNote'
            value={customNote}
            onChange={handleChange}
          />
          <div className='inputWrapperMainBox'></div>
        </div>
        <div className='inputWrapperMain'>
          <div className='inputWrapperMainBox'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-96 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M320 448c0 17.67-14.31 32-32 32H64c-17.69 0-32-14.33-32-32v-384C32 46.34 46.31 32.01 64 32.01S96 46.34 96 64.01v352h192C305.7 416 320 430.3 320 448z'></path>
            </svg>
          </div>
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <ImageUpload
              onChange={(values) => {
                onUrlChange(index, 'mediaUrl', values[0])
              }}
            />

            <input
              type='text'
              className='inputMain'
              placeholder='Media URL'
              name='mediaUrl'
              value={mediaUrl || ''}
              onChange={handleChange}
            />
          </div>
          <div className='inputWrapperMainBox'></div>
        </div>
      </div>
    )
  }
)

type ScreenshotUrlFieldsProps = {
  index: number
  url: string
  onUrlChange: (index: number, value: string) => void
  onRemove: (index: number) => void
}

const ScreenshotUrlFields = React.memo(
  ({ index, url, onUrlChange, onRemove }: ScreenshotUrlFieldsProps) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onUrlChange(index, e.target.value)
    }

    return (
      <div className='inputWrapperMain'>
        <input
          type='text'
          className='inputMain'
          inputMode='url'
          placeholder='Image URL'
          value={url}
          onChange={handleChange}
        />
        <button
          className='btn btnMain btnMainRemove'
          type='button'
          onClick={() => onRemove(index)}
          title='Remove'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='-32 0 512 512'
            width='1em'
            height='1em'
            fill='currentColor'
          >
            <path d='M323.3 32.01H188.7C172.3 32.01 160 44.31 160 60.73V96.01H32C14.33 96.01 0 110.3 0 128S14.33 160 32 160H480c17.67 0 32-14.33 32-32.01S497.7 96.01 480 96.01H352v-35.28C352 44.31 339.7 32.01 323.3 32.01zM64.9 477.5C66.5 492.3 79.31 504 94.72 504H417.3c15.41 0 28.22-11.72 29.81-26.5L480 192.2H32L64.9 477.5z'></path>
          </svg>
        </button>
      </div>
    )
  }
)

type GameDropdownProps = {
  selected: string
  error?: string
  onChange: (name: string, value: string) => void
}

const GameDropdown = ({ selected, error, onChange }: GameDropdownProps) => {
  const games = useGames()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isOptionClicked = useRef(false)

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    _.debounce(() => {
      setDebouncedSearchTerm(value)
    }, 300)()
  }, [])

  const filteredOptions = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchString(debouncedSearchTerm)
    if (normalizedSearchTerm === '') return []
    return games
      .filter((game) =>
        memoizedNormalizeSearchString(game['Game Name']).includes(
          normalizedSearchTerm
        )
      )
      .sort((a, b) => {
        const aGameName = memoizedNormalizeSearchString(a['Game Name'])
        const bGameNAme = memoizedNormalizeSearchString(b['Game Name'])

        // Exact matches first
        if (
          aGameName === normalizedSearchTerm &&
          bGameNAme !== normalizedSearchTerm
        )
          return -1
        if (
          bGameNAme === normalizedSearchTerm &&
          aGameName !== normalizedSearchTerm
        )
          return 1

        // Then sort by position of match
        const aIndex = aGameName.indexOf(normalizedSearchTerm)
        const bIndex = bGameNAme.indexOf(normalizedSearchTerm)
        return aIndex - bIndex
      })
  }, [debouncedSearchTerm, games])

  return (
    <div className='inputLabelWrapperMain'>
      <label className='form-label labelMain'>Game</label>
      <p className='labelDescriptionMain'>
        Can't find the game you're looking for? You can temporarily publish the
        mod under '(Unlisted Game)' and later edit it with the proper game name
        once we add it.
      </p>
      <div className='dropdown dropdownMain'>
        <div className='inputWrapperMain inputWrapperMainAlt'>
          <input
            ref={inputRef}
            type='text'
            className='inputMain inputMainWithBtn dropdown-toggle'
            placeholder='This mod is for a game called...'
            aria-expanded='false'
            data-bs-toggle='dropdown'
            value={searchTerm || selected}
            onChange={(e) => handleSearchChange(e.target.value)}
            onBlur={() => {
              if (!isOptionClicked.current) {
                setSearchTerm('')
              }
              isOptionClicked.current = false
            }}
          />
          <button
            className='btn btnMain btnMainInsideField btnMainRemove'
            type='button'
            onClick={() => onChange('game', '')}
            title='Remove'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M480 416C497.7 416 512 430.3 512 448C512 465.7 497.7 480 480 480H150.6C133.7 480 117.4 473.3 105.4 461.3L25.37 381.3C.3786 356.3 .3786 315.7 25.37 290.7L258.7 57.37C283.7 32.38 324.3 32.38 349.3 57.37L486.6 194.7C511.6 219.7 511.6 260.3 486.6 285.3L355.9 416H480zM265.4 416L332.7 348.7L195.3 211.3L70.63 336L150.6 416L265.4 416z'></path>
            </svg>
          </button>
          <div className='dropdown-menu dropdownMainMenu dropdownMainMenuAlt'>
            <FixedSizeList
              height={5000}
              width={'100%'}
              itemCount={filteredOptions.length}
              itemSize={35}
            >
              {({ index, style }) => (
                <div
                  style={style}
                  className='dropdown-item dropdownMainMenuItem'
                  onMouseDown={() => (isOptionClicked.current = true)}
                  onClick={() => {
                    onChange('game', filteredOptions[index]['Game Name'])
                    setSearchTerm('')
                    if (inputRef.current) {
                      inputRef.current.blur()
                    }
                  }}
                >
                  {filteredOptions[index]['Game Name']}
                </div>
              )}
            </FixedSizeList>
          </div>
        </div>
      </div>
      {error && <InputError message={error} />}
      <p className='labelDescriptionMain'>
        Note: Please mention the game name in the body text of your mod post
        (e.g., 'This is a mod for Game Name') so we know what to look for and
        add.
      </p>
    </div>
  )
}
