import { NDKContextType } from 'contexts/NDKContext'
import { nip19 } from 'nostr-tools'
import { LoaderFunctionArgs, redirect } from 'react-router-dom'
import { appRoutes, getProfilePageRoute } from 'routes'
import { store } from 'store'
import { MuteLists, UserProfile } from 'types'
import {
  CurationSetIdentifiers,
  getFallbackPubkey,
  getReportingSet,
  log,
  LogType,
  npubToHex
} from 'utils'

export interface ProfilePageLoaderResult {
  profilePubkey: string
  profile: UserProfile
  isBlocked: boolean
  muteLists: {
    admin: MuteLists
    user: MuteLists
  }
  nsfwList: string[]
  repostList: string[]
}

export const profileRouteLoader =
  (ndkContext: NDKContextType) =>
  async ({ params }: LoaderFunctionArgs) => {
    // Try to decode nprofile parameter
    const { nprofile } = params
    let profilePubkey: string | undefined
    try {
      // Decode if it starts with nprofile1
      if (nprofile?.startsWith('nprofile1')) {
        const value = nprofile
          ? nip19.decode(nprofile as `nprofile1${string}`)
          : undefined
        profilePubkey = value?.data.pubkey
      } else if (nprofile?.startsWith('npub1')) {
        // Try to get hex from the npub and encode it to nprofile
        const value = npubToHex(nprofile)
        if (value) {
          return redirect(
            getProfilePageRoute(
              nip19.nprofileEncode({
                pubkey: value
              })
            )
          )
        }
      }
    } catch (error) {
      // Silently ignore and redirect to home or logged in user
      log(true, LogType.Error, 'Failed to decode nprofile.', error)
    }

    // Get the current state
    const userState = store.getState().user
    const loggedInUserPubkey =
      (userState?.user?.pubkey as string | undefined) || getFallbackPubkey()

    // Redirect if profile naddr is missing
    // - home if user is not logged
    let profileRoute = appRoutes.home
    if (!profilePubkey && loggedInUserPubkey) {
      // - own profile
      profileRoute = getProfilePageRoute(
        nip19.nprofileEncode({
          pubkey: loggedInUserPubkey
        })
      )
    }
    if (!profilePubkey) return redirect(profileRoute)

    // Empty result
    const result: ProfilePageLoaderResult = {
      profilePubkey: profilePubkey,
      profile: {},
      isBlocked: false,
      muteLists: {
        admin: {
          authors: [],
          replaceableEvents: []
        },
        user: {
          authors: [],
          replaceableEvents: []
        }
      },
      nsfwList: [],
      repostList: []
    }

    const settled = await Promise.allSettled([
      ndkContext.findMetadata(profilePubkey),
      ndkContext.getMuteLists(loggedInUserPubkey),
      getReportingSet(CurationSetIdentifiers.NSFW, ndkContext),
      getReportingSet(CurationSetIdentifiers.Repost, ndkContext)
    ])

    // Check the profile event result
    const profileEventResult = settled[0]
    if (profileEventResult.status === 'fulfilled' && profileEventResult.value) {
      result.profile = profileEventResult.value
    } else if (profileEventResult.status === 'rejected') {
      log(
        true,
        LogType.Error,
        'Failed to fetch profile.',
        profileEventResult.reason
      )
    }

    // Check the mutelist event result
    const muteListResult = settled[1]
    if (muteListResult.status === 'fulfilled' && muteListResult.value) {
      result.muteLists = muteListResult.value

      // Check if user has blocked this profile
      result.isBlocked = result.muteLists.user.authors.includes(profilePubkey)
    } else if (muteListResult.status === 'rejected') {
      log(
        true,
        LogType.Error,
        'Failed to fetch mutelist.',
        muteListResult.reason
      )
    }

    // Check the nsfwlist event result
    const nsfwListResult = settled[2]
    if (nsfwListResult.status === 'fulfilled' && nsfwListResult.value) {
      result.nsfwList = nsfwListResult.value
    } else if (nsfwListResult.status === 'rejected') {
      log(
        true,
        LogType.Error,
        'Failed to fetch nsfwlist.',
        nsfwListResult.reason
      )
    }

    // Check the repostlist event result
    const repostListResult = settled[3]
    if (repostListResult.status === 'fulfilled' && repostListResult.value) {
      result.repostList = repostListResult.value
    } else if (repostListResult.status === 'rejected') {
      log(
        true,
        LogType.Error,
        'Failed to fetch repost list.',
        repostListResult.reason
      )
    }

    return result
  }
