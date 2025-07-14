import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage,
  NDKUserProfile,
  NostrEvent,
  profileFromEvent
} from '@nostr-dev-kit/ndk'
import { ErrorBoundary } from 'components/ErrorBoundary'
import { GameCard } from 'components/GameCard'
import { ModCard } from 'components/ModCard'
import { ModFilter } from 'components/Filters/ModsFilter'
import { BlogsFilter } from 'components/Filters/BlogsFilter'
import { BlogCard } from 'components/BlogCard'
import { Pagination, PaginationOffset } from 'components/Pagination'
import { Profile } from 'components/ProfileSection'
import { SearchInput } from 'components/SearchInput'
import {
  MAX_GAMES_PER_PAGE,
  MAX_MODS_PER_PAGE,
  MOD_FILTER_LIMIT,
  T_TAG_VALUE
} from 'constants.ts'
import {
  useAppSelector,
  useFilteredMods,
  useFilteredBlogs,
  useGames,
  useLocalStorage,
  useMuteLists,
  useNDKContext,
  useNSFWList,
  useServer,
  useUserWoTOverride,
  useModerationSettings
} from 'hooks'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FilterOptions,
  ModDetails,
  ModeratedFilter,
  MuteLists,
  NSFWFilter,
  RepostFilter,
  SortBy,
  BlogCardDetails
} from 'types'
import {
  CurationSetIdentifiers,
  DEFAULT_FILTER_OPTIONS,
  extractModData,
  extractBlogCardDetails,
  getFallbackPubkey,
  isModDataComplete,
  memoizedNormalizeSearchString,
  normalizeSearchString,
  normalizeUserSearchString,
  scrollIntoView
} from 'utils'
import { useCuratedSet } from 'hooks/useCuratedSet'
import dedup from 'utils/nostr'
import { PaginatedRequest, ServerService } from 'controllers'
import { ModCardWot } from 'components/ModCardWoT'

enum SearchKindEnum {
  Mods = 'Mods',
  Games = 'Games',
  Users = 'Users',
  Blogs = 'Blogs'
}

export const SearchPage = () => {
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const muteLists = useMuteLists()
  const nsfwList = useNSFWList()
  const repostList = useCuratedSet(CurationSetIdentifiers.Repost)
  const searchTermRef = useRef<HTMLInputElement>(null)
  const searchKind =
    (searchParams.get('kind') as SearchKindEnum) || SearchKindEnum.Mods
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

  const filterKey =
    searchKind === SearchKindEnum.Blogs ? 'filter-blog' : 'filter'
  const [filterOptions] = useLocalStorage<FilterOptions>(
    filterKey,
    DEFAULT_FILTER_OPTIONS
  )

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')

  const handleSearch = () => {
    const value = searchTermRef.current?.value || '' // Access the input value from the ref
    setSearchTerm(value)

    if (value) {
      searchParams.set('q', value)
    } else {
      searchParams.delete('q')
    }

    setSearchParams(searchParams, {
      replace: true
    })
  }

  // Handle "Enter" key press inside the input
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="InnerBodyMain">
      <div className="ContainerMain">
        <div
          className="IBMSecMainGroup IBMSecMainGroupAlt"
          ref={scrollTargetRef}
        >
          <div className="IBMSecMain">
            <div className="SearchMainWrapper">
              <div className="IBMSMTitleMain">
                <h2 className="IBMSMTitleMainHeading">
                  Search:&nbsp;
                  <span className="IBMSMTitleMainHeadingSpan">
                    {searchTerm}
                  </span>
                </h2>
              </div>
              <SearchInput
                handleKeyDown={handleKeyDown}
                handleSearch={handleSearch}
                ref={searchTermRef}
              />
            </div>
          </div>
          <Filters />
          {searchKind === SearchKindEnum.Mods && (
            <ModsResult
              searchTerm={searchTerm}
              tags={tags}
              excludeTags={excludeTags}
              filterOptions={filterOptions}
              muteLists={muteLists}
              nsfwList={nsfwList}
              repostList={repostList}
              el={scrollTargetRef.current}
            />
          )}
          {searchKind === SearchKindEnum.Blogs && (
            <BlogsResult
              searchTerm={searchTerm}
              tags={tags}
              excludeTags={excludeTags}
              filterOptions={filterOptions}
              muteLists={muteLists}
              nsfwList={nsfwList}
              el={scrollTargetRef.current}
            />
          )}
          {searchKind === SearchKindEnum.Users && (
            <UsersResult
              searchTerm={searchTerm}
              muteLists={muteLists}
              moderationFilter={filterOptions.moderated}
            />
          )}
          {searchKind === SearchKindEnum.Games && (
            <GamesResult searchTerm={searchTerm} tags={tags} />
          )}
        </div>
      </div>
    </div>
  )
}

