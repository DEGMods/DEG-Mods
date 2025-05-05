import { NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk'
import { FALLBACK_PROFILE_IMAGE } from '../../constants'
import { useAppSelector, useLocalCache } from 'hooks'
import { useProfile } from 'hooks/useProfile'
import {
  Navigate,
  useActionData,
  useNavigation,
  useSubmit
} from 'react-router-dom'
import { appRoutes } from 'routes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adjustTextareaHeight, NOTE_DRAFT_CACHE_KEY } from 'utils'
import { NotePreview } from './NotePreview'
import { NoteSubmitActionResult, NoteSubmitForm } from 'types'
import { InputError } from 'components/Inputs/Error'
import { AlertPopup } from 'components/AlertPopup'

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
  const [cache, setCache] = useLocalCache<NoteSubmitForm>(NOTE_DRAFT_CACHE_KEY)
  const [content, setContent] = useState(initialContent ?? cache?.content ?? '')
  const [nsfw, setNsfw] = useState(cache?.nsfw ?? false)
  const [showPreview, setShowPreview] = useState(!!initialContent)
  const image = useMemo(
    () => profile?.image || FALLBACK_PROFILE_IMAGE,
    [profile?.image]
  )
  const ref = useRef<HTMLTextAreaElement>(null)
  const submit = useSubmit()
  const actionData = useActionData() as NoteSubmitActionResult
  const formErrors = useMemo(
    () =>
      actionData?.type === 'validation' ? actionData.formErrors : undefined,
    [actionData]
  )
  useEffect(() => {
    if (ref.current && (!!initialContent || !!cache?.content)) {
      adjustTextareaHeight(ref.current)
      ref.current.focus()
    }
  }, [cache?.content, initialContent])

  useEffect(() => {
    setCache({
      content,
      nsfw
    })
  }, [content, nsfw, setCache])

  useEffect(() => {
    if (ref.current) adjustTextareaHeight(ref.current)
  }, [content])

  const [showTryAgainPopup, setShowTryAgainPopup] = useState<boolean>(false)
  useEffect(() => {
    const isTimeout = actionData?.type === 'timeout'
    setShowTryAgainPopup(isTimeout)
    if (isTimeout && actionData.action.intent === 'submit') {
      setContent(actionData.action.data.content)
      setNsfw(actionData.action.data.nsfw)
    }
  }, [actionData])

  const handleFormSubmit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      const formSubmit = {
        intent: 'submit',
        data: {
          content,
          nsfw
        }
      }

      // Reset form
      setContent('')
      setNsfw(false)

      setShowPreview(false)

      submit(JSON.stringify(formSubmit), {
        method: 'post',
        encType: 'application/json',
        action: appRoutes.feed
      })

      typeof handleClose === 'function' && handleClose()
    },
    [content, handleClose, nsfw, submit]
  )

  const handleTryAgainConfirm = useCallback(
    (confirm: boolean) => {
      setShowTryAgainPopup(false)

      // Cancel if not confirmed
      if (!confirm) return

      handleFormSubmit()
    },
    [handleFormSubmit]
  )
  const handleContentChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setContent(event.currentTarget.value)
  }

  const handlePreviewToggle = () => {
    setShowPreview((prev) => !prev)
  }

  if (!userState.user?.pubkey) return <Navigate to={appRoutes.home} />

  return (
    <>
      <form className="feedPostsPost" onSubmit={handleFormSubmit}>
        <div className="feedPostsPostInside">
          <div className="feedPostsPostInsideInputWrapper">
            <div className="feedPostsPostInsidePP">
              <div className="IBMSMSMBSSCL_CommentTopPPWrapper">
                <div
                  className="IBMSMSMBSSCL_CommentTopPP"
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
              id="postSocialTextarea"
              name="content"
              className="inputMain feedPostsPostInsideInput"
              placeholder="Watcha thinking about?"
              ref={ref}
              value={content}
              onChange={handleContentChange}
            />
          </div>
          <div className="feedPostsPostInsideAction">
            <div
              className="inputLabelWrapperMain inputLabelWrapperMainAlt"
              style={{ width: 'unset' }}
            >
              <input
                type="checkbox"
                className="CheckboxMain"
                checked={nsfw}
                id="nsfw"
                name="nsfw"
                onChange={() => setNsfw((nsfw) => !nsfw)}
              />
              <label htmlFor="nsfw" className="form-label labelMain">
                NSFW
              </label>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'row', gridGap: '10px' }}
            >
              {typeof handleClose === 'function' && (
                <button
                  className="btn btnMain"
                  type="button"
                  style={{ padding: '5px 20px', borderRadius: '8px' }}
                  onClick={handleClose}
                >
                  Close
                </button>
              )}
              <button
                className="btn btnMain"
                type="button"
                style={{ padding: '5px 20px', borderRadius: '8px' }}
                onClick={handlePreviewToggle}
              >
                Preview
              </button>
              <button
                className="btn btnMain"
                type="submit"
                style={{ padding: '5px 20px', borderRadius: '8px' }}
                disabled={navigation.state !== 'idle' || !content.length}
              >
                {navigation.state === 'submitting' ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
          {typeof formErrors?.content !== 'undefined' && (
            <InputError message={formErrors?.content} />
          )}
          {showPreview && <NotePreview content={content} />}
          {showTryAgainPopup && (
            <AlertPopup
              handleConfirm={handleTryAgainConfirm}
              handleClose={() => setShowTryAgainPopup(false)}
              header={'Post'}
              label={`Posting timed out. Do you want to try again?`}
            />
          )}
        </div>
      </form>
    </>
  )
}
