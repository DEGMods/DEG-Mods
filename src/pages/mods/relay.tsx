import { ModFilter } from 'components/Filters/ModsFilter'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ModCard } from '../../components/ModCard'
import { MOD_FILTER_LIMIT, T_TAG_VALUE } from '../../constants'
import {
  useAppSelector,
  useFilteredMods,
  useLocalStorage,
  useNDKContext
} from '../../hooks'
import '../../styles/filters.css'
import '../../styles/pagination.css'
import '../../styles/search.css'
import '../../styles/styles.css'
import { FilterOptions, ModDetails, SortBy } from '../../types'
import {
  DEFAULT_FILTER_OPTIONS,
  extractModData,
  isModDataComplete
} from 'utils'
import { ModsPageLoaderResult } from './loader'
import { FetchModsOptions } from 'contexts/NDKContext'
import { useSearchParams } from 'react-router-dom'
import {
  NDKFilter,
  NDKKind,
  NDKSubscription,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { PageTitleRow } from './PageTitleRow'

export const ModsPageWithRelays = () => {
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const [searchParams] = useSearchParams()
  const tags =
    searchParams
      .get('t')
      ?.split(',')
      .map((tag) => decodeURIComponent(tag)) || []
  const excludeTags =
    searchParams
      .get('et')
      ?.split(',')
      .map((tag) => decodeURIComponent(tag)) || []
  const { repostList, muteLists, nsfwList } =
    useLoaderData() as ModsPageLoaderResult
  const { ndk, fetchMods } = useNDKContext()
  const [isFetching, setIsFetching] = useState(false)
  const [mods, setMods] = useState<ModDetails[]>([])
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(true)
  const [filterOptions] = useLocalStorage<FilterOptions>(
    'filter',
    DEFAULT_FILTER_OPTIONS
  )
  const userState = useAppSelector((state) => state.user)

  useEffect(() => {
    setIsFetching(true)
    console.log('[ModsPageWithRelays] Starting initial mod fetch...')
    fetchMods({ source: filterOptions.source })
      .then((res) => {
        console.log(
          `[ModsPageWithRelays] Initial fetch returned ${res.length} mods`
        )
        if (filterOptions.sort === SortBy.Latest) {
          res.sort((a, b) => b.published_at - a.published_at)
        } else if (filterOptions.sort === SortBy.Oldest) {
          res.sort((a, b) => a.published_at - b.published_at)
        }
        setIsLoadMoreVisible(res.length >= MOD_FILTER_LIMIT)
        const mods = res.slice(0, MOD_FILTER_LIMIT)
        const filteredMods = mods.filter((mod) => {
          if (tags.length > 0) {
            const hasAllIncludedTags = tags.every((includeTag) =>
              mod.tags?.some(
                (tag) =>
                  tag.toLowerCase().trim() === includeTag.toLowerCase().trim()
              )
            )
            if (!hasAllIncludedTags) return false
          }

          if (excludeTags.length > 0) {
            const hasExcludedTag = excludeTags.some((excludeTag) =>
              mod.tags?.some(
                (tag) =>
                  tag.toLowerCase().trim() === excludeTag.toLowerCase().trim()
              )
            )
            if (hasExcludedTag) return false
          }
          return true
        })
        setMods((existingMods) => {
          const uniqueMods = [
            ...existingMods,
            ...filteredMods.filter(
              (mod) =>
                !existingMods.some((existingMod) => existingMod.id === mod.id)
            )
          ]

          return uniqueMods
        })
      })
      .finally(() => {
        setIsFetching(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fetchMods,
    filterOptions.sort,
    filterOptions.source,
    tags.length,
    excludeTags.length
  ])

  const lastMod: ModDetails | undefined = useMemo(() => {
    // For the latest sort find oldest mod
    // for the oldest sort find newest mod
    return mods.reduce(
      (prev, current) => {
        if (!prev) return current
        if (filterOptions.sort === SortBy.Latest) {
          return current.edited_at < prev.edited_at ? current : prev
        } else if (filterOptions.sort === SortBy.Oldest) {
          return current.edited_at > prev.edited_at ? current : prev
        }
        return prev
      },
      undefined as ModDetails | undefined
    )
  }, [mods, filterOptions.sort])

  // Add missing mods to the list
  useEffect(() => {
    let sub: NDKSubscription
    if (lastMod) {
      console.log(
        `[ModsPageWithRelays] Setting up real-time subscription for mods after ${lastMod.id}`
      )
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
      sub = ndk.subscribe(filter, {
        closeOnEose: false,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      sub.on('event', (ndkEvent) => {
        console.log(
          `[ModsPageWithRelays] Received real-time mod event: ${ndkEvent.id}`
        )
        setMods((prevMods) => {
          // Skip if not valid
          if (!isModDataComplete(ndkEvent)) {
            console.log(
              `[ModsPageWithRelays] Skipping incomplete mod: ${ndkEvent.id}`
            )
            return prevMods
          }

          if (tags.length > 0) {
            const hasAllIncludedTags = tags.every((includeTag) =>
              ndkEvent.tags
                ?.find((tag) => tag[0] === 'tags')
                ?.some(
                  (tag) =>
                    tag.toString().toLowerCase() === includeTag.toLowerCase()
                )
            )

            if (!hasAllIncludedTags) {
              console.log(
                `[ModsPageWithRelays] Skipping mod ${ndkEvent.id} - missing required tags`
              )
              return prevMods
            }
          }

          // Additional client-side filtering for exclude tags
          if (excludeTags.length > 0) {
            const hasExcludedTag = excludeTags.some((excludeTag) =>
              ndkEvent.tags
                ?.find((tag) => tag[0] === 'tags')
                ?.some(
                  (tag) =>
                    tag.toString().toLowerCase().trim() ===
                    excludeTag.toLowerCase().trim()
                )
            )
            if (hasExcludedTag) {
              console.log(
                `[ModsPageWithRelays] Skipping mod ${ndkEvent.id} - has excluded tag`
              )
              return prevMods
            }
          }

          // Skip existing
          if (
            prevMods.find(
              (e) =>
                e.id === ndkEvent.id ||
                prevMods.findIndex((n) => n.id === ndkEvent.id) !== -1
            )
          ) {
            console.log(
              `[ModsPageWithRelays] Skipping duplicate mod: ${ndkEvent.id}`
            )
            return prevMods
          }
          const newMod = extractModData(ndkEvent)
          console.log(
            `[ModsPageWithRelays] Adding new mod to list: ${ndkEvent.id} (${newMod.title})`
          )
          return [...prevMods, newMod]
        })
      })
      sub.start()
    }
    return () => {
      if (sub) {
        console.log('[ModsPageWithRelays] Stopping real-time subscription')
        sub.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterOptions.sort,
    filterOptions.source,
    lastMod,
    ndk,
    tags.length,
    excludeTags.length
  ])

  useEffect(() => {
    console.log(
      '[ModsPageWithRelays] Clearing mods list due to tag filter changes'
    )
    setMods([])
  }, [tags.length, excludeTags.length])

  const handleLoadMore = useCallback(() => {
    console.log('[ModsPageWithRelays] Loading more mods...')
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
        console.log(
          `[ModsPageWithRelays] Load more returned ${res.length} mods`
        )
        setMods((prevMods) => {
          const newMods = res
          const filteredMods = newMods.filter((mod) => {
            if (tags.length > 0) {
              const hasAllIncludedTags = tags.every((includeTag) =>
                mod.tags?.some(
                  (tag) =>
                    tag.toLowerCase().trim() === includeTag.toLowerCase().trim()
                )
              )
              if (!hasAllIncludedTags) return false
            }

            if (excludeTags.length > 0) {
              const hasExcludedTag = excludeTags.some((excludeTag) =>
                mod.tags?.some(
                  (tag) =>
                    tag.toLowerCase().trim() === excludeTag.toLowerCase().trim()
                )
              )
              if (hasExcludedTag) return false
            }
            return true
          })
          const combinedMods = [...prevMods, ...filteredMods]
          const uniqueMods = Array.from(
            new Set(combinedMods.map((mod) => mod.id))
          )
            .map((id) => combinedMods.find((mod) => mod.id === id))
            .filter((mod): mod is ModDetails => mod !== undefined)

          setIsLoadMoreVisible(newMods.length >= MOD_FILTER_LIMIT)

          console.log(
            `[ModsPageWithRelays] After load more: ${uniqueMods.length} total mods (added ${filteredMods.length} new)`
          )
          return uniqueMods
        })
      })
      .finally(() => {
        setIsFetching(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMods, filterOptions, lastMod, tags.length, excludeTags.length])

  const filteredModList = useFilteredMods(
    mods,
    userState,
    filterOptions,
    nsfwList,
    muteLists,
    repostList
  )

  console.log(
    `[ModsPageWithRelays] Rendering ${filteredModList.length} mods (from ${mods.length} total)`
  )

  return (
    <>
      {isFetching && <LoadingSpinner desc="Fetching mod details from relays" />}
      <div className="InnerBodyMain">
        <div className="ContainerMain">
          <div
            className="IBMSecMainGroup IBMSecMainGroupAlt"
            ref={scrollTargetRef}
          >
            <PageTitleRow />
            <div className="FiltersMain">
              <ModFilter />
            </div>

            <div className="IBMSecMain IBMSMListWrapper">
              <div className="IBMSMList">
                {filteredModList.map((mod) => (
                  <ModCard key={mod.id} {...mod} />
                ))}
              </div>
            </div>

            {!isFetching && isLoadMoreVisible && (
              <div className="IBMSMListFeedLoadMore">
                <button
                  className="btn btnMain IBMSMListFeedLoadMoreBtn"
                  type="button"
                  onClick={handleLoadMore}
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
