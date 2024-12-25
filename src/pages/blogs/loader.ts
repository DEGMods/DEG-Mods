import { NDKFilter } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { kinds } from 'nostr-tools'
import { BlogCardDetails } from 'types'
import { log, LogType, npubToHex } from 'utils'
import { extractBlogCardDetails } from 'utils/blog'

export const blogsRouteLoader = (ndkContext: NDKContextType) => async () => {
  try {
    const blogNpubs = import.meta.env.VITE_BLOG_NPUBS.split(',')
    const blogHexkeys = blogNpubs
      .map(npubToHex)
      .filter((hexkey) => hexkey !== null)

    const filter: NDKFilter = {
      authors: blogHexkeys,
      kinds: [kinds.LongFormArticle]
    }

    const settled = await Promise.allSettled([
      ndkContext.fetchEvents(filter),
      ndkContext.getMuteLists()
    ])

    let blogs: Partial<BlogCardDetails>[] = []
    const fetchEventsResult = settled[0]
    if (fetchEventsResult.status === 'fulfilled' && fetchEventsResult.value) {
      // Extract the blog card details from the events
      blogs = fetchEventsResult.value
        .map(extractBlogCardDetails)
        .filter((b) => b.naddr)
    } else if (fetchEventsResult.status === 'rejected') {
      log(
        true,
        LogType.Error,
        'Unable to fetch the blog events.',
        fetchEventsResult.reason
      )
      return []
    }

    const muteListResult = settled[1]
    if (muteListResult.status === 'fulfilled' && muteListResult.value) {
      // Filter out the blocked events
      blogs = blogs.filter(
        (b) =>
          b.aTag &&
          !muteListResult.value.admin.replaceableEvents.includes(b.aTag)
      )
    } else if (muteListResult.status === 'rejected') {
      log(
        true,
        LogType.Error,
        'Failed to fetch mutelists.',
        muteListResult.reason
      )
    }
    return blogs
  } catch (error) {
    log(
      true,
      LogType.Error,
      'An error occurred in fetching blog details from relays',
      error
    )
    return []
  }
}
