import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { PROFILE_BLOG_FILTER_LIMIT } from '../../constants'
import { NDKContextType } from 'contexts/NDKContext'
import { nip19 } from 'nostr-tools'
import { LoaderFunctionArgs, redirect } from 'react-router-dom'
import { appRoutes } from 'routes'
import { store } from 'store'
import {
  BlogPageLoaderResult,
  FilterOptions,
  ModeratedFilter,
  NSFWFilter
} from 'types'
import {
  DEFAULT_FILTER_OPTIONS,
  getFallbackPubkey,
  getLocalStorageItem,
  log,
  LogType
} from 'utils'
import { extractBlogCardDetails, extractBlogDetails } from 'utils/blog'

export const blogRouteLoader =
  (ndkContext: NDKContextType) =>
  async ({ params, request }: LoaderFunctionArgs) => {
    const { naddr } = params
    if (!naddr) {
      log(true, LogType.Error, 'Required naddr.')
      return redirect(appRoutes.blogs)
    }

    // Decode author and identifier from naddr
    let pubkey: string | undefined
    let identifier: string | undefined
    try {
      const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
      pubkey = decoded.data.pubkey
      identifier = decoded.data.identifier
    } catch (error) {
      log(true, LogType.Error, `Failed to decode naddr: ${naddr}`, error)
      throw new Error('Failed to fetch the blog. The address might be wrong')
    }

    const userState = store.getState().user
    const loggedInUserPubkey =
      (userState?.user?.pubkey as string | undefined) || getFallbackPubkey()
    const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB

    // Check if editing and the user is the original author
    // Redirect if NOT
    const url = new URL(request.url)
    const isEditMode = url.pathname.endsWith('/edit')
    if (isEditMode && loggedInUserPubkey !== pubkey) {
      return redirect(appRoutes.blogs)
    }

    try {
      // Set the filter for the main blog content
      const filter = {
        kinds: [NDKKind.Article],
        authors: [pubkey],
        '#d': [identifier]
      }

      // Get the blog filter options for latest blogs
      const filterOptions = JSON.parse(
        getLocalStorageItem('filter-blog', DEFAULT_FILTER_OPTIONS)
      ) as FilterOptions

      // Fetch more in case the current blog is included in the latest and filters remove some
      const latestFilter: NDKFilter = {
        authors: [pubkey],
        kinds: [NDKKind.Article],
        limit: PROFILE_BLOG_FILTER_LIMIT
      }
      // Add source filter
      if (filterOptions.source === window.location.host) {
        latestFilter['#r'] = [filterOptions.source]
      }
      // Filter by NSFW tag
      // NSFWFilter.Only_NSFW -> fetch with content-warning label
      // NSFWFilter.Show_NSFW -> filter not needed
      // NSFWFilter.Hide_NSFW -> up the limit and filter after fetch
      if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
        latestFilter['#L'] = ['content-warning']
      }

      // Parallel fetch blog event, latest events, mute, and nsfw lists
      const settled = await Promise.allSettled([
        ndkContext.fetchEvent(filter),
        ndkContext.fetchEvents(latestFilter),
        ndkContext.getMuteLists(loggedInUserPubkey), // Pass pubkey for logged-in users
        ndkContext.getNSFWList()
      ])
      const result: BlogPageLoaderResult = {
        blog: undefined,
        event: undefined,
        latest: [],
        isAddedToNSFW: false,
        isBlocked: false
      }

      // Check the blog event result
      const fetchEventResult = settled[0]
      if (fetchEventResult.status === 'fulfilled' && fetchEventResult.value) {
        // Save original event
        result.event = fetchEventResult.value

        // Extract the blog details from the event
        result.blog = extractBlogDetails(fetchEventResult.value)
      } else if (fetchEventResult.status === 'rejected') {
        log(
          true,
          LogType.Error,
          'Unable to fetch the blog event.',
          fetchEventResult.reason
        )
      }

      // Throw an error if we are missing the main blog result
      // Handle it with the react-router's errorComponent
      if (!result.blog) {
        throw new Error('We are unable to find the blog on the relays')
      }

      // Check the latest blog events
      const fetchEventsResult = settled[1]
      if (fetchEventsResult.status === 'fulfilled' && fetchEventsResult.value) {
        // Extract the blog card details from the events
        result.latest = fetchEventsResult.value
          .map(extractBlogCardDetails)
          .filter((b) => b.id !== result.blog?.id) // Filter out current blog if present
      } else if (fetchEventsResult.status === 'rejected') {
        log(
          true,
          LogType.Error,
          'Unable to fetch the latest blog events.',
          fetchEventsResult.reason
        )
      }

      const muteLists = settled[2]
      if (muteLists.status === 'fulfilled' && muteLists.value) {
        if (muteLists && muteLists.value) {
          if (result.blog && result.blog.aTag) {
            // Show user or admin post warning if any mute list includes either post or author
            if (
              muteLists.value.user.replaceableEvents.includes(
                result.blog.aTag
              ) ||
              (result.blog.author &&
                muteLists.value.user.authors.includes(result.blog.author))
            ) {
              result.postWarning = 'user'
            }

            if (
              muteLists.value.admin.replaceableEvents.includes(
                result.blog.aTag
              ) ||
              (result.blog.author &&
                muteLists.value.admin.authors.includes(result.blog.author))
            ) {
              result.postWarning = 'admin'
            }

            if (
              muteLists.value.user.replaceableEvents.includes(result.blog.aTag)
            ) {
              result.isBlocked = true
            }
          }

          // Moderate the latest
          const isOwner =
            userState.user?.pubkey && userState.user.pubkey === pubkey
          const isUnmoderatedFully =
            filterOptions.moderated === ModeratedFilter.Unmoderated_Fully

          // Only apply filtering if the user is not an admin or the admin has not selected "Unmoderated Fully"
          // Allow "Unmoderated Fully" when author visits own profile
          if (!((isAdmin || isOwner) && isUnmoderatedFully)) {
            result.latest = result.latest.filter(
              (b) =>
                !muteLists.value.admin.authors.includes(b.author!) &&
                !muteLists.value.admin.replaceableEvents.includes(b.aTag!)
            )
          }

          if (filterOptions.moderated === ModeratedFilter.Moderated) {
            result.latest = result.latest.filter(
              (b) =>
                !muteLists.value.user.authors.includes(b.author!) &&
                !muteLists.value.user.replaceableEvents.includes(b.aTag!)
            )
          }
        }
      } else if (muteLists.status === 'rejected') {
        log(true, LogType.Error, 'Issue fetching mute list', muteLists.reason)
      }

      const nsfwList = settled[3]
      if (nsfwList.status === 'fulfilled' && nsfwList.value) {
        // Check if the blog is marked as NSFW
        // Mark it as NSFW only if it's missing the tag
        if (result.blog) {
          const isMissingNsfwTag =
            !result.blog.nsfw &&
            result.blog.aTag &&
            nsfwList.value.includes(result.blog.aTag)

          if (isMissingNsfwTag) {
            result.blog.nsfw = true
          }

          if (result.blog.aTag && nsfwList.value.includes(result.blog.aTag)) {
            result.isAddedToNSFW = true
          }
        }

        // Check the latest blogs too
        result.latest = result.latest.map((b) => {
          // Add nsfw tag if it's missing
          const isMissingNsfwTag =
            !b.nsfw && b.aTag && nsfwList.value.includes(b.aTag)

          if (isMissingNsfwTag) {
            b.nsfw = true
          }
          return b
        })
      } else if (nsfwList.status === 'rejected') {
        log(true, LogType.Error, 'Issue fetching nsfw list', nsfwList.reason)
      }

      // Filter latest, sort and take only three
      result.latest = result.latest
        .filter(
          // Filter out the NSFW if selected
          (b) => !(b.nsfw && filterOptions.nsfw === NSFWFilter.Hide_NSFW)
        )
        .sort((a, b) =>
          a.published_at && b.published_at ? b.published_at - a.published_at : 0
        )
        .slice(0, 3)

      return result
    } catch (error) {
      let message = 'An error occurred in fetching blog details from relays'
      log(true, LogType.Error, message, error)
      if (error instanceof Error) {
        message = error.message
        throw new Error(message)
      }
    }
  }
