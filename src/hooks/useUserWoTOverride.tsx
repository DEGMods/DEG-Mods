import { Dispatch, SetStateAction, useCallback, useState } from 'react'
import { useAppSelector } from './redux'
import { DEFAULT_FILTER_OPTIONS } from 'utils'
import { FilterOptions, ModDetails, WOTFilterOptions } from 'types'
import { isInWoT } from 'utils/wot'
import { useLocalStorage } from './useLocalStorage'

/**
 * Utility hook to determine if a mod is within the user's Web of Trust (WoT) or
 * if it has been manually overridden to be visible.
 *
 * @param filterKey - The key used to store filter preferences in local storage
 * @returns A tuple containing a function to check if a mod is in the user's WoT and a function to override
 */
export const useUserWoTOverride = (
  filterKey: string
): [
  isUserWot: (mod: ModDetails) => boolean,
  setOverride: Dispatch<SetStateAction<string[]>>
] => {
  const { userWot, userWotLevel } = useAppSelector((state) => state.wot)
  const userState = useAppSelector((state) => state.user)
  const [filterOptions] = useLocalStorage<FilterOptions>(
    filterKey,
    DEFAULT_FILTER_OPTIONS
  )
  const [wotOverride, setWotOverride] = useState<string[]>([])

  const isUserWoT = useCallback(
    (mod: ModDetails) => {
      // Client override
      if (wotOverride.includes(mod.id)) {
        return true
      }

      // When user is not logged in skip userWot check
      if (!userState.auth) {
        return true
      }

      // Check WoT
      if (filterOptions.wot === WOTFilterOptions.Site_And_Mine) {
        return isInWoT(userWot, userWotLevel, mod.author)
      }

      return true
    },
    [filterOptions.wot, userState.auth, userWot, userWotLevel, wotOverride]
  )

  return [isUserWoT, setWotOverride]
}
