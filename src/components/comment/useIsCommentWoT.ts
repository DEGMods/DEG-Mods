import { useCallback } from 'react'
import { useAppSelector } from 'hooks'
import { CommentEvent, CommentsFilterOptions, WOTFilterOptions } from 'types'
import { isInWoT } from 'utils/wot'

/**
 * Utility hook to determine if a comment is within the user's Web of Trust (WoT)
 *
 * @param comment - The comment to check
 * @param filterOptions - The filter options to use
 * @returns Function to check if a comment is in the user's WoT
 */
export const useIsCommentWoT = (
  filterOptions: CommentsFilterOptions
): ((comment: CommentEvent) => boolean) => {
  const { siteWot, siteWotLevel, userWot, userWotLevel } = useAppSelector(
    (state) => state.wot
  )
  const userState = useAppSelector((state) => state.user)

  const isCommentWot = useCallback(
    (comment: CommentEvent) => {
      // When user is not logged in skip userWot check
      if (!userState.auth) {
        return isInWoT(siteWot, siteWotLevel, comment.event.pubkey)
      }

      const isWoTNpub =
        userState.user?.npub === import.meta.env.VITE_SITE_WOT_NPUB

      const isOwnProfile =
        comment.event.pubkey &&
        userState.auth &&
        userState.user?.pubkey === comment.event.pubkey

      switch (filterOptions.wot) {
        case WOTFilterOptions.None:
          // Only admins (and own profile) can choose None, use siteWoT for others
          return isWoTNpub || isOwnProfile
            ? true
            : isInWoT(siteWot, siteWotLevel, comment.event.pubkey)
        case WOTFilterOptions.Exclude:
          // Only admins (and own profile) can choose Exlude, use siteWoT for others
          // Exlude returns the mods not in the site's WoT
          return isWoTNpub || isOwnProfile
            ? !isInWoT(siteWot, siteWotLevel, comment.event.pubkey)
            : isInWoT(siteWot, siteWotLevel, comment.event.pubkey)
        case WOTFilterOptions.Site_Only:
          return isInWoT(siteWot, siteWotLevel, comment.event.pubkey)
        case WOTFilterOptions.Mine_Only:
          // Only admins (and own profile) can choose Mine_Only, use siteWoT for others
          return isWoTNpub || isOwnProfile
            ? isInWoT(userWot, userWotLevel, comment.event.pubkey)
            : isInWoT(siteWot, siteWotLevel, comment.event.pubkey)
        case WOTFilterOptions.Site_And_Mine:
          return (
            isInWoT(siteWot, siteWotLevel, comment.event.pubkey) &&
            isInWoT(userWot, userWotLevel, comment.event.pubkey)
          )
      }
    },
    [
      filterOptions.wot,
      userState.auth,
      userState.user?.npub,
      userState.user?.pubkey,
      siteWot,
      siteWotLevel,
      userWot,
      userWotLevel
    ]
  )

  return isCommentWot
}
