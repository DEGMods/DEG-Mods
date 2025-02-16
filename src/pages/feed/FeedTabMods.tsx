import { useAppSelector, useLocalStorage, useNDKContext } from 'hooks'
import { useEffect, useMemo, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import {
  FilterOptions,
  ModDetails,
  NSFWFilter,
  RepostFilter,
  SortBy
} from 'types'
import {
  constructModListFromEvents,
  DEFAULT_FILTER_OPTIONS,
  orderEventsChronologically
} from 'utils'
import { FeedPageLoaderResult } from './loader'
import {
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { ModCard } from 'components/ModCard'

export const FeedTabMods = () => {
  const SHOWING_STEP = 10
  const { muteLists, nsfwList, repostList, followList } =
    useLoaderData() as FeedPageLoaderResult
  const userState = useAppSelector((state) => state.user)
  const userPubkey = userState.user?.pubkey as string | undefined

  const filterKey = 'filter-feed-0'
  const [filterOptions] = useLocalStorage<FilterOptions>(filterKey, {
    ...DEFAULT_FILTER_OPTIONS
  })
  const { ndk } = useNDKContext()
  const [mods, setMods] = useState<ModDetails[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(true)
  const [showing, setShowing] = useState(SHOWING_STEP)

  useEffect(() => {
    if (!userPubkey) return

    setIsFetching(true)
    setIsLoadMoreVisible(true)
    const filter: NDKFilter = {
      authors: [...followList, userPubkey],
      kinds: [NDKKind.Classified],
      limit: 50
    }
    // If the source matches the current window location, add a filter condition
    if (filterOptions.source === window.location.host) {
      filter['#r'] = [window.location.host]
    }

    ndk
      .fetchEvents(filter, {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      .then((ndkEventSet) => {
        const ndkEvents = Array.from(ndkEventSet)
        setMods(constructModListFromEvents(ndkEvents))
      })
      .finally(() => {
        setIsFetching(false)
      })
  }, [filterOptions.source, followList, ndk, userPubkey])

  const filteredModList = useMemo(() => {
    const nsfwFilter = (mods: ModDetails[]) => {
      // Add nsfw tag to mods included in nsfwList
      if (filterOptions.nsfw !== NSFWFilter.Hide_NSFW) {
        mods = mods.map((mod) => {
          return !mod.nsfw && nsfwList.includes(mod.aTag)
            ? { ...mod, nsfw: true }
            : mod
        })
      }

      // Determine the filtering logic based on the NSFW filter option
      switch (filterOptions.nsfw) {
        case NSFWFilter.Hide_NSFW:
          // If 'Hide_NSFW' is selected, filter out NSFW mods
          return mods.filter((mod) => !mod.nsfw && !nsfwList.includes(mod.aTag))
        case NSFWFilter.Show_NSFW:
          // If 'Show_NSFW' is selected, return all mods (no filtering)
          return mods
        case NSFWFilter.Only_NSFW:
          // If 'Only_NSFW' is selected, filter to show only NSFW mods
          return mods.filter((mod) => mod.nsfw || nsfwList.includes(mod.aTag))
      }
    }

    const repostFilter = (mods: ModDetails[]) => {
      if (filterOptions.repost !== RepostFilter.Hide_Repost) {
        // Add repost tag to mods included in repostList
        mods = mods.map((mod) => {
          return !mod.repost && repostList.includes(mod.aTag)
            ? { ...mod, repost: true }
            : mod
        })
      }
      // Determine the filtering logic based on the Repost filter option
      switch (filterOptions.repost) {
        case RepostFilter.Hide_Repost:
          return mods.filter(
            (mod) => !mod.repost && !repostList.includes(mod.aTag)
          )
        case RepostFilter.Show_Repost:
          return mods
        case RepostFilter.Only_Repost:
          return mods.filter(
            (mod) => mod.repost || repostList.includes(mod.aTag)
          )
      }
    }

    let filtered = nsfwFilter(mods)
    filtered = repostFilter(filtered)

    // Filter out mods from muted authors and replaceable events
    filtered = filtered.filter(
      (mod) =>
        !muteLists.admin.authors.includes(mod.author) &&
        !muteLists.admin.replaceableEvents.includes(mod.aTag)
    )

    if (filterOptions.sort === SortBy.Latest) {
      filtered.sort((a, b) => b.published_at - a.published_at)
    } else if (filterOptions.sort === SortBy.Oldest) {
      filtered.sort((a, b) => a.published_at - b.published_at)
    }
    showing > 0 && filtered.splice(showing)
    return filtered
  }, [
    filterOptions.nsfw,
    filterOptions.repost,
    filterOptions.sort,
    mods,
    muteLists.admin.authors,
    muteLists.admin.replaceableEvents,
    nsfwList,
    repostList,
    showing
  ])

  if (!userPubkey) return null

  const handleLoadMore = () => {
    const LOAD_MORE_STEP = SHOWING_STEP * 2
    setShowing((prev) => prev + SHOWING_STEP)
    const lastMod = filteredModList[filteredModList.length - 1]
    const filter: NDKFilter = {
      authors: [...followList, userPubkey],
      kinds: [NDKKind.Classified],
      limit: LOAD_MORE_STEP
    }

    if (filterOptions.source === window.location.host) {
      filter['#r'] = [window.location.host]
    }

    if (filterOptions.sort === SortBy.Latest) {
      filter.until = lastMod.published_at
    } else if (filterOptions.sort === SortBy.Oldest) {
      filter.since = lastMod.published_at
    }

    setIsFetching(true)
    ndk
      .fetchEvents(filter, {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      .then((ndkEventSet) => {
        const ndkEvents = Array.from(ndkEventSet)
        orderEventsChronologically(
          ndkEvents,
          filterOptions.sort === SortBy.Latest
        )
        setMods((prevMods) => {
          const newMods = constructModListFromEvents(ndkEvents)
          const combinedMods = [...prevMods, ...newMods]
          const uniqueMods = Array.from(
            new Set(combinedMods.map((mod) => mod.id))
          )
            .map((id) => combinedMods.find((mod) => mod.id === id))
            .filter((mod): mod is ModDetails => mod !== undefined)

          if (newMods.length < LOAD_MORE_STEP) {
            setIsLoadMoreVisible(false)
          }

          return uniqueMods
        })
      })
      .finally(() => {
        setIsFetching(false)
      })
  }

  return (
    <>
      {isFetching && <LoadingSpinner desc='Fetching mod details from relays' />}
      {filteredModList.length === 0 && !isFetching && (
        <div className='IBMSMListFeedNoPosts'>
          <p>You aren't following people (or there are no posts to show)</p>
        </div>
      )}
      <div className='IBMSMSplitMainFullSideSec IBMSMSMFSSContent'>
        <div className='IBMSMList IBMSMListFeed'>
          {filteredModList.map((mod) => (
            <ModCard key={mod.id} {...mod} />
          ))}
        </div>
      </div>
      {!isFetching && isLoadMoreVisible && filteredModList.length > 0 && (
        <div className='IBMSMListFeedLoadMore'>
          <button
            className='btn btnMain IBMSMListFeedLoadMoreBtn'
            type='button'
            onClick={handleLoadMore}
          >
            Load More
          </button>
        </div>
      )}
    </>
  )
}
