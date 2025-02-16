import { NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk'
import { FALLBACK_PROFILE_IMAGE } from '../../constants'
import { useAppSelector } from 'hooks'
import { useProfile } from 'hooks/useProfile'
import { Navigate, useNavigation, useSubmit } from 'react-router-dom'
import { appRoutes } from 'routes'
import { useEffect, useRef, useState } from 'react'
import { adjustTextareaHeight } from 'utils'
import { NotePreview } from './NotePreview'

interface NoteSubmitProps {
  initialContent?: string | undefined
  handleClose?: () => void | undefined
}

export const NoteSubmit = ({
  initialContent,
  handleClose
}: NoteSubmitProps) => {
  const navigation = useNavigation()
  const userState = useAppSelector((state) => state.user)
  const profile = useProfile(userState.user?.pubkey as string | undefined, {
    cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
  })
  const [content, setContent] = useState(initialContent ?? '')
  const [nsfw, setNsfw] = useState(false)
  const [showPreview, setShowPreview] = useState(!!initialContent)
  const image = profile?.image || FALLBACK_PROFILE_IMAGE
  const ref = useRef<HTMLTextAreaElement>(null)
  const submit = useSubmit()

  useEffect(() => {
    if (ref.current && !!initialContent) {
      adjustTextareaHeight(ref.current)
      ref.current.focus()
    }
  }, [initialContent])

  const handleContentChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setContent(event.currentTarget.value)
    adjustTextareaHeight(event.currentTarget)
  }

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formSubmit = {
      content,
      nsfw
    }

    // Reset form
    setContent('')
    setNsfw(false)

    submit(JSON.stringify(formSubmit), {
      method: 'post',
      encType: 'application/json'
    })

    typeof handleClose === 'function' && handleClose()
  }

  const handlePreviewToggle = () => {
    setShowPreview((prev) => !prev)
  }

  if (!userState.user?.pubkey) return <Navigate to={appRoutes.home} />

  return (
    <>
      <form className='feedPostsPost' onSubmit={handleFormSubmit}>
        <div className='feedPostsPostInside'>
          <div className='feedPostsPostInsideInputWrapper'>
            <div className='feedPostsPostInsidePP'>
              <div className='IBMSMSMBSSCL_CommentTopPPWrapper'>
                <div
                  className='IBMSMSMBSSCL_CommentTopPP'
                  style={{
                    background: `url(${image}) center/cover no-repeat`,
                    width: '50px',
                    height: '50px',
                    borderRadius: '8px'
                  }}
                ></div>
              </div>
            </div>
            <textarea
              id='postSocialTextarea'
              name='content'
              className='inputMain feedPostsPostInsideInput'
              placeholder='Watcha thinking about?'
              ref={ref}
              value={content}
              onChange={handleContentChange}
            />
          </div>
          <div className='feedPostsPostInsideAction'>
            <div
              className='inputLabelWrapperMain inputLabelWrapperMainAlt'
              style={{ width: 'unset' }}
            >
              <input
                type='checkbox'
                className='CheckboxMain'
                checked={nsfw}
                id='nsfw'
                name='nsfw'
                onChange={() => setNsfw((nsfw) => !nsfw)}
              />
              <label htmlFor='nsfw' className='form-label labelMain'>
                NSFW
              </label>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'row', gridGap: '10px' }}
            >
              {typeof handleClose === 'function' && (
                <button
                  className='btn btnMain'
                  type='button'
                  style={{ padding: '5px 20px', borderRadius: '8px' }}
                  onClick={handleClose}
                >
                  Close
                </button>
              )}
              <button
                className='btn btnMain'
                type='button'
                style={{ padding: '5px 20px', borderRadius: '8px' }}
                onClick={handlePreviewToggle}
              >
                Preview
              </button>
              <button
                className='btn btnMain'
                type='submit'
                style={{ padding: '5px 20px', borderRadius: '8px' }}
                disabled={navigation.state !== 'idle'}
              >
                {navigation.state === 'idle' ? 'Post' : 'Posting...'}
              </button>
            </div>
          </div>
          {showPreview && <NotePreview content={content} />}
        </div>
      </form>
    </>
  )
}
