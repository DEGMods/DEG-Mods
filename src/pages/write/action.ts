import { NDKContextType } from 'contexts/NDKContext'
import { ActionFunctionArgs, redirect } from 'react-router-dom'
import { getBlogPageRoute } from 'routes'
import { BlogFormErrors, BlogEventSubmitForm, BlogEventEditForm } from 'types'
import {
  isReachable,
  isValidImageUrl,
  log,
  LogType,
  now,
  parseFormData
} from 'utils'
import { kinds, UnsignedEvent, Event, nip19 } from 'nostr-tools'
import { toast } from 'react-toastify'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { v4 as uuidv4 } from 'uuid'
import { store } from 'store'

export const writeRouteAction =
  (ndkContext: NDKContextType) =>
  async ({ params, request }: ActionFunctionArgs) => {
    // Get the current state
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

    // Get the form data from submit request
    const formData = await request.formData()

    // Parse the the data
    const formSubmit = parseFormData<BlogEventSubmitForm | BlogEventEditForm>(
      formData
    )

    // Check for errors
    const formErrors = await validateFormData(formSubmit)

    // Return earily if there are any errors
    if (Object.keys(formErrors).length) return formErrors

    // Get the markdown from formData
    const content = decodeURIComponent(formSubmit.content!)

    // Check if we are editing or this is a new blog
    const { naddr } = params
    const isEditing =
      naddr && request.method === 'PUT' && isEditForm(formSubmit)
    const formEdit = isEditing ? formSubmit : undefined

    const currentTimeStamp = now()

    // Get the existing edited fields or new ones
    const uuid = isEditing && formEdit?.dTag ? formSubmit.dTag : uuidv4()
    const rTag =
      isEditing && formEdit?.rTag ? formEdit.rTag : window.location.host
    const published_at =
      isEditing && formEdit?.published_at
        ? formEdit.published_at
        : currentTimeStamp

    const aTag = `${kinds.LongFormArticle}:${hexPubkey}:${uuid}`
    const tTags = formSubmit
      .tags!.toLowerCase()
      .split(',')
      .map((t) => ['t', t])

    const tags = [
      ['d', uuid],
      ['a', aTag],
      ['r', rTag],
      ['published_at', published_at.toString()],
      ['title', formSubmit.title!],
      ['image', formSubmit.image!],
      ['summary', formSubmit.summary!],
      ...tTags
    ]

    // Add NSFW tag, L label namespace standardized tag
    // https://github.com/nostr-protocol/nips/blob/2838e3bd51ac00bd63c4cef1601ae09935e7dd56/README.md#standardized-tags
    if (formSubmit.nsfw === 'on') tags.push(['L', 'content-warning'])

    const unsignedEvent: UnsignedEvent = {
      kind: kinds.LongFormArticle,
      created_at: currentTimeStamp,
      pubkey: hexPubkey,
      content: content,
      tags: tags
    }

    try {
      const signedEvent = await window.nostr
        ?.signEvent(unsignedEvent)
        .then((event) => event as Event)

      if (!signedEvent) {
        toast.error('Failed to sign the event!')
        return null
      }

      const ndkEvent = new NDKEvent(ndkContext.ndk, signedEvent)
      const publishedOnRelays = await ndkContext.publish(ndkEvent)

      // Handle cases where publishing failed or succeeded
      if (publishedOnRelays.length === 0) {
        toast.error('Failed to publish event on any relay.')
        return null
      } else {
        toast.success(
          `Event published successfully to the following relays\n\n${publishedOnRelays.join(
            '\n'
          )}`
        )
        const naddr = nip19.naddrEncode({
          identifier: uuid,
          pubkey: signedEvent.pubkey,
          kind: signedEvent.kind,
          relays: publishedOnRelays
        })
        return redirect(getBlogPageRoute(naddr))
      }
    } catch (error) {
      log(true, LogType.Error, 'Failed to sign the event!', error)
      toast.error('Failed to sign the event!')
      return null
    }
  }

const validateFormData = async (
  formData: Partial<BlogEventSubmitForm>
): Promise<BlogFormErrors> => {
  const errors: BlogFormErrors = {}

  if (!formData.title || formData.title.trim() === '') {
    errors.title = 'Title field can not be empty'
  }

  if (!formData.content || formData.content.trim() === '') {
    errors.content = 'Content field can not be empty'
  }

  if (!formData.summary || formData.summary.trim() === '') {
    errors.summary = 'Summary field can not be empty'
  }

  if (!formData.tags || formData.tags.trim() === '') {
    errors.tags = 'Tags field can not be empty'
  }

  if (!formData.image || formData.image.trim() === '') {
    errors.image = 'Image url field can not be empty'
  } else if (
    !isValidImageUrl(formData.image) ||
    !(await isReachable(formData.image))
  ) {
    errors.image = 'Image must be a valid and reachable'
  }

  return errors
}

function isEditForm(
  form: Partial<BlogEventSubmitForm | BlogEventEditForm>
): form is BlogEventEditForm {
  return (form as BlogEventEditForm).dTag !== undefined
}