const Filters = React.memo(() => {
  const [filterOptions, setFilterOptions] = useLocalStorage<FilterOptions>(
    'filter',
    DEFAULT_FILTER_OPTIONS
  )

  const userState = useAppSelector((state) => state.user)
  const { enhancedModeration } = useModerationSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchKind =
    (searchParams.get('kind') as SearchKindEnum) || SearchKindEnum.Mods
  const handleChangeSearchKind = (kind: SearchKindEnum) => {
    searchParams.set('kind', kind)
    setSearchParams(searchParams, {
      replace: true
    })
  }

  useEffect(() => {
    if (
      !enhancedModeration &&
      filterOptions.moderated === ModeratedFilter.Unmoderated_Fully
    ) {
      setFilterOptions((prev) => ({
        ...prev,
        moderated: ModeratedFilter.Moderated
      }))
    }
  }, [enhancedModeration, filterOptions.moderated, setFilterOptions])

  useEffect(() => {
    if (
      !userState.auth &&
      filterOptions.moderated === ModeratedFilter.Unmoderated_Fully
    ) {
      setFilterOptions((prev) => ({
        ...prev,
        moderated: ModeratedFilter.Moderated
      }))
    }
  }, [userState.auth, filterOptions.moderated, setFilterOptions])

  return (
    <div className="IBMSecMain">
      <div className="FiltersMain">
        {searchKind === SearchKindEnum.Mods && <ModFilter />}

        {searchKind === SearchKindEnum.Blogs && <BlogsFilter />}

        {searchKind === SearchKindEnum.Users && (
          <div className="FiltersMainElement">
            <div className="dropdown dropdownMain">
              <button
                className="btn dropdown-toggle btnMain btnMainDropdown"
                aria-expanded="false"
                data-bs-toggle="dropdown"
                type="button"
              >
                {filterOptions.moderated}
              </button>
              <div className="dropdown-menu dropdownMainMenu">
                {Object.values(ModeratedFilter).map((item, index) => {
                  const isAdmin =
                    userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB

                  if (item === ModeratedFilter.Only_Blocked && !isAdmin) {
                    return null
                  }

                  if (item === ModeratedFilter.Unmoderated_Fully) {
                    // Show Unmoderated_Fully if user is logged in and has enhanced moderation enabled or is admin
                    if (!userState.auth || !(isAdmin || enhancedModeration))
                      return null
                  }

                  return (
                    <div
                      key={`moderatedFilterItem-${index}`}
                      className="dropdown-item dropdownMainMenuItem"
                      onClick={() =>
                        setFilterOptions((prev) => ({
                          ...prev,
                          moderated: item
                        }))
                      }
                    >
                      {item}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="FiltersMainElement">
          <div className="dropdown dropdownMain">
            <button
              className="btn dropdown-toggle btnMain btnMainDropdown"
              aria-expanded="false"
              data-bs-toggle="dropdown"
              type="button"
            >
              Searching: {searchKind}
            </button>
            <div className="dropdown-menu dropdownMainMenu">
              {Object.values(SearchKindEnum).map((item, index) => (
                <div
                  key={`searchingFilterItem-${index}`}
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={() => handleChangeSearchKind(item)}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

type ModsResultProps = {
  filterOptions: FilterOptions
  searchTerm: string
  tags: string[]
  excludeTags: string[]
  muteLists: {
    admin: MuteLists
    user: MuteLists
  }
  nsfwList: string[]
  repostList: string[]
  el: HTMLElement | null
}

const ModsResult = ({
  filterOptions,
  searchTerm,
  tags,
  excludeTags,
  muteLists,
  nsfwList,
  repostList,
  el
}: ModsResultProps) => {
  const { ndk } = useNDKContext()
  const [mods, setMods] = useState<ModDetails[]>([])
  const [isUserWoT, setOverride] = useUserWoTOverride('filter')
  const [page, setPage] = useState(1)
  const userState = useAppSelector((state) => state.user)
  const { isServerActive, isRelayFallbackActive } = useServer()
  const { userWot, userWotLevel } = useAppSelector((state) => state.wot)
  const [pagination, setPagination] = useState({
    limit: MOD_FILTER_LIMIT,
    total: 0,
    offset: 0,
    hasMore: false
  })
  const fetchModsWithPagination = useCallback(
    async (newOffset: number) => {
      setPagination((prev) => ({
        ...prev,
        offset: newOffset
      }))
      scrollIntoView(el)
    },
    [el]
  )
  useEffect(() => {
    if (!isServerActive) return

    const normalizedSearchTerm = normalizeSearchString(searchTerm)
    // Search page requires search term OR tags to be set
    if (normalizedSearchTerm === '' && tags.length === 0) {
      setMods([])
      setPagination({
        limit: MOD_FILTER_LIMIT,
        total: 0,
        offset: 0,
        hasMore: false
      })
      return
    }

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
      includeTags: tags.map((tag) => tag.toLowerCase()),
      excludeTags: excludeTags.map((tag) => tag.toLowerCase())
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

    // Search - only add search parameter if search term is provided
    if (normalizedSearchTerm !== '') {
      data['search'] = normalizedSearchTerm
    }

    serverService.fetch('mods', data).then((res) => {
      setMods(res.events.filter(isModDataComplete).map(extractModData))
      setPagination(res.pagination)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    searchTerm,
    userState?.user?.pubkey,
    userWot,
    userWotLevel,
    tags.length,
    excludeTags.length,
    ndk
  ])

  useEffect(() => {
    if (!isRelayFallbackActive) return

    setMods([])

    const filter: NDKFilter = {
      kinds: [NDKKind.Classified],
      '#t': [T_TAG_VALUE]
    }

    const subscription = ndk.subscribe(filter, {
      cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      closeOnEose: true
    })

    subscription.on('event', (ndkEvent) => {
      if (isModDataComplete(ndkEvent)) {
        const mod = extractModData(ndkEvent)
        setMods((prev) => {
          if (prev.find((e) => e.aTag === mod.aTag)) return [...prev]

          // Additional client-side filtering for include tags
          if (tags.length > 0) {
            const hasAllIncludedTags = tags.every((includeTag) =>
              mod.tags?.some(
                (tag) =>
                  tag.toLowerCase().trim() === includeTag.toLowerCase().trim()
              )
            )
            if (!hasAllIncludedTags) return [...prev]
          }

          // Additional client-side filtering for exclude tags
          if (excludeTags.length > 0) {
            const hasExcludedTag = excludeTags.some((excludeTag) =>
              mod.tags?.some(
                (tag) =>
                  tag.toLowerCase().trim() === excludeTag.toLowerCase().trim()
              )
            )
            if (hasExcludedTag) return [...prev]
          }

          return [...prev, mod]
        })
      }
    })

    // Cleanup function to stop all subscriptions
    return () => {
      subscription.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRelayFallbackActive, ndk, excludeTags.length, tags.length])

  useEffect(() => {
    scrollIntoView(el)
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, tags.length, excludeTags.length])

  const filteredMods = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchString(searchTerm)
    // Search page requires search term OR tags to be set
    if (normalizedSearchTerm === '' && tags.length === 0) return []

    const filterFn = (mod: ModDetails) => {
      // If there's a search term, apply text-based filtering
      if (normalizedSearchTerm !== '') {
        return (
          normalizeSearchString(mod.title).includes(normalizedSearchTerm) ||
          memoizedNormalizeSearchString(mod.game).includes(
            normalizedSearchTerm
          ) ||
          mod.summary.toLowerCase().includes(normalizedSearchTerm) ||
          mod.body.toLowerCase().includes(normalizedSearchTerm) ||
          mod.tags.findIndex((tag) =>
            tag.toLowerCase().includes(normalizedSearchTerm)
          ) > -1
        )
      }
      // If no search term but tags are present, return all mods (they'll be filtered by tags on the server)
      return true
    }

    const filterSourceFn = (mod: ModDetails) => {
      // Filter by source if selected
      if (filterOptions.source === window.location.host) {
        return mod.rTag === filterOptions.source
      }
      return true
    }

    return mods.filter(filterFn).filter(filterSourceFn)
  }, [filterOptions.source, mods, searchTerm, tags])

  const filteredModList = useFilteredMods(
    filteredMods,
    userState,
    filterOptions,
    nsfwList,
    muteLists,
    repostList
  )

  const handleNext = () => {
    scrollIntoView(el)
    setPage((prev) => prev + 1)
  }

  const handlePrev = () => {
    scrollIntoView(el)
    setPage((prev) => prev - 1)
  }

  return (
    <>
      <div className="IBMSecMain IBMSMListWrapper">
        <div className="IBMSMList">
          {isServerActive
            ? mods.map((mod) =>
                isUserWoT(mod) ? (
                  <ModCard key={mod.id} {...mod} />
                ) : (
                  <ModCardWot
                    key={mod.id}
                    id={mod.id}
                    setOverride={setOverride}
                  />
                )
              )
            : filteredModList
                .slice((page - 1) * MAX_MODS_PER_PAGE, page * MAX_MODS_PER_PAGE)
                .map((mod) => <ModCard key={mod.id} {...mod} />)}
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
        <Pagination
          page={page}
          disabledNext={filteredModList.length <= page * MAX_MODS_PER_PAGE}
          handlePrev={handlePrev}
          handleNext={handleNext}
        />
      )}
    </>
  )
}

type BlogsResultProps = {
  searchTerm: string
  tags: string[]
  excludeTags: string[]
  filterOptions: FilterOptions
  muteLists: {
    admin: MuteLists
    user: MuteLists
  }
  nsfwList: string[]
  el: HTMLElement | null
}

const BlogsResult = ({
  searchTerm,
  tags,
  excludeTags,
  filterOptions,
  muteLists,
  nsfwList,
  el
}: BlogsResultProps) => {
  const { ndk } = useNDKContext()
  const [blogs, setBlogs] = useState<BlogCardDetails[]>([])
  const [page, setPage] = useState(1)
  const userState = useAppSelector((state) => state.user)
  const { isServerActive, isRelayFallbackActive } = useServer()
  const [pagination, setPagination] = useState({
    limit: MOD_FILTER_LIMIT,
    total: 0,
    offset: 0,
    hasMore: false
  })

  const fetchBlogsWithPagination = useCallback(
    async (newOffset: number) => {
      setPagination((prev) => ({
        ...prev,
        offset: newOffset
      }))
      scrollIntoView(el)
    },
    [el]
  )

  useEffect(() => {
    if (!isServerActive) return

    const normalizedSearchTerm = normalizeSearchString(searchTerm)
    // Search page requires search term OR tags to be set
    if (normalizedSearchTerm === '' && tags.length === 0) {
      setBlogs([])
      setPagination({
        limit: MOD_FILTER_LIMIT,
        total: 0,
        offset: 0,
        hasMore: false
      })
      return
    }

    const serverService = ServerService.getInstance()
    const data: PaginatedRequest = {
      kinds: [NDKKind.Article],
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
      includeTags: tags.map((tag) => tag.toLowerCase()),
      excludeTags: excludeTags.map((tag) => tag.toLowerCase())
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

    // Search - only add search parameter if search term is provided
    if (normalizedSearchTerm !== '') {
      data['search'] = normalizedSearchTerm
    }

    serverService
      .fetch('blogs', data)
      .then((res) => {
        const blogDetails = res.events
          .map((event: NostrEvent) =>
            extractBlogCardDetails(new NDKEvent(ndk, event))
          )
          .filter(
            (blog: Partial<BlogCardDetails>): blog is BlogCardDetails =>
              blog.naddr !== undefined
          )

        setBlogs(blogDetails)
        setPagination(res.pagination)
      })
      .catch((error) => {
        console.error('Error fetching blogs:', error)
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
    searchTerm,
    userState?.user?.pubkey,
    tags,
    excludeTags,
    ndk
  ])

  // Relay fallback for blogs search
  useEffect(() => {
    if (!isRelayFallbackActive) return

    setBlogs([])

    const normalizedSearchTerm = normalizeSearchString(searchTerm)
    // Search page requires search term OR tags to be set
    if (normalizedSearchTerm === '' && tags.length === 0) {
      setBlogs([])
      return
    }

    const filter: NDKFilter = {
      kinds: [NDKKind.Article]
    }

    // // Add source filtering if selected
    if (filterOptions.source === window.location.host) {
      filter['#r'] = [window.location.host]
    }

    // // Add NSFW filtering
    if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
      filter['#L'] = ['content-warning']
    }

    const subscription = ndk.subscribe(filter, {
      cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      closeOnEose: true
    })

    subscription.on('event', (ndkEvent) => {
      const blog = extractBlogCardDetails(ndkEvent)

      // Only add blogs with valid naddr
      if (!blog.naddr) return

      // Client-side NSFW filtering for Hide_NSFW
      if (filterOptions.nsfw === NSFWFilter.Hide_NSFW && blog.nsfw) {
        return
      }

      // Additional client-side filtering for include tags
      if (tags.length > 0) {
        const hasAllIncludedTags = tags.every((includeTag) =>
          blog.tTags?.some(
            (tag) =>
              tag.toLowerCase().trim() === includeTag.toLowerCase().trim()
          )
        )
        if (!hasAllIncludedTags) return
      }

      // Additional client-side filtering for exclude tags
      if (excludeTags.length > 0) {
        const hasExcludedTag = excludeTags.some((excludeTag) =>
          blog.tTags?.some(
            (tag) =>
              tag.toLowerCase().trim() === excludeTag.toLowerCase().trim()
          )
        )
        if (hasExcludedTag) return
      }

      setBlogs((prev) => {
        if (prev.find((e) => e.id === blog.id)) return [...prev]
        return [...prev, blog as BlogCardDetails]
      })
    })

    // Cleanup function to stop all subscriptions
    return () => {
      subscription.stop()
    }
  }, [
    isRelayFallbackActive,
    ndk,
    searchTerm,
    tags,
    excludeTags,
    filterOptions.source,
    filterOptions.nsfw,
    filterOptions.repost
  ])

  // Reset the page to 1 whenever searchTerm or tags change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, tags.length, excludeTags.length])

  const filteredBlogs = useFilteredBlogs(
    blogs,
    userState,
    filterOptions,
    nsfwList,
    muteLists
  )

  const handleNext = () => {
    setPage((prev) => prev + 1)
    fetchBlogsWithPagination(pagination.offset + pagination.limit)
  }

  const handlePrev = () => {
    setPage((prev) => prev - 1)
    fetchBlogsWithPagination(pagination.offset - pagination.limit)
  }

  return (
    <>
      <div className="IBMSecMain IBMSMListWrapper">
        <div className="IBMSMList IBMSMListFeaturedAlt">
          {isServerActive
            ? filteredBlogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  title={blog.title}
                  image={blog.image}
                  nsfw={blog.nsfw}
                  naddr={blog.naddr}
                />
              ))
            : filteredBlogs
                .slice(
                  (page - 1) * MAX_GAMES_PER_PAGE,
                  page * MAX_GAMES_PER_PAGE
                )
                .map((blog) => (
                  <BlogCard
                    key={blog.id}
                    title={blog.title}
                    image={blog.image}
                    nsfw={blog.nsfw}
                    naddr={blog.naddr}
                  />
                ))}
        </div>
      </div>
      {isServerActive ? (
        <PaginationOffset
          total={pagination.total}
          limit={pagination.limit}
          offset={pagination.offset}
          hasMore={pagination.hasMore}
          onPageChange={fetchBlogsWithPagination}
        />
      ) : (
        (searchTerm !== '' || tags.length > 0) &&
        filteredBlogs.length > MAX_GAMES_PER_PAGE && (
          <Pagination
            page={page}
            disabledNext={filteredBlogs.length <= page * MAX_GAMES_PER_PAGE}
            handlePrev={handlePrev}
            handleNext={handleNext}
          />
        )
      )}
    </>
  )
}

type UsersResultProps = {
  searchTerm: string
  moderationFilter: ModeratedFilter
  muteLists: {
    admin: MuteLists
    user: MuteLists
  }
}

const UsersResult = ({
  searchTerm,
  moderationFilter,
  muteLists
}: UsersResultProps) => {
  const { ndk } = useNDKContext()
  const userState = useAppSelector((state) => state.user)
  const { enhancedModeration } = useModerationSettings()
  const [profiles, setProfiles] = useState<NDKUserProfile[]>([])

  useEffect(() => {
    const normalizedSearchTerm = normalizeUserSearchString(searchTerm)
    if (normalizedSearchTerm === '') {
      setProfiles([])
    } else {
      const sub = ndk.subscribe(
        {
          kinds: [NDKKind.Metadata],
          search: normalizedSearchTerm
        },
        {
          closeOnEose: true,
          cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
        },
        undefined,
        false
      )

      // Stop the sub after 10 seconds if we are still searching the same term as before
      window.setTimeout(() => {
        if (sub.filter.search === normalizedSearchTerm) {
          sub.stop()
        }
      }, 10000)

      const onEvent = (_event: NostrEvent | NDKEvent) => {
        let event
        if (_event instanceof NDKEvent) {
          event = _event
        } else {
          event = new NDKEvent(undefined, _event)
        }

        const dedupKey = event.deduplicationKey()
        const existingEvent = events.get(dedupKey)
        if (existingEvent) {
          event = dedup(existingEvent, event)
        }
        event.ndk = this
        events.set(dedupKey, event)

        // We can't rely on the 'eose' to arrive
        // Instead we repeat and sort results on each event
        const ndkEvents = Array.from(events.values())
        const profiles: NDKUserProfile[] = []
        ndkEvents.forEach((event) => {
          try {
            const profile = profileFromEvent(event)
            profiles.push(profile)
          } catch (error) {
            // If we are unable to parse silently skip over the errors
          }
        })
        setProfiles(profiles)
      }

      // Clear previous results
      const events = new Map<string, NDKEvent>()

      // Bind handler and start the sub
      sub.on('event', onEvent)
      sub.start()
      return () => {
        sub.stop()
      }
    }
  }, [ndk, searchTerm])

  const filteredProfiles = useMemo(() => {
    let filtered = [...profiles]
    const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB
    const isUnmoderatedFully =
      moderationFilter === ModeratedFilter.Unmoderated_Fully
    const isOnlyBlocked = moderationFilter === ModeratedFilter.Only_Blocked

    if (isOnlyBlocked && isAdmin) {
      filtered = filtered.filter(
        (profile) =>
          muteLists.admin.authors.includes(profile.pubkey as string) ||
          muteLists.admin.hardBlockedAuthors.includes(profile.pubkey as string)
      )
    } else if (isUnmoderatedFully && (isAdmin || enhancedModeration)) {
      // Allow "Unmoderated Fully" when user has enhanced moderation enabled or is admin
      // Only apply filtering if the user is not an admin or the admin has not selected "Unmoderated Fully"
    } else {
      filtered = filtered.filter(
        (profile) =>
          !muteLists.admin.authors.includes(profile.pubkey as string) &&
          !muteLists.admin.hardBlockedAuthors.includes(profile.pubkey as string)
      )
    }

    if (moderationFilter === ModeratedFilter.Moderated) {
      filtered = filtered.filter(
        (profile) => !muteLists.user.authors.includes(profile.pubkey as string)
      )
    }

    return filtered
  }, [
    userState.user?.npub,
    moderationFilter,
    profiles,
    muteLists,
    enhancedModeration
  ])
  return (
    <>
      <div className="IBMSecMain IBMSMListWrapper">
        <div className="IBMSMList">
          {filteredProfiles.map((profile) => {
            if (profile.pubkey) {
              return (
                <ErrorBoundary key={profile.pubkey}>
                  <Profile pubkey={profile.pubkey as string} />
                </ErrorBoundary>
              )
            }

            return null
          })}
        </div>
      </div>
    </>
  )
}

type GamesResultProps = {
  searchTerm: string
  tags: string[]
}

const GamesResult = ({ searchTerm, tags }: GamesResultProps) => {
  const games = useGames()
  const [page, setPage] = useState(1)

  // Reset the page to 1 whenever searchTerm or tags change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, tags])

  const filteredGames = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchString(searchTerm)
    // Search page requires search term OR tags to be set
    if (normalizedSearchTerm === '' && tags.length === 0) return []

    return games.filter((game) => {
      // If there's a search term, apply text-based filtering
      if (normalizedSearchTerm !== '') {
        return memoizedNormalizeSearchString(game['Game Name']).includes(
          normalizedSearchTerm
        )
      }
      // If no search term but tags are present, return all games (they'll be filtered by tags on the server)
      return true
    })
  }, [searchTerm, games, tags])

  const handleNext = () => {
    setPage((prev) => prev + 1)
  }

  const handlePrev = () => {
    setPage((prev) => prev - 1)
  }

  return (
    <>
      {(searchTerm !== '' || tags.length > 0) && filteredGames.length === 0 && (
        <div className="IBMSecMain IBMSMListWrapper">
          Game not found. Send us a message where you can reach us to add it
        </div>
      )}
      <div className="IBMSecMain IBMSMListWrapper">
        <div className="IBMSMList IBMSMListFeaturedAlt">
          {filteredGames
            .slice((page - 1) * MAX_GAMES_PER_PAGE, page * MAX_GAMES_PER_PAGE)
            .map((game) => (
              <GameCard
                key={game['Game Name']}
                title={game['Game Name']}
                imageUrl={game['Boxart image']}
              />
            ))}
        </div>
      </div>
      {(searchTerm !== '' || tags.length > 0) &&
        filteredGames.length > MAX_GAMES_PER_PAGE && (
          <Pagination
            page={page}
            disabledNext={filteredGames.length <= page * MAX_GAMES_PER_PAGE}
            handlePrev={handlePrev}
            handleNext={handleNext}
          />
        )}
    </>
  )
}
