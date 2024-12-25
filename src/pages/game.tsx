import {
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { ModCard } from 'components/ModCard'
import { ModFilter } from 'components/Filters/ModsFilter'
import { PaginationWithPageNumbers } from 'components/Pagination'
import { SearchInput } from 'components/SearchInput'
import { MAX_MODS_PER_PAGE, T_TAG_VALUE } from 'constants.ts'
import {
  useAppSelector,
  useFilteredMods,
  useLocalStorage,
  useMuteLists,
  useNDKContext,
  useNSFWList,
  useSessionStorage
} from 'hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { FilterOptions, ModDetails } from 'types'
import {
  CurationSetIdentifiers,
  DEFAULT_FILTER_OPTIONS,
  extractModData,
  isModDataComplete,
  scrollIntoView
} from 'utils'
import { useCuratedSet } from 'hooks/useCuratedSet'
import { CategoryFilterPopup } from 'components/Filters/CategoryFilterPopup'

export const GamePage = () => {
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const { name: gameName } = params
  const { ndk } = useNDKContext()
  const muteLists = useMuteLists()
  const nsfwList = useNSFWList()
  const repostList = useCuratedSet(CurationSetIdentifiers.Repost)

  const [filterOptions] = useLocalStorage<FilterOptions>(
    'filter',
    DEFAULT_FILTER_OPTIONS
  )
  const [mods, setMods] = useState<ModDetails[]>([])

  const [currentPage, setCurrentPage] = useState(1)

  const userState = useAppSelector((state) => state.user)

  // Search
  const searchTermRef = useRef<HTMLInputElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')

  // Categories filter
  const [categories, setCategories] = useSessionStorage<string[]>('l', [])
  const [hierarchies, setHierarchies] = useSessionStorage<string[]>('h', [])
  const [showCategoryPopup, setShowCategoryPopup] = useState(false)
  const linkedHierarchy = searchParams.get('h')
  const isCategoryFilterActive = categories.length + hierarchies.length > 0

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

  const filteredMods = useMemo(() => {
    const filterSourceFn = (mod: ModDetails) => {
      if (filterOptions.source === window.location.host) {
        return mod.rTag === filterOptions.source
      }
      return true
    }

    const filterCategoryFn = (mod: ModDetails) => {
      // Linked overrides the category popup selection
      if (linkedHierarchy && linkedHierarchy !== '') {
        return mod.LTags.includes(linkedHierarchy)
      }

      // If no selections are active return true
      if (!(hierarchies.length || categories.length)) {
        return true
      }

      // Hierarchy selection active
      if (hierarchies.length) {
        const isMatch = mod.LTags.some((item) => hierarchies.includes(item))

        // Matched hierarchy, return true immediately otherwise check categories
        if (isMatch) return isMatch
      }

      // Category selection
      if (categories.length) {
        // Return result immediately
        return mod.lTags.some((item) => categories.includes(item))
      }

      // No matches
      return false
    }

    // If search term is missing, only filter by sources and category
    if (searchTerm === '')
      return mods.filter(filterSourceFn).filter(filterCategoryFn)

    const lowerCaseSearchTerm = searchTerm.toLowerCase()

    const filterFn = (mod: ModDetails) =>
      mod.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      mod.game.toLowerCase().includes(lowerCaseSearchTerm) ||
      mod.summary.toLowerCase().includes(lowerCaseSearchTerm) ||
      mod.body.toLowerCase().includes(lowerCaseSearchTerm) ||
      mod.tags.findIndex((tag) =>
        tag.toLowerCase().includes(lowerCaseSearchTerm)
      ) > -1

    return mods.filter(filterFn).filter(filterSourceFn).filter(filterCategoryFn)
  }, [
    categories,
    filterOptions.source,
    hierarchies,
    linkedHierarchy,
    mods,
    searchTerm
  ])

  const filteredModList = useFilteredMods(
    filteredMods,
    userState,
    filterOptions,
    nsfwList,
    muteLists,
    repostList
  )

  // Pagination logic
  const totalGames = filteredModList.length
  const totalPages = Math.ceil(totalGames / MAX_MODS_PER_PAGE)
  const startIndex = (currentPage - 1) * MAX_MODS_PER_PAGE
  const endIndex = startIndex + MAX_MODS_PER_PAGE
  const currentMods = filteredModList.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      scrollIntoView(scrollTargetRef.current)
      setCurrentPage(page)
    }
  }

  useEffect(() => {
    if (!gameName) return

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
        if (mod.game === gameName)
          setMods((prev) => {
            if (prev.find((e) => e.aTag === mod.aTag)) return [...prev]

            return [...prev, mod]
          })
      }
    })

    subscription.start()

    // Cleanup function to stop subscription
    return () => {
      subscription.stop()
    }
  }, [gameName, ndk])

  if (!gameName) return null

  return (
    <>
      <div className='InnerBodyMain'>
        <div className='ContainerMain'>
          <div
            className='IBMSecMainGroup IBMSecMainGroupAlt'
            ref={scrollTargetRef}
          >
            <div className='IBMSecMain'>
              <div className='SearchMainWrapper'>
                <div className='IBMSMTitleMain'>
                  <h2 className='IBMSMTitleMainHeading'>
                    Game:&nbsp;
                    <span className='IBMSMTitleMainHeadingSpan'>
                      {gameName}
                    </span>
                    {searchTerm !== '' && (
                      <>
                        &nbsp;&mdash;&nbsp;
                        <span className='IBMSMTitleMainHeadingSpan'>
                          {searchTerm}
                        </span>
                      </>
                    )}
                  </h2>
                </div>
                <SearchInput
                  handleKeyDown={handleKeyDown}
                  handleSearch={handleSearch}
                  ref={searchTermRef}
                />
              </div>
            </div>
            <ModFilter>
              <div className='FiltersMainElement'>
                <button
                  className='btn btnMain btnMainDropdown'
                  type='button'
                  onClick={() => {
                    setShowCategoryPopup(true)
                  }}
                >
                  Categories
                  {isCategoryFilterActive ||
                  (linkedHierarchy && linkedHierarchy !== '') ? (
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 576 512'
                      width='1em'
                      height='1em'
                      fill='currentColor'
                    >
                      <path d='M 3.9,22.9 C 10.5,8.9 24.5,0 40,0 h 432 c 15.5,0 29.5,8.9 36.1,22.9 6.6,14 4.6,30.5 -5.2,42.5 L 396.4,195.6 C 316.2,212.1 256,283 256,368 c 0,27.4 6.3,53.4 17.5,76.5 -1.6,-0.8 -3.2,-1.8 -4.7,-2.9 l -64,-48 C 196.7,387.6 192,378.1 192,368 V 288.9 L 9,65.3 C -0.7,53.4 -2.8,36.8 3.9,22.9 Z M 432,224 c 79.52906,0 143.99994,64.471 143.99994,144 0,79.529 -64.47088,144 -143.99994,144 -79.52906,0 -143.99994,-64.471 -143.99994,-144 0,-79.529 64.47088,-144 143.99994,-144 z' />
                    </svg>
                  ) : (
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 512 512'
                      width='1em'
                      height='1em'
                      fill='currentColor'
                    >
                      <path d='M3.9 54.9C10.5 40.9 24.5 32 40 32l432 0c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9 320 448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6l0-79.1L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z' />
                    </svg>
                  )}
                </button>
              </div>
            </ModFilter>

            <div className='IBMSecMain IBMSMListWrapper'>
              <div className='IBMSMList'>
                {currentMods.map((mod) => (
                  <ModCard key={mod.id} {...mod} />
                ))}
              </div>
            </div>
            <PaginationWithPageNumbers
              currentPage={currentPage}
              totalPages={totalPages}
              handlePageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
      {showCategoryPopup && (
        <CategoryFilterPopup
          categories={categories}
          setCategories={setCategories}
          hierarchies={hierarchies}
          setHierarchies={setHierarchies}
          handleClose={() => {
            setShowCategoryPopup(false)
          }}
        />
      )}
    </>
  )
}
