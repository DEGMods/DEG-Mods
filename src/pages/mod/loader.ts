import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { PROFILE_BLOG_FILTER_LIMIT } from '../../constants'
import { NDKContextType } from 'contexts/NDKContext'
import { nip19 } from 'nostr-tools'
import { LoaderFunctionArgs, redirect } from 'react-router-dom'
import { appRoutes } from 'routes'
import { store } from 'store'
import {
  FilterOptions,
  ModeratedFilter,
  ModPageLoaderResult,
  NSFWFilter
} from 'types'
import {
  CurationSetIdentifiers,
  DEFAULT_FILTER_OPTIONS,
  extractBlogCardDetails,
  extractModData,
  getFallbackPubkey,
  getLocalStorageItem,
  getReportingSet,
  log,
  LogType,
  timeout
} from 'utils'

export const modRouteLoader =
  (ndkContext: NDKContextType) =>
  async ({ params, request }: LoaderFunctionArgs) => {
    const { naddr } = params
    if (!naddr) {
      log(true, LogType.Error, 'Required naddr.')
      return redirect(appRoutes.mods)
    }

    // Decode from naddr
    let pubkey: string | undefined
    let identifier: string | undefined
    let kind: number | undefined
    try {
      const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
      identifier = decoded.data.identifier
      kind = decoded.data.kind
      pubkey = decoded.data.pubkey
    } catch (error) {
      log(true, LogType.Error, `Failed to decode naddr: ${naddr}`, error)
      throw new Error('Failed to fetch the mod. The address might be wrong')
    }

    const userState = store.getState().user
    const loggedInUserPubkey =
      (userState?.user?.pubkey as string | undefined) || getFallbackPubkey()
    const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB

    // Check if editing and the user is the original author
    // Redirect if NOT
    const url = new URL(request.url)
    const isEditMode = url.pathname.includes('edit-mod')
    if (isEditMode && loggedInUserPubkey !== pubkey) {
      return redirect(appRoutes.mods)
    }

    try {
      // Set up the filters
      // Main mod content
      const modFilter: NDKFilter = {
        '#a': [identifier],
        authors: [pubkey],
        kinds: [kind]
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

      // Parallel fetch mod event, latest events, mute, nsfw, repost lists
      const settled = await Promise.allSettled([
        (async () => {
          const result = await Promise.race([
            ndkContext.fetchEvent(modFilter),
            timeout(2000)
          ])
          return result
        })(),
        (async () => {
          const result = await Promise.race([
            ndkContext.fetchEvents(latestFilter),
            timeout(2000)
          ])
          return result
        })(),
        (async () => {
          const result = await ndkContext.getMuteLists(loggedInUserPubkey)
          return result
        })(),
        (async () => {
          const result = await getReportingSet(
            CurationSetIdentifiers.NSFW,
            ndkContext
          )
          return result
        })(),
        (async () => {
          const result = await getReportingSet(
            CurationSetIdentifiers.Repost,
            ndkContext
          )
          return result
        })()
      ])

      const result: ModPageLoaderResult = {
        mod: undefined,
        event: undefined,
        latest: [],
        isAddedToNSFW: false,
        isBlocked: false,
        isRepost: false,
        isHardBlocked: false,
        hardBlockedType: undefined
      }

      // Check the mod event result
      const fetchEventResult = settled[0]
      if (fetchEventResult.status === 'fulfilled' && fetchEventResult.value) {
        // Save original event
        result.event = fetchEventResult.value

        // Extract the mod data from the event
        result.mod = extractModData(fetchEventResult.value)
      } else if (fetchEventResult.status === 'rejected') {
        log(
          true,
          LogType.Error,
          'Unable to fetch the mod event.',
          fetchEventResult.reason
        )
      }

      // Throw an error if we are missing the main mod result
      // Handle it with the react-router's errorComponent
      if (!result.mod) {
        throw new Error('We are unable to find the mod on the relays')
      }

      // Check the latest blog events
      const fetchEventsResult = settled[1]
      if (fetchEventsResult.status === 'fulfilled' && fetchEventsResult.value) {
        // Extract the blog card details from the events
        result.latest = fetchEventsResult.value.map(extractBlogCardDetails)
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
          if (result.mod && result.mod.aTag) {
            // Check for hard blocks first
            if (
              muteLists.value.admin.hardBlockedEvents.includes(
                result.mod.aTag
              ) ||
              muteLists.value.admin.hardBlockedAuthors.includes(
                result.mod.author
              )
            ) {
              result.isHardBlocked = true
              result.postWarning = 'admin'

              // Determine whether the post or user is blocked
              if (
                muteLists.value.admin.hardBlockedEvents.includes(
                  result.mod.aTag
                )
              ) {
                result.hardBlockedType = 'post'
              } else if (
                muteLists.value.admin.hardBlockedAuthors.includes(
                  result.mod.author
                )
              ) {
                result.hardBlockedType = 'user'
              }
            }
            // Show user or admin post warning if any mute list includes either post or author
            else if (
              muteLists.value.user.replaceableEvents.includes(
                result.mod.aTag
              ) ||
              muteLists.value.user.authors.includes(result.mod.author)
            ) {
              result.postWarning = 'user'
            }

            if (
              muteLists.value.admin.replaceableEvents.includes(
                result.mod.aTag
              ) ||
              muteLists.value.admin.authors.includes(result.mod.author)
            ) {
              result.postWarning = 'admin'
            }

            // Check if user has blocked this profile
            if (
              muteLists.value.user.replaceableEvents.includes(
                result.mod.aTag
              ) &&
              !muteLists.value.admin.hardBlockedEvents.includes(result.mod.aTag)
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
        // Check if the mod is marked as NSFW
        // Mark it as NSFW only if it's missing the tag
        if (result.mod) {
          const isMissingNsfwTag =
            !result.mod.nsfw &&
            result.mod.aTag &&
            nsfwList.value.includes(result.mod.aTag)

          if (isMissingNsfwTag) {
            result.mod.nsfw = true
          }

          if (result.mod.aTag && nsfwList.value.includes(result.mod.aTag)) {
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

      const repostList = settled[4]
      if (repostList.status === 'fulfilled' && repostList.value) {
        // Check if the mod is marked as Repost
        // Mark it as Repost only if it's missing the tag
        if (result.mod) {
          const isMissingRepostTag =
            !result.mod.repost &&
            result.mod.aTag &&
            repostList.value.includes(result.mod.aTag)

          if (isMissingRepostTag) {
            result.mod.repost = true
          }

          if (result.mod.aTag && repostList.value.includes(result.mod.aTag)) {
            result.isRepost = true
          }
        }
      } else if (repostList.status === 'rejected') {
        log(true, LogType.Error, 'Issue fetching nsfw list', repostList.reason)
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
      let message = 'An error occurred in fetching mod details from relays'
      log(true, LogType.Error, message, error)
      if (error instanceof Error) {
        message = error.message
        throw new Error(message)
      }
    }
  }
