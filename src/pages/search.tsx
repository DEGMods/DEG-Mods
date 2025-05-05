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
  useGames,
  useLocalStorage,
  useMuteLists,
  useNDKContext,
  useNSFWList,
  useServer,
  useUserWoTOverride
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
  SortBy
} from 'types'
import {
  CurationSetIdentifiers,
  DEFAULT_FILTER_OPTIONS,
  extractModData,
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
  Users = 'Users'
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

  const [filterOptions] = useLocalStorage<FilterOptions>(
    'filter',
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
              filterOptions={filterOptions}
              muteLists={muteLists}
              nsfwList={nsfwList}
              repostList={repostList}
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
            <GamesResult searchTerm={searchTerm} />
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
  const [searchParams, setSearchParams] = useSearchParams()
  const searchKind =
    (searchParams.get('kind') as SearchKindEnum) || SearchKindEnum.Mods
  const handleChangeSearchKind = (kind: SearchKindEnum) => {
    searchParams.set('kind', kind)
    setSearchParams(searchParams, {
      replace: true
    })
  }

  return (
    <div className="IBMSecMain">
      <div className="FiltersMain">
        {searchKind === SearchKindEnum.Mods && <ModFilter />}

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

                  if (item === ModeratedFilter.Unmoderated_Fully && !isAdmin) {
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
    // Search page requires search term
    if (normalizedSearchTerm === '') {
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

    // Search
    data['search'] = normalizedSearchTerm

    serverService.fetch('mods', data).then((res) => {
      setMods(res.events.filter(isModDataComplete).map(extractModData))
      setPagination(res.pagination)
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
    userWot,
    userWotLevel
  ])

  useEffect(() => {
    if (!isRelayFallbackActive) return

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

          return [...prev, mod]
        })
      }
    })

    // Cleanup function to stop all subscriptions
    return () => {
      subscription.stop()
    }
  }, [isRelayFallbackActive, ndk])

  useEffect(() => {
    scrollIntoView(el)
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const filteredMods = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchString(searchTerm)
    // Search page requires search term
    if (normalizedSearchTerm === '') return []

    const filterFn = (mod: ModDetails) =>
      normalizeSearchString(mod.title).includes(normalizedSearchTerm) ||
      memoizedNormalizeSearchString(mod.game).includes(normalizedSearchTerm) ||
      mod.summary.toLowerCase().includes(normalizedSearchTerm) ||
      mod.body.toLowerCase().includes(normalizedSearchTerm) ||
      mod.tags.findIndex((tag) =>
        tag.toLowerCase().includes(normalizedSearchTerm)
      ) > -1

    const filterSourceFn = (mod: ModDetails) => {
      // Filter by source if selected
      if (filterOptions.source === window.location.host) {
        return mod.rTag === filterOptions.source
      }
      return true
    }

    return mods.filter(filterFn).filter(filterSourceFn)
  }, [filterOptions.source, mods, searchTerm])

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
  const [profiles, setProfiles] = useState<NDKUserProfile[]>([])
  const userState = useAppSelector((state) => state.user)

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
      filtered = filtered.filter((profile) =>
        muteLists.admin.authors.includes(profile.pubkey as string)
      )
    } else if (isUnmoderatedFully && isAdmin) {
      // Only apply filtering if the user is not an admin
      // or the admin has not selected "Unmoderated Fully"
    } else {
      filtered = filtered.filter(
        (profile) => !muteLists.admin.authors.includes(profile.pubkey as string)
      )
    }

    if (moderationFilter === ModeratedFilter.Moderated) {
      filtered = filtered.filter(
        (profile) => !muteLists.user.authors.includes(profile.pubkey as string)
      )
    }

    return filtered
  }, [userState.user?.npub, moderationFilter, profiles, muteLists])
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
}

const GamesResult = ({ searchTerm }: GamesResultProps) => {
  const games = useGames()
  const [page, setPage] = useState(1)

  // Reset the page to 1 whenever searchTerm changes
  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const filteredGames = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchString(searchTerm)
    if (normalizedSearchTerm === '') return []

    return games.filter((game) =>
      memoizedNormalizeSearchString(game['Game Name']).includes(
        normalizedSearchTerm
      )
    )
  }, [searchTerm, games])

  const handleNext = () => {
    setPage((prev) => prev + 1)
  }

  const handlePrev = () => {
    setPage((prev) => prev - 1)
  }

  return (
    <>
      {searchTerm !== '' && filteredGames.length === 0 && (
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
      {searchTerm !== '' && filteredGames.length > MAX_GAMES_PER_PAGE && (
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
