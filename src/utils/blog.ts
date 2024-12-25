import { NDKEvent } from '@nostr-dev-kit/ndk'
import { BlogCardDetails, BlogDetails } from 'types'
import { getFirstTagValue, getFirstTagValueAsInt, getTagValues } from './nostr'
import { kinds, nip19 } from 'nostr-tools'

export const extractBlogDetails = (event: NDKEvent): Partial<BlogDetails> => {
  const dTag = getFirstTagValue(event, 'd')

  // Check if the aTag exists on the blog
  let aTag = getFirstTagValue(event, 'a')

  // Create aTag from components if aTag is not included
  if (typeof aTag === 'undefined' && event.pubkey && dTag) {
    aTag = `${kinds.LongFormArticle}:${event.pubkey}:${dTag}`
  }

  return {
    title: getFirstTagValue(event, 'title'),
    content: event.content,
    summary: getFirstTagValue(event, 'summary'),
    image: getFirstTagValue(event, 'image'),
    // Check L label namespace for content warning or nsfw (backwards compatibility)
    nsfw:
      getFirstTagValue(event, 'L') === 'content-warning' ||
      getFirstTagValue(event, 'nsfw') === 'true',
    id: event.id,
    author: event.pubkey,
    published_at: getFirstTagValueAsInt(event, 'published_at'),
    edited_at: event.created_at,
    rTag: getFirstTagValue(event, 'r') || 'N/A',
    dTag: dTag,
    aTag: aTag,
    tTags: getTagValues(event, 't') || []
  }
}

export const extractBlogCardDetails = (
  event: NDKEvent
): Partial<BlogCardDetails> => {
  const blogDetails = extractBlogDetails(event)

  return {
    ...blogDetails,
    naddr: blogDetails.dTag
      ? nip19.naddrEncode({
          identifier: blogDetails.dTag,
          kind: kinds.LongFormArticle,
          pubkey: event.pubkey
        })
      : undefined
  }
}
