import { NDKFilter, NDKList } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { UnsignedEvent, kinds } from 'nostr-tools'
import { toast } from 'react-toastify'
import { UserRelaysType } from 'types'
import { now, npubToHex, signAndPublish } from './nostr'

interface CurationSetArgs {
  dTag: CurationSetIdentifiers
  pubkey: string
  ndkContext: NDKContextType
}

/**
 * Used for dTag when updating
 */
export enum CurationSetIdentifiers {
  NSFW = 'nsfw',
  Repost = 'repost'
}

/**
 * Create the article curation set (kind: 30004) for the user (pubkey)
 * with initial article (optional)
 * @see https://github.com/nostr-protocol/nips/blob/master/51.md#sets
 */
export async function createCurationSet(
  { dTag, pubkey, ndkContext }: CurationSetArgs,
  initialArticle?: string
) {
  const curationSetName = `${dTag} - Degmods's curation set`
  const tags = [
    ['d', dTag],
    ['title', curationSetName]
  ]
  if (initialArticle) {
    tags.push(['a', initialArticle])
  }
  const unsignedEvent: UnsignedEvent = {
    pubkey: pubkey,
    kind: kinds.Curationsets,
    content: '',
    created_at: now(),
    tags
  }
  const isUpdated = await signAndPublish(
    unsignedEvent,
    ndkContext.ndk,
    ndkContext.publish
  )
  if (!isUpdated) {
    toast.error(`Failed to create user's ${dTag} curation set`)
  }
  return isUpdated
}

export async function getReportingSet(
  dTag: CurationSetIdentifiers,
  ndkContext: NDKContextType
) {
  const result: string[] = []
  const reportingNpub = import.meta.env.VITE_REPORTING_NPUB
  const hexKey = npubToHex(reportingNpub)

  if (hexKey) {
    const event = await ndkContext.fetchEvent({
      kinds: [kinds.Curationsets],
      authors: [hexKey],
      '#d': [dTag]
    })

    if (event) {
      const list = NDKList.from(event)
      list.items.forEach((item) => {
        if (item[0] === 'a') {
          result.push(item[1])
        }
      })
    }
  }

  return result
}

export async function getCurationSet({
  dTag,
  pubkey,
  ndkContext
}: CurationSetArgs) {
  const filter: NDKFilter = {
    kinds: [kinds.Curationsets],
    authors: [pubkey],
    '#d': [dTag]
  }

  const nsfwListEvent = await ndkContext.fetchEventFromUserRelays(
    filter,
    pubkey,
    UserRelaysType.Write
  )

  return nsfwListEvent
}

/**
 * Update the article curation set (kind: 30004) for the user (pubkey)
 * Add the aTag to the dTag list
 * @see https://github.com/nostr-protocol/nips/blob/master/51.md#sets
 */
export async function addToCurationSet(
  curationSetArgs: CurationSetArgs,
  aTag: string
) {
  const curationSetEvent = await getCurationSet(curationSetArgs)

  let isUpdated = false
  if (curationSetEvent) {
    const { dTag, pubkey, ndkContext } = curationSetArgs
    const tags = curationSetEvent.tags
    const alreadyExists =
      tags.findIndex((item) => item[0] === 'a' && item[1] === aTag) !== -1

    if (alreadyExists) {
      toast.warn(`Already in user's ${dTag} list`)
      return false
    }

    tags.push(['a', aTag])

    const unsignedEvent = {
      pubkey: pubkey,
      kind: kinds.Curationsets,
      content: curationSetEvent.content,
      created_at: now(),
      tags: [...tags]
    }

    isUpdated = await signAndPublish(
      unsignedEvent,
      ndkContext.ndk,
      ndkContext.publish
    )
    if (!isUpdated) {
      toast.error(`Failed to update user's ${dTag} list`)
    }
  } else {
    isUpdated = await createCurationSet(curationSetArgs, aTag)
  }

  return isUpdated
}

/**
 * Update the article curation set (kind: 30004) for the user (pubkey)
 * Remove the aTag from the dTag list
 */
export async function removeFromCurationSet(
  curationSetArgs: CurationSetArgs,
  aTag: string
) {
  const curationSetEvent = await getCurationSet(curationSetArgs)
  const { dTag, pubkey, ndkContext } = curationSetArgs

  if (!curationSetEvent) {
    toast.error(`Couldn't get ${dTag} list event from relays`)
    return false
  }
  const tags = curationSetEvent.tags

  const unsignedEvent: UnsignedEvent = {
    pubkey: pubkey,
    kind: kinds.Curationsets,
    content: curationSetEvent.content,
    created_at: now(),
    tags: tags.filter((item) => item[0] !== 'a' || item[1] !== aTag)
  }

  const isUpdated = await signAndPublish(
    unsignedEvent,
    ndkContext.ndk,
    ndkContext.publish
  )
  if (!isUpdated) {
    toast.error(`Failed to update user's ${dTag} list`)
  }
  return isUpdated
}
