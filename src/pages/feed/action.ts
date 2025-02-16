import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { ActionFunctionArgs, redirect } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getFeedNotePageRoute } from 'routes'
import { store } from 'store'
import { NoteSubmitForm, NoteSubmitFormErrors } from 'types'
import { log, LogType, now } from 'utils'

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

    const formSubmit = (await request.json()) as NoteSubmitForm
    const formErrors = validateFormData(formSubmit)

    if (Object.keys(formErrors).length) return formErrors

    const content = decodeURIComponent(formSubmit.content!)
    const currentTimeStamp = now()

    const ndkEvent = new NDKEvent(ndkContext.ndk, {
      kind: NDKKind.Text,
      created_at: currentTimeStamp,
      content: content,
      tags: [
        ['L', 'source'],
        ['l', window.location.host, 'source']
      ],
      pubkey: hexPubkey
    })

    try {
      if (formSubmit.nsfw) ndkEvent.tags.push(['L', 'content-warning'])

      await ndkEvent.sign()
      const note1 = ndkEvent.encode()
      const publishedOnRelays = await ndkEvent.publish()
      if (publishedOnRelays.size === 0) {
        toast.error('Failed to publish note on any relay')
        return null
      } else {
        toast.success('Note published successfully')
        return redirect(getFeedNotePageRoute(note1))
      }
    } catch (error) {
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
