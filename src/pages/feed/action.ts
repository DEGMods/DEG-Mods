import NDK, { NDKEvent, NDKKind, NostrEvent } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { ActionFunctionArgs, redirect } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getFeedNotePageRoute } from 'routes'
import { store } from 'store'
import {
  NoteAction,
  NoteSubmitForm,
  NoteSubmitFormErrors,
  TimeoutError
} from 'types'
import {
  log,
  LogType,
  NOTE_DRAFT_CACHE_KEY,
  now,
  removeLocalStorageItem,
  timeout
} from 'utils'

export const feedPostRouteAction =
  (ndkContext: NDKContextType) =>
  async ({ request }: ActionFunctionArgs) => {
    const userState = store.getState().user
    let hexPubkey: string
    if (userState.auth && userState.user?.pubkey) {
      hexPubkey = userState.user.pubkey as string
    } else {
      try {
        hexPubkey = (await window.nostr?.getPublicKey()) as string
      } catch (error) {
        if (error instanceof Error) {
          log(true, LogType.Error, 'Failed to get public key.', error)
        }

        toast.error('Failed to get public key.')
        return null
      }
    }

    if (!hexPubkey) {
      toast.error('Could not get pubkey')
      return null
    }

    let action: NoteAction | undefined
    try {
      action = (await request.json()) as NoteAction
      switch (action.intent) {
        case 'submit':
          return await handleActionSubmit(
            ndkContext.ndk,
            action.data,
            hexPubkey
          )

        case 'repost':
          return await handleActionRepost(ndkContext.ndk, action.data)

        default:
          throw new Error('Unsupported feed action. Intent missing.')
      }
    } catch (error) {
      if (action && error instanceof TimeoutError) {
        log(true, LogType.Error, 'Failed to publish note. Try again initiated')
        const result = {
          type: 'timeout',
          action
        }
        return result
      }
      log(true, LogType.Error, 'Failed to publish note', error)
      toast.error('Failed to publish note')
      return null
    }
  }

const validateFormData = (formSubmit: NoteSubmitForm): NoteSubmitFormErrors => {
  const errors: NoteSubmitFormErrors = {}

  if (!formSubmit.content.trim()) {
    errors.content = 'Content is required'
  }

  return errors
}

async function handleActionSubmit(
  ndk: NDK,
  data: NoteSubmitForm,
  pubkey: string
) {
  const formErrors = validateFormData(data)

  if (Object.keys(formErrors).length)
    return {
      type: 'validation',
      formErrors
    }

  const content = decodeURIComponent(data.content!)
  const currentTimeStamp = now()

  const ndkEvent = new NDKEvent(ndk, {
    kind: NDKKind.Text,
    created_at: currentTimeStamp,
    content: content,
    tags: [
      ['L', 'source'],
      ['l', window.location.host, 'source']
    ],
    pubkey
  })

  if (data.nsfw) ndkEvent.tags.push(['L', 'content-warning'])

  await ndkEvent.sign()
  const note1 = ndkEvent.encode()
  const publishedOnRelays = await Promise.race([
    ndkEvent.publish(),
    timeout(30000)
  ])
  if (publishedOnRelays.size === 0) {
    toast.error('Failed to publish note on any relay')
    return null
  } else {
    toast.success('Note published successfully')
    removeLocalStorageItem(NOTE_DRAFT_CACHE_KEY)
    return redirect(getFeedNotePageRoute(note1))
  }
}
async function handleActionRepost(ndk: NDK, data: NostrEvent) {
  const ndkEvent = new NDKEvent(ndk, data)
  await ndkEvent.sign()

  const publishedOnRelays = await ndkEvent.publish()
  if (publishedOnRelays.size === 0) {
    toast.error('Failed to publish note on any relay')
    return null
  } else {
    toast.success('Note published successfully')
    return null
  }
}
