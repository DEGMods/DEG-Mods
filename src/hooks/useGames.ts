import Papa from 'papaparse'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { Game } from 'types'
import { log, LogType } from 'utils'
import gameFiles from '../utils/games'

let cachedGamesData: Game[] | null = null

export const useGames = () => {
  const hasProcessedFiles = useRef(false)
  const [games, setGames] = useState<Game[]>(cachedGamesData || [])

  useEffect(() => {
    if (cachedGamesData) return
    if (hasProcessedFiles.current) return

    hasProcessedFiles.current = true

    const readGamesCSVs = async () => {
      const uniqueGames: Game[] = []
      const gameNames = new Set<string>()

      // Function to promisify PapaParse
      const parseCSV = (csvText: string) =>
        new Promise<Game[]>((resolve, reject) => {
          Papa.parse<Game>(csvText, {
            worker: true,
            header: true,
            complete: (results) => {
              if (results.errors.length) {
                reject(results.errors)
              }

              resolve(results.data)
            }
          })
        })

      try {
        // Fetch and parse each file
        const promises = Object.values(gameFiles).map(async (importFn) => {
          const csvText = await importFn()
          if (typeof csvText === 'string') {
            const parsedGames = await parseCSV(csvText as string)

            // Remove duplicate games based on 'Game Name'
            parsedGames.forEach((game) => {
              if (!gameNames.has(game['Game Name'])) {
                gameNames.add(game['Game Name'])
                uniqueGames.push(game)
              }
            })
          }
        })

        await Promise.all(promises)
        cachedGamesData = uniqueGames
        setGames(uniqueGames)
      } catch (err) {
        log(
          true,
          LogType.Error,
          'An error occurred in reading and parsing games CSVs',
          err
        )

        // Handle the unknown error type
        if (err instanceof Error) {
          toast.error(err.message)
        } else if (Array.isArray(err) && err.length > 0 && err[0]?.message) {
          // Handle the case when it's an array of PapaParse errors
          toast.error(err[0].message)
        } else {
          toast.error(
            'An unknown error occurred in reading and parsing csv files'
          )
        }
      }
    }

    readGamesCSVs()
  }, [])

  return games
}
