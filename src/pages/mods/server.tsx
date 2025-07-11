import { ModFilter } from 'components/Filters/ModsFilter'
import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ModCard } from '../../components/ModCard'
import { MOD_FILTER_LIMIT, T_TAG_VALUE } from '../../constants'
import {
  useAppSelector,
  useLocalStorage,
  useUserWoTOverride
} from '../../hooks'
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

import { PaginationOffset } from 'components/Pagination'
import { PageTitleRow } from './PageTitleRow'
import {
  DEFAULT_FILTER_OPTIONS,
  extractModData,
  getFallbackPubkey,
  scrollIntoView
} from 'utils'
import { PaginatedRequest, ServerService } from 'controllers'
import { NDKKind } from '@nostr-dev-kit/ndk'
import { useLoaderData } from 'react-router-dom'
import { ModsPageLoaderResult } from './loader'
import { ModCardWot } from 'components/ModCardWoT'

export const ModsPageWithServer = () => {
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
  const { muteLists } = useLoaderData() as ModsPageLoaderResult
  const userState = useAppSelector((state) => state.user)
  const [isFetching, setIsFetching] = useState(false)
  const [mods, setMods] = useState<ModDetails[]>([])
  const [isUserWoT, setOverride] = useUserWoTOverride('filter')
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

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      offset: 0
    }))
  }, [tags.length, excludeTags.length])

  const req = useMemo(() => {
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
    return data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterOptions.moderated,
    filterOptions.nsfw,
    filterOptions.repost,
    filterOptions.sort,
    filterOptions.source,
    filterOptions.wot,
    muteLists.user.authors,
    muteLists.user.replaceableEvents,
    pagination.limit,
    pagination.offset,
    userState?.user?.pubkey,
    tags.length,
    excludeTags.length
  ])
  const fetchModsWithPagination = useCallback(async (newOffset: number) => {
    setPagination((prev) => ({
      ...prev,
      offset: newOffset
    }))
    scrollIntoView(scrollTargetRef.current)
  }, [])

  useEffect(() => {
    setIsFetching(true)
    const serverService = ServerService.getInstance()
    serverService
      .fetch('mods', req)
      .then((res) => {
        setMods(res.events.map(extractModData))
        setPagination(res.pagination)
      })
      .finally(() => {
        setIsFetching(false)
      })
  }, [req])

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
                {mods.map((mod) =>
                  isUserWoT(mod) ? (
                    <ModCard key={mod.id} {...mod} />
                  ) : (
                    <ModCardWot
                      key={mod.id}
                      id={mod.id}
                      setOverride={setOverride}
                    />
                  )
                )}
              </div>
            </div>

            <PaginationOffset
              total={pagination.total}
              limit={pagination.limit}
              offset={pagination.offset}
              hasMore={pagination.hasMore}
              onPageChange={fetchModsWithPagination}
            />
          </div>
        </div>
      </div>
    </>
  )
}
