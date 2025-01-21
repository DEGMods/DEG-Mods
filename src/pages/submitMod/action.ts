import { NDKEvent } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { kinds, nip19, Event, UnsignedEvent } from 'nostr-tools'
import { ActionFunctionArgs, redirect } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getModPageRoute } from 'routes'
import { store } from 'store'
import {
  FormErrors,
  ModFormState,
  SubmitModActionResult,
  TimeoutError
} from 'types'
import {
  isReachable,
  isValidImageUrl,
  isValidUrl,
  log,
  LogType,
  MOD_DRAFT_CACHE_KEY,
  now,
  removeLocalStorageItem,
  timeout
} from 'utils'
import { v4 as uuidv4 } from 'uuid'
import { T_TAG_VALUE } from '../../constants'

export const submitModRouteAction =
  (ndkContext: NDKContextType) =>
  async ({ params, request }: ActionFunctionArgs) => {
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
    try {
      const formState = (await request.json()) as ModFormState

      // Check for errors
      const formErrors = await validateState(formState)

      // Return early if there are any errors
      if (Object.keys(formErrors).length) {
        return {
          type: 'validation',
          error: formErrors
        } as SubmitModActionResult
      }

      const currentTimeStamp = now()

      const { naddr } = params
      // Check if we are editing or this is a new mob
      const isEditing = naddr && request.method === 'PUT'

      const uuid = formState.dTag || uuidv4()
      const aTag =
        formState.aTag || `${kinds.ClassifiedListing}:${hexPubkey}:${uuid}`
      const published_at = formState.published_at || currentTimeStamp

      const tags = [
        ['d', uuid],
        ['a', aTag],
        ['r', formState.rTag],
        ['t', T_TAG_VALUE],
        ['published_at', published_at.toString()],
        ['game', formState.game],
        ['title', formState.title],
        ['featuredImageUrl', formState.featuredImageUrl],
        ['summary', formState.summary],
        ['nsfw', formState.nsfw.toString()],
        ['repost', formState.repost.toString()],
        ['screenshotsUrls', ...formState.screenshotsUrls],
        ['tags', ...formState.tags.split(',')],
        [
          'downloadUrls',
          ...formState.downloadUrls.map((downloadUrl) =>
            JSON.stringify(downloadUrl)
          )
        ]
      ]
      if (formState.repost && formState.originalAuthor) {
        tags.push(['originalAuthor', formState.originalAuthor])
      }

      // Prepend com.degmods to avoid leaking categories to 3rd party client's search
      // Add hierarchical namespaces labels
      if (formState.LTags.length > 0) {
        for (let i = 0; i < formState.LTags.length; i++) {
          tags.push(['L', `com.degmods:${formState.LTags[i]}`])
        }
      }

      // Add category labels
      if (formState.lTags.length > 0) {
        for (let i = 0; i < formState.lTags.length; i++) {
          tags.push(['l', `com.degmods:${formState.lTags[i]}`])
        }
      }

      const unsignedEvent: UnsignedEvent = {
        kind: kinds.ClassifiedListing,
        created_at: currentTimeStamp,
        pubkey: hexPubkey,
        content: formState.body,
        tags
      }

      const signedEvent = await window.nostr
        ?.signEvent(unsignedEvent)
        .then((event) => event as Event)
        .catch((err) => {
          toast.error('Failed to sign the event!')
          log(true, LogType.Error, 'Failed to sign the event!', err)
          return null
        })

      if (!signedEvent) {
        toast.error('Failed to sign the event!')
        return null
      }

      const ndkEvent = new NDKEvent(ndkContext.ndk, signedEvent)
      // Publishing a mod sometime hangs (ndk.publish has internal timeout of 10s)
      // Make sure to actually throw a timeout error (30s)
      try {
        const publishedOnRelays = await Promise.race([
          ndkContext.publish(ndkEvent),
          timeout(30000)
        ])
        // Handle cases where publishing failed or succeeded
        if (publishedOnRelays.length === 0) {
          toast.error('Failed to publish event on any relay')
        } else {
          toast.success(
            `Event published successfully to the following relays\n\n${publishedOnRelays.join(
              '\n'
            )}`
          )

          !isEditing && removeLocalStorageItem(MOD_DRAFT_CACHE_KEY)

          const naddr = nip19.naddrEncode({
            identifier: aTag,
            pubkey: signedEvent.pubkey,
            kind: signedEvent.kind,
            relays: publishedOnRelays
          })

          return redirect(getModPageRoute(naddr))
        }
      } catch (error) {
        if (error instanceof TimeoutError) {
          const result: SubmitModActionResult = {
            type: 'timeout',
            data: {
              dTag: uuid,
              aTag,
              published_at: published_at
            }
          }
          return result
        }

        // Rethrow non-timeout for general catch
        throw error
      }
    } catch (error) {
      log(true, LogType.Error, 'Failed to sign the event!', error)
      return null
    }

    return null
  }

