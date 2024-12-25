import { PaginationWithPageNumbers } from 'components/Pagination'
import { MAX_GAMES_PER_PAGE } from 'constants.ts'
import { useDidMount, useGames, useNDKContext } from 'hooks'
import { useMemo, useRef, useState } from 'react'
import { GameCard } from '../components/GameCard'
import '../styles/pagination.css'
import '../styles/search.css'
import '../styles/styles.css'
import { createSearchParams, useNavigate } from 'react-router-dom'
import { appRoutes } from 'routes'
import { scrollIntoView } from 'utils'
import { SearchInput } from 'components/SearchInput'

export const GamesPage = () => {
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { fetchMods } = useNDKContext()
  const searchTermRef = useRef<HTMLInputElement>(null)
  const games = useGames()
  const [gamesWithMods, setGamesWithMods] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  useDidMount(() => {
    fetchMods({ limit: 100, source: window.location.host }).then((mods) => {
      mods.sort((a, b) => b.published_at - a.published_at)

      const gameNames = new Set<string>()

      mods.map((mod) => gameNames.add(mod.game))
      setGamesWithMods(Array.from(gameNames))
    })
  })

  const sortedGames = useMemo(() => {
    // Create a map for the order array, assigning each game name a rank based on its index.
    const orderMap = new Map<string, number>()
    gamesWithMods.forEach((gameName, index) => {
      orderMap.set(gameName, index)
    })

    const gamesArray = [...games]

    return gamesArray.sort((a, b) => {
      const indexA = orderMap.get(a['Game Name'])
      const indexB = orderMap.get(b['Game Name'])

      // Games that are not in the order array should go after those that are in the array.
      if (indexA !== undefined && indexB !== undefined) {
        return indexA - indexB
      } else if (indexA !== undefined) {
        return -1 // a comes before b
      } else if (indexB !== undefined) {
        return 1 // b comes before a
      } else {
        return 0 // keep original order if neither is in the array
      }
    })
  }, [games, gamesWithMods])

  // Pagination logic
  const totalGames = sortedGames.length
  const totalPages = Math.ceil(totalGames / MAX_GAMES_PER_PAGE)
  const startIndex = (currentPage - 1) * MAX_GAMES_PER_PAGE
  const endIndex = startIndex + MAX_GAMES_PER_PAGE
  const currentGames = sortedGames.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      scrollIntoView(scrollTargetRef.current)
      setCurrentPage(page)
    }
  }

  const handleSearch = () => {
    const value = searchTermRef.current?.value || '' // Access the input value from the ref
    if (value !== '') {
      const searchParams = createSearchParams({
        q: value,
        kind: 'Games'
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
    <div className='InnerBodyMain'>
      <div className='ContainerMain'>
        <div
          className='IBMSecMainGroup IBMSecMainGroupAlt'
          ref={scrollTargetRef}
        >
          <div className='IBMSecMain'>
            <div className='SearchMainWrapper'>
              <div className='IBMSMTitleMain'>
                <h2 className='IBMSMTitleMainHeading'>Games</h2>
              </div>
              <SearchInput
                ref={searchTermRef}
                handleKeyDown={handleKeyDown}
                handleSearch={handleSearch}
              />
            </div>
          </div>
          <div className='IBMSecMain IBMSMListWrapper'>
            <div className='IBMSMList IBMSMListFeaturedAlt'>
              {currentGames.map((game) => (
                <GameCard
                  key={game['Game Name']}
                  title={game['Game Name']}
                  imageUrl={game['Boxart image']}
                />
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
  )
}