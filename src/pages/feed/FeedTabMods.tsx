import {
  useAppSelector,
  useLocalStorage,
  useNDKContext,
  useServer,
  useFilteredMods
} from 'hooks'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useLoaderData } from 'react-router-dom'
import { FilterOptions, ModDetails, NSFWFilter, SortBy } from 'types'
import {
  constructModListFromEvents,
  DEFAULT_FILTER_OPTIONS,
  extractModData,
  isModDataComplete,
  orderEventsChronologically,
  scrollIntoView
} from 'utils'
import { FeedPageLoaderResult } from './loader'
import {
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { ModCard } from 'components/ModCard'
import { PaginatedRequest, ServerService } from 'controllers'
import { MOD_FILTER_LIMIT, T_TAG_VALUE } from '../../constants'
import { PaginationOffset } from 'components/Pagination'

export const FeedTabMods = () => {
  const SHOWING_STEP = 10
  const { muteLists, nsfwList, repostList, followList } =
    useLoaderData() as FeedPageLoaderResult
  const { isServerActive, isRelayFallbackActive } = useServer()
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

  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const [pagination, setPagination] = useState({
    limit: MOD_FILTER_LIMIT,
    total: 0,
    offset: 0,
    hasMore: false
  })
  const fetchModsWithPagination = useCallback(async (newOffset: number) => {
    setPagination((prev) => ({
      ...prev,
      offset: newOffset
    }))
    scrollIntoView(scrollTargetRef.current)
  }, [])

  useEffect(() => {
    if (!isServerActive || !userPubkey) return

    setIsFetching(true)
    const serverService = ServerService.getInstance()
    const data: PaginatedRequest = {
      kinds: [NDKKind.Classified],
      authors: [...followList, userPubkey],
      '#t': [T_TAG_VALUE],
      limit: pagination.limit,
      offset: pagination.offset,
      sort: filterOptions.sort === SortBy.Latest ? 'desc' : 'asc',
      sortBy: 'published_at'
    }
    if (filterOptions.nsfw !== NSFWFilter.Show_NSFW) {
      data['#nsfw'] = [
        filterOptions.nsfw === NSFWFilter.Only_NSFW ? 'true' : 'false'
      ]
    }
    if (filterOptions.source === window.location.host) {
      data['#r'] = [window.location.host]
    }
    serverService
      .fetch('mods', data)
      .then((res) => {
        setMods(res.events.filter(isModDataComplete).map(extractModData))
        setPagination(res.pagination)
      })
      .finally(() => {
        setIsFetching(false)
      })
  }, [
    filterOptions.nsfw,
    filterOptions.sort,
    filterOptions.source,
    followList,
    isServerActive,
    pagination.limit,
    pagination.offset,
    userPubkey
  ])

  useEffect(() => {
    if (!userPubkey || !isRelayFallbackActive) return

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
  }, [filterOptions.source, followList, isRelayFallbackActive, ndk, userPubkey])

  const filteredModList = useFilteredMods(
    mods,
    userState,
    filterOptions,
    nsfwList,
    muteLists,
    repostList
  )

  const displayedMods = useMemo(() => {
    const mods = [...filteredModList]
    if (showing > 0 && isRelayFallbackActive) {
      mods.splice(showing)
    }
    return mods
  }, [filteredModList, showing, isRelayFallbackActive])

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
      {isFetching && <LoadingSpinner desc="Fetching mod details from relays" />}
      {displayedMods.length === 0 && !isFetching && (
        <div className="IBMSMListFeedNoPosts">
          <p>You aren't following people (or there are no posts to show)</p>
        </div>
      )}
      <div className="IBMSMSplitMainFullSideSec IBMSMSMFSSContent">
        <div className="IBMSMList IBMSMListFeed" ref={scrollTargetRef}>
          {displayedMods.map((mod) => (
            <ModCard key={mod.id} {...mod} />
          ))}
        </div>
      </div>
      {isServerActive ? (
        <PaginationOffset
          total={pagination.total}
          limit={pagination.limit}
          offset={pagination.offset}
          hasMore={pagination.hasMore}
          onPageChange={fetchModsWithPagination}
        />
      ) : (
        !isFetching &&
        isLoadMoreVisible &&
        displayedMods.length > 0 && (
          <div className="IBMSMListFeedLoadMore">
            <button
              className="btn btnMain IBMSMListFeedLoadMoreBtn"
              type="button"
              onClick={handleLoadMore}
            >
              Load More
            </button>
          </div>
        )
      )}
    </>
  )
}
