import { useContext, useCallback, useMemo } from 'react'
import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { PROFILE_BLOG_FILTER_LIMIT } from '../../constants'
import { NDKContext } from 'contexts/NDKContext'
import { nip19 } from 'nostr-tools'
import { redirect, useParams, useLocation } from 'react-router-dom'
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
import { useAsyncLoader } from '../../hooks'

const useModData = (): ModPageLoaderResult => {
  const ndkContext = useContext(NDKContext)
  const params = useParams()
  const location = useLocation()
  const { naddr } = params
  if (!naddr) {
    log(true, LogType.Error, 'Required naddr.')
    redirect(appRoutes.mods)
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
  const isEditMode = location.pathname.includes('edit-mod')
  if (isEditMode && loggedInUserPubkey !== pubkey) {
    redirect(appRoutes.mods)
  }

  const result: ModPageLoaderResult = {
    mod: undefined,
    event: undefined,
    latest: [],
    isAddedToNSFW: false,
    isBlocked: false,
    isRepost: false
  }

  // Set up the filters
  // Main mod content
  const modFilter: NDKFilter = useMemo(
    () => ({
      '#a': [identifier],
      authors: [pubkey],
      kinds: [kind]
    }),
    [identifier, pubkey, kind]
  )

  // Get the blog filter options for latest blogs
  const filterOptions = JSON.parse(
    getLocalStorageItem('filter-blog', DEFAULT_FILTER_OPTIONS)
  ) as FilterOptions

  // Fetch more in case the current blog is included in the latest and filters remove some
  const latestFilter: NDKFilter = useMemo(() => {
    const filter: NDKFilter = {
      authors: [pubkey],
      kinds: [NDKKind.Article],
      limit: PROFILE_BLOG_FILTER_LIMIT
    }

    // Add source filter
    if (filterOptions.source === window.location.host) {
      filter['#r'] = [filterOptions.source]
    }
    // Filter by NSFW tag
    // NSFWFilter.Only_NSFW -> fetch with content-warning label
    // NSFWFilter.Show_NSFW -> filter not needed
    // NSFWFilter.Hide_NSFW -> up the limit and filter after fetch
    if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
      filter['#L'] = ['content-warning']
    }

    return filter
  }, [pubkey, filterOptions.source, filterOptions.nsfw])

  // Parallel fetch mod event, latest events, mute, nsfw, repost lists
  const { data: modEvent, error: modEventError } = useAsyncLoader(
    useCallback(async () => {
      if (!ndkContext) {
        throw new Error('NDK context is not available')
      }
      if (!naddr) {
        throw new Error('Required naddr.')
      }

      const start = performance.now()
      const result = await Promise.race([
        ndkContext.fetchEvent(modFilter),
        timeout(2000)
      ])
      const end = performance.now()
      log(true, LogType.Info, `MARK: fetchEvent took ${end - start}ms`)
      return result
    }, [naddr, ndkContext, modFilter])
  )

  const { data: latestEvents, error: latestEventsError } = useAsyncLoader(
    useCallback(async () => {
      if (!ndkContext) {
        throw new Error('NDK context is not available')
      }

      const start = performance.now()
      const result = await Promise.race([
        ndkContext.fetchEvents(latestFilter),
        timeout(2000)
      ])
      const end = performance.now()
      log(true, LogType.Info, `MARK: fetchEvents took ${end - start}ms`)
      return result
    }, [ndkContext, latestFilter])
  )

  const { data: muteLists, error: muteListsError } = useAsyncLoader(
    useCallback(async () => {
      if (!ndkContext) {
        throw new Error('NDK context is not available')
      }

      const start = performance.now()
      const result = await ndkContext.getMuteLists(loggedInUserPubkey)
      const end = performance.now()
      log(true, LogType.Info, `MARK: getMuteLists took ${end - start}ms`)
      return result
    }, [ndkContext, loggedInUserPubkey])
  )

  const { data: nsfwList, error: nsfwListError } = useAsyncLoader(
    useCallback(async () => {
      if (!ndkContext) {
        throw new Error('NDK context is not available')
      }

      const start = performance.now()
      const result = await getReportingSet(
        CurationSetIdentifiers.NSFW,
        ndkContext
      )
      const end = performance.now()
      log(true, LogType.Info, `MARK: getNSFWReportingSet took ${end - start}ms`)
      return result
    }, [ndkContext])
  )

  const { data: repostList, error: repostListError } = useAsyncLoader(
    useCallback(async () => {
      if (!ndkContext) {
        throw new Error('NDK context is not available')
      }

      const start = performance.now()
      const result = await getReportingSet(
        CurationSetIdentifiers.Repost,
        ndkContext
      )
      const end = performance.now()
      log(
        true,
        LogType.Info,
        `MARK: getRepostReportingSet took ${end - start}ms`
      )
      return result
    }, [ndkContext])
  )

  // Process the results
  if (modEvent) {
    // Save original event
    result.event = modEvent

    // Extract the mod data from the event
    result.mod = extractModData(modEvent)
  } else if (modEventError) {
    log(true, LogType.Error, 'Unable to fetch the mod event.', modEventError)
    throw new Error('We are unable to find the mod on the relays')
  }

  // Check the latest blog events
  if (latestEvents) {
    // Extract the blog card details from the events
    result.latest = latestEvents.map(extractBlogCardDetails)
  } else if (latestEventsError) {
    log(
      true,
      LogType.Error,
      'Unable to fetch the latest blog events.',
      latestEventsError
    )
  }

  // Process mute lists
  if (muteLists) {
    if (result.mod && result.mod.aTag) {
      // Show user or admin post warning if any mute list includes either post or author
      if (
        muteLists.user.replaceableEvents.includes(result.mod.aTag) ||
        muteLists.user.authors.includes(result.mod.author)
      ) {
        result.postWarning = 'user'
      }

      if (
        muteLists.admin.replaceableEvents.includes(result.mod.aTag) ||
        muteLists.admin.authors.includes(result.mod.author)
      ) {
        result.postWarning = 'admin'
      }

      // Check if user has blocked this profile
      if (muteLists.user.replaceableEvents.includes(result.mod.aTag)) {
        result.isBlocked = true
      }
    }

    // Moderate the latest
    const isOwner = userState.user?.pubkey && userState.user.pubkey === pubkey
    const isUnmoderatedFully =
      filterOptions.moderated === ModeratedFilter.Unmoderated_Fully

    // Only apply filtering if the user is not an admin or the admin has not selected "Unmoderated Fully"
    // Allow "Unmoderated Fully" when author visits own profile
    if (!((isAdmin || isOwner) && isUnmoderatedFully)) {
      result.latest = result.latest.filter(
        (b) =>
          !muteLists.admin.authors.includes(b.author!) &&
          !muteLists.admin.replaceableEvents.includes(b.aTag!)
      )
    }

    if (filterOptions.moderated === ModeratedFilter.Moderated) {
      result.latest = result.latest.filter(
        (b) =>
          !muteLists.user.authors.includes(b.author!) &&
          !muteLists.user.replaceableEvents.includes(b.aTag!)
      )
    }
  } else if (muteListsError) {
    log(true, LogType.Error, 'Issue fetching mute list', muteListsError)
  }

  // Process NSFW list
  if (nsfwList) {
    if (result.mod && result.mod.aTag) {
      result.isAddedToNSFW = nsfwList.includes(result.mod.aTag)
    }
  } else if (nsfwListError) {
    log(true, LogType.Error, 'Issue fetching NSFW list', nsfwListError)
  }

  // Process repost list
  if (repostList) {
    if (result.mod && result.mod.aTag) {
      result.isRepost = repostList.includes(result.mod.aTag)
    }
  } else if (repostListError) {
    log(true, LogType.Error, 'Issue fetching repost list', repostListError)
  }

  return result
}

export default useModData
