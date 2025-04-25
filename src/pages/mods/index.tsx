import { ModFilter } from 'components/Filters/ModsFilter'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createSearchParams,
  useLoaderData,
  useNavigate
} from 'react-router-dom'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ModCard } from '../../components/ModCard'
import { MOD_FILTER_LIMIT, T_TAG_VALUE } from '../../constants'
import {
  useAppSelector,
  useFilteredMods,
  useLocalStorage,
  useNDKContext
} from '../../hooks'
import { appRoutes } from '../../routes'
import '../../styles/filters.css'
import '../../styles/pagination.css'
import '../../styles/search.css'
import '../../styles/styles.css'
import {
  FilterOptions,
  ModDetails,
  NSFWFilter,
  RepostFilter,
  SortBy
} from '../../types'
import {
  DEFAULT_FILTER_OPTIONS,
  extractModData,
  getFallbackPubkey,
  isModDataComplete,
  scrollIntoView
} from 'utils'
import { SearchInput } from 'components/SearchInput'
import { ModsPageLoaderResult } from './loader'
import { FetchModsOptions } from 'contexts/NDKContext'
import {
  NDKFilter,
  NDKKind,
  NDKSubscription,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { PaginationOffset } from 'components/Pagination'
import { PaginatedRequest, ServerService } from 'controllers'
import { useServer } from 'hooks'

export const ModsPage = () => {
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const { repostList, muteLists, nsfwList } =
    useLoaderData() as ModsPageLoaderResult
  const { isServerActive, isRelayFallbackActive } = useServer()
  const { ndk, fetchMods } = useNDKContext()
  const [isFetching, setIsFetching] = useState(false)
  const [mods, setMods] = useState<ModDetails[]>([])
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(true)
  const [filterOptions] = useLocalStorage<FilterOptions>(
    'filter',
    DEFAULT_FILTER_OPTIONS
  )
  const [pagination, setPagination] = useState({
    limit: MOD_FILTER_LIMIT,
    total: 0,
    offset: 0,
    hasMore: false
  })
  const userState = useAppSelector((state) => state.user)
  const { userWot, userWotLevel } = useAppSelector((state) => state.wot)
  const fetchModsWithPagination = useCallback(async (newOffset: number) => {
    setPagination((prev) => ({
      ...prev,
      offset: newOffset
    }))
    scrollIntoView(scrollTargetRef.current)
  }, [])

  useEffect(() => {
    if (isServerActive) {
      setIsFetching(true)
      const serverService = ServerService.getInstance()
      const data: PaginatedRequest = {
        kinds: [NDKKind.Classified],
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
        },
        userWot,
        userWotScore: userWotLevel
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
          setIsFetching(false)
        })
    }
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
    userState?.user?.pubkey,
    userWot,
    userWotLevel
  ])
  useEffect(() => {
    if (isRelayFallbackActive) {
      setIsFetching(true)
      fetchMods({ source: filterOptions.source })
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
          setIsFetching(false)
        })
    }
  }, [
    fetchMods,
    filterOptions.sort,
    filterOptions.source,
    isRelayFallbackActive
  ])

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

  // Add missing mods to the list
  useEffect(() => {
    let sub: NDKSubscription
    if (isRelayFallbackActive && lastMod) {
      const filter: NDKFilter = {
        kinds: [NDKKind.Classified],
        '#t': [T_TAG_VALUE]
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
    ndk
  ])

  const handleLoadMore = useCallback(() => {
    setIsFetching(true)

    const fetchModsOptions: FetchModsOptions = {
      source: filterOptions.source
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
        setIsFetching(false)
      })
  }, [fetchMods, filterOptions, lastMod])

  const filteredModList = useFilteredMods(
    mods,
    userState,
    filterOptions,
    nsfwList,
    muteLists,
    repostList
  )

  return (
    <>
      {isFetching && <LoadingSpinner desc='Fetching mod details from relays' />}
      <div className='InnerBodyMain'>
        <div className='ContainerMain'>
          <div
            className='IBMSecMainGroup IBMSecMainGroupAlt'
            ref={scrollTargetRef}
          >
            <PageTitleRow />
            <ModFilter />

            <div className='IBMSecMain IBMSMListWrapper'>
              <div className='IBMSMList'>
                {filteredModList.map((mod) => (
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
          </div>
        </div>
      </div>
    </>
  )
}

const PageTitleRow = React.memo(() => {
  const navigate = useNavigate()
  const searchTermRef = useRef<HTMLInputElement>(null)

  const handleSearch = () => {
    const value = searchTermRef.current?.value || '' // Access the input value from the ref
    if (value !== '') {
      const searchParams = createSearchParams({
        q: value,
        kind: 'Mods'
      })
      navigate({ pathname: appRoutes.search, search: `?${searchParams}` })
    }
  }

  // Handle "Enter" key press inside the input
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className='IBMSecMain'>
      <div className='SearchMainWrapper'>
        <div className='IBMSMTitleMain'>
          <h2 className='IBMSMTitleMainHeading'>Mods</h2>
        </div>
        <SearchInput
          ref={searchTermRef}
          handleKeyDown={handleKeyDown}
          handleSearch={handleSearch}
        />
      </div>
    </div>
  )
})
