import { ModFilter } from 'components/Filters/ModsFilter'
import { Pagination } from 'components/Pagination'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  createSearchParams,
  useLoaderData,
  useNavigate
} from 'react-router-dom'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ModCard } from '../../components/ModCard'
import { MOD_FILTER_LIMIT } from '../../constants'
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
import { FilterOptions, ModDetails } from '../../types'
import { DEFAULT_FILTER_OPTIONS, scrollIntoView } from 'utils'
import { SearchInput } from 'components/SearchInput'
import { ModsPageLoaderResult } from './loader'

export const ModsPage = () => {
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const { repostList, muteLists, nsfwList } =
    useLoaderData() as ModsPageLoaderResult
  const { fetchMods } = useNDKContext()
  const [isFetching, setIsFetching] = useState(false)
  const [mods, setMods] = useState<ModDetails[]>([])

  const [filterOptions] = useLocalStorage<FilterOptions>(
    'filter',
    DEFAULT_FILTER_OPTIONS
  )

  const [page, setPage] = useState(1)

  const userState = useAppSelector((state) => state.user)

  useEffect(() => {
    setIsFetching(true)
    fetchMods({ source: filterOptions.source })
      .then((res) => {
        setMods(res)
      })
      .finally(() => {
        setIsFetching(false)
      })
  }, [filterOptions.source, fetchMods])

  const handleNext = useCallback(() => {
    setIsFetching(true)

    const until =
      mods.length > 0 ? mods[mods.length - 1].published_at - 1 : undefined

    fetchMods({
      source: filterOptions.source,
      until
    })
      .then((res) => {
        setMods(res)
        setPage((prev) => prev + 1)
        scrollIntoView(scrollTargetRef.current)
      })
      .finally(() => {
        setIsFetching(false)
      })
  }, [filterOptions.source, mods, fetchMods])

  const handlePrev = useCallback(() => {
    setIsFetching(true)

    const since = mods.length > 0 ? mods[0].published_at + 1 : undefined

    fetchMods({
      source: filterOptions.source,
      since
    })
      .then((res) => {
        setMods(res)
        setPage((prev) => prev - 1)
        scrollIntoView(scrollTargetRef.current)
      })
      .finally(() => {
        setIsFetching(false)
      })
  }, [filterOptions.source, mods, fetchMods])

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

            <Pagination
              page={page}
              disabledNext={mods.length < MOD_FILTER_LIMIT}
              handlePrev={handlePrev}
              handleNext={handleNext}
            />
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
