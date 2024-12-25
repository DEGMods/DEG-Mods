import { useMemo } from 'react'
import { IUserState } from 'store/reducers/user'
import {
  FilterOptions,
  ModDetails,
  ModeratedFilter,
  MuteLists,
  NSFWFilter,
  RepostFilter,
  SortBy,
  WOTFilterOptions
} from 'types'
import { npubToHex } from 'utils'
import { useAppSelector } from './redux'
import { isInWoT } from 'utils/wot'

export const useFilteredMods = (
  mods: ModDetails[],
  userState: IUserState,
  filterOptions: FilterOptions,
  nsfwList: string[],
  muteLists: {
    admin: MuteLists
    user: MuteLists
  },
  repostList: string[],
  author?: string | undefined
) => {
  const { siteWot, siteWotLevel, userWot, userWotLevel } = useAppSelector(
    (state) => state.wot
  )

  return useMemo(() => {
    const nsfwFilter = (mods: ModDetails[]) => {
      // Add nsfw tag to mods included in nsfwList
      if (filterOptions.nsfw !== NSFWFilter.Hide_NSFW) {
        mods = mods.map((mod) => {
          return !mod.nsfw && nsfwList.includes(mod.aTag)
            ? { ...mod, nsfw: true }
            : mod
        })
      }

      // Determine the filtering logic based on the NSFW filter option
      switch (filterOptions.nsfw) {
        case NSFWFilter.Hide_NSFW:
          // If 'Hide_NSFW' is selected, filter out NSFW mods
          return mods.filter((mod) => !mod.nsfw && !nsfwList.includes(mod.aTag))
        case NSFWFilter.Show_NSFW:
          // If 'Show_NSFW' is selected, return all mods (no filtering)
          return mods
        case NSFWFilter.Only_NSFW:
          // If 'Only_NSFW' is selected, filter to show only NSFW mods
          return mods.filter((mod) => mod.nsfw || nsfwList.includes(mod.aTag))
      }
    }

    const repostFilter = (mods: ModDetails[]) => {
      if (filterOptions.repost !== RepostFilter.Hide_Repost) {
        // Add repost tag to mods included in repostList
        mods = mods.map((mod) => {
          return !mod.repost && repostList.includes(mod.aTag)
            ? { ...mod, repost: true }
            : mod
        })
      }
      // Determine the filtering logic based on the Repost filter option
      switch (filterOptions.repost) {
        case RepostFilter.Hide_Repost:
          return mods.filter(
            (mod) => !mod.repost && !repostList.includes(mod.aTag)
          )
        case RepostFilter.Show_Repost:
          return mods
        case RepostFilter.Only_Repost:
          return mods.filter(
            (mod) => mod.repost || repostList.includes(mod.aTag)
          )
      }
    }

    const wotFilter = (mods: ModDetails[]) => {
      // Determine the filtering logic based on the WOT filter option and user state
      // when user is not logged in use Site_Only
      if (!userState.auth) {
        return mods.filter((mod) => isInWoT(siteWot, siteWotLevel, mod.author))
      }
      // when user is logged, allow other filter selections
      const isWoTNpub =
        userState.user?.npub === import.meta.env.VITE_SITE_WOT_NPUB
      switch (filterOptions.wot) {
        case WOTFilterOptions.None:
          // Only admins can choose None, use siteWoT for others
          return isWoTNpub
            ? mods
            : mods.filter((mod) => isInWoT(siteWot, siteWotLevel, mod.author))
        case WOTFilterOptions.Exclude:
          // Only admins can choose Exlude, use siteWot for others
          // Exlude returns the mods not in the site's WoT
          return isWoTNpub
            ? mods.filter((mod) => !isInWoT(siteWot, siteWotLevel, mod.author))
            : mods.filter((mod) => isInWoT(siteWot, siteWotLevel, mod.author))
        case WOTFilterOptions.Site_Only:
          return mods.filter((mod) =>
            isInWoT(siteWot, siteWotLevel, mod.author)
          )
        case WOTFilterOptions.Mine_Only:
          // Only admins can choose Mine_Only, use siteWoT for others
          return isWoTNpub
            ? mods.filter((mod) => isInWoT(userWot, userWotLevel, mod.author))
            : mods.filter((mod) => isInWoT(siteWot, siteWotLevel, mod.author))
        case WOTFilterOptions.Site_And_Mine:
          return mods.filter(
            (mod) =>
              isInWoT(siteWot, siteWotLevel, mod.author) ||
              isInWoT(userWot, userWotLevel, mod.author)
          )
      }
    }

    let filtered = nsfwFilter(mods)
    filtered = repostFilter(filtered)
    filtered = wotFilter(filtered)

    const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB
    const isOwner =
      userState.user?.npub &&
      npubToHex(userState.user.npub as string) === author
    const isUnmoderatedFully =
      filterOptions.moderated === ModeratedFilter.Unmoderated_Fully

    // Only apply filtering if the user is not an admin or the admin has not selected "Unmoderated Fully"
    // Allow "Unmoderated Fully" when author visits own profile
    if (!((isAdmin || isOwner) && isUnmoderatedFully)) {
      filtered = filtered.filter(
        (mod) =>
          !muteLists.admin.authors.includes(mod.author) &&
          !muteLists.admin.replaceableEvents.includes(mod.aTag)
      )
    }

    if (filterOptions.moderated === ModeratedFilter.Moderated) {
      filtered = filtered.filter(
        (mod) =>
          !muteLists.user.authors.includes(mod.author) &&
          !muteLists.user.replaceableEvents.includes(mod.aTag)
      )
    }

    if (filterOptions.sort === SortBy.Latest) {
      filtered.sort((a, b) => b.published_at - a.published_at)
    } else if (filterOptions.sort === SortBy.Oldest) {
      filtered.sort((a, b) => a.published_at - b.published_at)
    }

    return filtered
  }, [
    userState.auth,
    userState.user?.npub,
    filterOptions.sort,
    filterOptions.moderated,
    filterOptions.wot,
    filterOptions.nsfw,
    filterOptions.repost,
    author,
    mods,
    muteLists,
    nsfwList,
    repostList,
    siteWot,
    siteWotLevel,
    userWot,
    userWotLevel
  ])
}