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
import { useGames } from '../hooks'
import '../styles/styles.css'
import {
  DownloadUrl,
  FormErrors,
  ModFormState,
  ModPageLoaderResult
} from '../types'
import { initializeFormState } from '../utils'
import { CheckboxField, InputError, InputField } from './Inputs'
import { OriginalAuthor } from './OriginalAuthor'
import { CategoryAutocomplete } from './CategoryAutocomplete'
import { AlertPopup } from './AlertPopup'
import { Editor, EditorRef } from './Markdown/Editor'

interface GameOption {
  value: string
  label: string
}

export const ModForm = () => {
  const data = useLoaderData() as ModPageLoaderResult
  const mod = data?.mod
  const formErrors = useActionData() as FormErrors
  const navigation = useNavigation()
  const submit = useSubmit()
  const games = useGames()
  const [gameOptions, setGameOptions] = useState<GameOption[]>([])
  const [formState, setFormState] = useState<ModFormState>(
    initializeFormState(mod)
  )
  const editorRef = useRef<EditorRef>(null)

  useEffect(() => {
    const options = games.map((game) => ({
      label: game['Game Name'],
      value: game['Game Name']
    }))
    setGameOptions(options)
  }, [games])

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

  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false)
  const handleReset = () => {
    setShowConfirmPopup(true)
  }
  const handleResetConfirm = (confirm: boolean) => {
    setShowConfirmPopup(false)

    // Cancel if not confirmed
    if (!confirm) return

    // Editing
    if (mod) {
      const initial = initializeFormState(mod)

      // Reset editor
      editorRef.current?.setMarkdown(initial.body)

      // Reset fields to the original existing data
      setFormState(initial)
      return
    }

    // New - set form state to the initial (clear form state)
    setFormState(initializeFormState())
  }
  const handlePublish = () => {
    submit(JSON.stringify(formState), {
      method: mod ? 'put' : 'post',
      encType: 'application/json'
    })
  }

  return (
    <form
      className='IBMSMSMBS_Write'
      onSubmit={(e) => {
        e.preventDefault()
        handlePublish()
      }}
    >
      <GameDropdown
        options={gameOptions}
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
            markdown={formState.body}
            placeholder="Here's what this mod is all about"
            onChange={(md) => {
              handleInputChange('body', md)
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

      <InputField
        label='Featured Image URL'
        description='We recommend to upload images to https://imgur.com/upload'
        type='text'
        inputMode='url'
        placeholder='Image URL'
        name='featuredImageUrl'
        value={formState.featuredImageUrl}
        error={formErrors?.featuredImageUrl}
        onChange={handleInputChange}
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
          We recommend to upload images to https://imgur.com/upload
        </p>
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
          updating it there (another option is catbox.moe). Also, it's advisable
          that you hash your package as well with your nostr public key.
        </p>

        {formState.downloadUrls.map((download, index) => (
          <Fragment key={`download-${index}`}>
            <DownloadUrlFields
              index={index}
              url={download.url}
              hash={download.hash}
              signatureKey={download.signatureKey}
              malwareScanLink={download.malwareScanLink}
              modVersion={download.modVersion}
              customNote={download.customNote}
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
      <div className='IBMSMSMBS_WriteAction'>
        <button
          className='btn btnMain'
          type='button'
          onClick={handleReset}
          disabled={
            navigation.state === 'loading' || navigation.state === 'submitting'
          }
        >
          {mod ? 'Reset' : 'Clear fields'}
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
      {showConfirmPopup && (
        <AlertPopup
          handleConfirm={handleResetConfirm}
          handleClose={() => setShowConfirmPopup(false)}
          header={'Are you sure?'}
          label={
            mod
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
  hash: string
  signatureKey: string
  malwareScanLink: string
  modVersion: string
  customNote: string
  onUrlChange: (index: number, field: keyof DownloadUrl, value: string) => void
  onRemove: (index: number) => void
}

const DownloadUrlFields = React.memo(
  ({
    index,
    url,
    hash,
    signatureKey,
    malwareScanLink,
    modVersion,
    customNote,
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
          placeholder='We recommend to upload images to https://imgur.com/upload'
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
  options: GameOption[]
  selected: string
  error?: string
  onChange: (name: string, value: string) => void
}

const GameDropdown = ({
  options,
  selected,
  error,
  onChange
}: GameDropdownProps) => {
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
    if (debouncedSearchTerm === '') return []
    else {
      return options.filter((option) =>
        option.label.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }
  }, [debouncedSearchTerm, options])

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
              height={500}
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
                    onChange('game', filteredOptions[index].value)
                    setSearchTerm('')
                    if (inputRef.current) {
                      inputRef.current.blur()
                    }
                  }}
                >
                  {filteredOptions[index].label}
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