const validateState = async (
  formState: Partial<ModFormState>
): Promise<FormErrors> => {
  const errors: FormErrors = {}

  if (!formState.game || formState.game === '') {
    errors.game = 'Game field can not be empty'
  }

  if (!formState.title || formState.title === '') {
    errors.title = 'Title field can not be empty'
  }

  if (!formState.body || formState.body === '') {
    errors.body = 'Body field can not be empty'
  }

  if (!formState.featuredImageUrl || formState.featuredImageUrl === '') {
    errors.featuredImageUrl = 'FeaturedImageUrl field can not be empty'
  } else if (
    !isValidImageUrl(formState.featuredImageUrl) ||
    !(await isReachable(formState.featuredImageUrl))
  ) {
    errors.featuredImageUrl =
      'FeaturedImageUrl must be a valid and reachable image URL'
  }

  if (!formState.summary || formState.summary === '') {
    errors.summary = 'Summary field can not be empty'
  }

  if (!formState.screenshotsUrls || formState.screenshotsUrls.length === 0) {
    errors.screenshotsUrls = ['Required at least one screenshot url']
  } else {
    for (let i = 0; i < formState.screenshotsUrls.length; i++) {
      const url = formState.screenshotsUrls[i]
      if (
        !isValidUrl(url) ||
        !isValidImageUrl(url) ||
        !(await isReachable(url))
      ) {
        if (!errors.screenshotsUrls)
          errors.screenshotsUrls = Array(formState.screenshotsUrls.length)

        errors.screenshotsUrls![i] =
          'All screenshot URLs must be valid and reachable image URLs'
      }
    }
  }

  if (!formState.tags || formState.tags === '') {
    errors.tags = 'Tags field can not be empty'
  }

  if (!formState.downloadUrls || formState.downloadUrls.length === 0) {
    errors.downloadUrls = ['Required at least one download url']
  } else {
    for (let i = 0; i < formState.downloadUrls.length; i++) {
      const downloadUrl = formState.downloadUrls[i]
      if (!isValidUrl(downloadUrl.url)) {
        if (!errors.downloadUrls)
          errors.downloadUrls = Array(formState.downloadUrls.length)

        errors.downloadUrls![i] = 'Download url must be valid and reachable'
      }

      if (
        downloadUrl.mediaUrl &&
        downloadUrl.mediaUrl.trim() !== '' &&
        (!isValidUrl(downloadUrl.mediaUrl) ||
          !isValidImageUrl(downloadUrl.mediaUrl) ||
          !(await isReachable(downloadUrl.mediaUrl)))
      ) {
        if (!errors.downloadUrls)
          errors.downloadUrls = Array(formState.downloadUrls.length)

        errors.downloadUrls![i] = 'Media URLs must be valid and reachable image'
      }
    }
  }

  return errors
}
