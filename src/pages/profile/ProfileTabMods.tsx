import {
  NDKSubscription,
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { ModFilter } from 'components/Filters/ModsFilter'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { ModCard } from 'components/ModCard'
import { MOD_FILTER_LIMIT, T_TAG_VALUE } from '../../constants'
import { FetchModsOptions } from 'contexts/NDKContext'
import {
  useNDKContext,
  useAppSelector,
  useServer,
  useLocalStorage,
  useFilteredMods
} from 'hooks'
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useLoaderData } from 'react-router-dom'
import {
  ModDetails,
  FilterOptions,
  SortBy,
  NSFWFilter,
  RepostFilter
} from 'types'
import {
  scrollIntoView,
  DEFAULT_FILTER_OPTIONS,
  isModDataComplete,
  extractModData,
  getFallbackPubkey
} from 'utils'
import { ProfilePageLoaderResult } from './loader'
import { PaginationOffset } from 'components/Pagination'
import { ServerService, PaginatedRequest } from 'controllers'

export const ProfileTabMods = () => {
  const { profilePubkey, repostList, muteLists, nsfwList } =
    useLoaderData() as ProfilePageLoaderResult
  const { ndk, fetchMods } = useNDKContext()
  const userState = useAppSelector((state) => state.user)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSpinnerDesc, setLoadingSpinnerDesc] = useState('')
  const [mods, setMods] = useState<ModDetails[]>([])
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(false)

  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const { isServerActive, isRelayFallbackActive } = useServer()
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
  const filterKey = 'filter-profile'
  const [filterOptions] = useLocalStorage<FilterOptions>(filterKey, {
    ...DEFAULT_FILTER_OPTIONS
  })
  const lastMod: ModDetails | undefined = useMemo(() => {
    // For the latest sort find oldest mod
    // for the oldest sort find newest mod
    return mods.reduce((prev, current) => {
      if (!prev) return current
      if (filterOptions.sort === SortBy.Latest) {
        return current.edited_at < prev.edited_at ? current : prev
      } else if (filterOptions.sort === SortBy.Oldest) {
        return current.edited_at > prev.edited_at ? current : prev
      }
      return prev
    }, undefined as ModDetails | undefined)
  }, [mods, filterOptions.sort])

  useEffect(() => {
    if (!isServerActive) return

    setIsLoading(true)
    const serverService = ServerService.getInstance()
    const data: PaginatedRequest = {
      kinds: [NDKKind.Classified],
      authors: [profilePubkey],
      '#t': [T_TAG_VALUE],
      limit: pagination.limit,
      offset: pagination.offset,
      sort: filterOptions.sort === SortBy.Latest ? 'desc' : 'asc',
      sortBy: 'published_at',
      moderation: filterOptions.moderated,
      wot: filterOptions.wot,
      userMuteList: {
        authors: [...muteLists.user.authors],
        events: [...muteLists.user.replaceableEvents]
      }
    }
    const loggedInUserPubkey =
      (userState?.user?.pubkey as string | undefined) || getFallbackPubkey()
    if (loggedInUserPubkey) data.pubkey = loggedInUserPubkey
    if (filterOptions.nsfw !== NSFWFilter.Show_NSFW) {
      data['#nsfw'] = [
        filterOptions.nsfw === NSFWFilter.Only_NSFW ? 'true' : 'false'
      ]
    }
    if (filterOptions.repost !== RepostFilter.Show_Repost) {
      data['#repost'] = [
        filterOptions.repost === RepostFilter.Only_Repost ? 'true' : 'false'
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
        setIsLoading(false)
      })
  }, [
    filterOptions.moderated,
    filterOptions.nsfw,
    filterOptions.repost,
    filterOptions.sort,
    filterOptions.source,
    filterOptions.wot,
    isServerActive,
    muteLists.user.authors,
    muteLists.user.replaceableEvents,
    pagination.limit,
    pagination.offset,
    profilePubkey,
    userState?.user?.pubkey
  ])

  useEffect(() => {
    if (!isRelayFallbackActive) return
    setIsLoading(true)
    setLoadingSpinnerDesc('Fetching mods..')
    fetchMods({ source: filterOptions.source, author: profilePubkey })
      .then((res) => {
        if (filterOptions.sort === SortBy.Latest) {
          res.sort((a, b) => b.published_at - a.published_at)
        } else if (filterOptions.sort === SortBy.Oldest) {
          res.sort((a, b) => a.published_at - b.published_at)
        }
        setIsLoadMoreVisible(res.length >= MOD_FILTER_LIMIT)
        setMods(res.slice(0, MOD_FILTER_LIMIT))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [
    fetchMods,
    filterOptions.sort,
    filterOptions.source,
    isRelayFallbackActive,
    profilePubkey
  ])

  const handleLoadMore = useCallback(() => {
    setIsLoading(true)

    const fetchModsOptions: FetchModsOptions = {
      source: filterOptions.source,
      author: profilePubkey
    }

    if (lastMod) {
      if (filterOptions.sort === SortBy.Latest) {
        fetchModsOptions.until = lastMod.edited_at - 1
      } else if (filterOptions.sort === SortBy.Oldest) {
        fetchModsOptions.since = lastMod.edited_at + 1
      }
    }

    fetchMods(fetchModsOptions)
      .then((res) => {
        setMods((prevMods) => {
          const newMods = res
          const combinedMods = [...prevMods, ...newMods]
          const uniqueMods = Array.from(
            new Set(combinedMods.map((mod) => mod.id))
          )
            .map((id) => combinedMods.find((mod) => mod.id === id))
            .filter((mod): mod is ModDetails => mod !== undefined)

          setIsLoadMoreVisible(newMods.length >= MOD_FILTER_LIMIT)

          return uniqueMods
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [
    fetchMods,
    filterOptions.sort,
    filterOptions.source,
    lastMod,
    profilePubkey
  ])

  // Add missing mods to the list
  useEffect(() => {
    let sub: NDKSubscription
    if (isRelayFallbackActive && lastMod && profilePubkey) {
      const filter: NDKFilter = {
        kinds: [NDKKind.Classified],
        '#t': [T_TAG_VALUE],
        authors: [profilePubkey]
      }
      if (filterOptions.sort === SortBy.Latest) {
        filter.since = lastMod.edited_at + 1
      } else if (filterOptions.sort === SortBy.Oldest) {
        filter.until = lastMod.edited_at - 1
      }
      if (filterOptions.source === window.location.host) {
        filter['#r'] = [window.location.host]
      }
      sub = ndk.subscribe(
        filter,
        {
          closeOnEose: false,
          cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
        },
        undefined,
        {
          onEvent: (ndkEvent) => {
            setMods((prevMods) => {
              // Skip if not valid
              if (!isModDataComplete(ndkEvent)) {
                return prevMods
              }

              // Skip existing
              if (
                prevMods.find(
                  (e) =>
                    e.id === ndkEvent.id ||
                    prevMods.findIndex((n) => n.id === ndkEvent.id) !== -1
                )
              ) {
                return prevMods
              }
              const newMod = extractModData(ndkEvent)
              return [...prevMods, newMod]
            })
          }
        }
      )
    }
    return () => {
      if (sub) sub.stop()
    }
  }, [
    filterOptions.sort,
    filterOptions.source,
    isRelayFallbackActive,
    lastMod,
    ndk,
    profilePubkey
  ])

  const filteredModList = useFilteredMods(
    mods,
    userState,
    filterOptions,
    nsfwList,
    muteLists,
    repostList,
    profilePubkey
  )

  return (
    <>
      {isLoading && <LoadingSpinner desc={loadingSpinnerDesc} />}

      <ModFilter filterKey={filterKey} author={profilePubkey} />

      <div className='IBMSMList IBMSMListAlt' ref={scrollTargetRef}>
        {filteredModList.map((mod) => (
          <ModCard key={mod.id} {...mod} />
        ))}
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
        !isLoading &&
        isLoadMoreVisible &&
        filteredModList.length > 0 && (
          <div className='IBMSMListFeedLoadMore'>
            <button
              className='btn btnMain IBMSMListFeedLoadMoreBtn'
              type='button'
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
