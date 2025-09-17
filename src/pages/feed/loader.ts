import { NDKUser } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { LoaderFunctionArgs, redirect } from 'react-router-dom'
import { appRoutes } from 'routes'
import { store } from 'store'
import { MuteLists } from 'types'
import {
  CurationSetIdentifiers,
  getFallbackPubkey,
  getReportingSet,
  log,
  LogType
} from 'utils'

export interface FeedPageLoaderResult {
  muteLists: {
    admin: MuteLists
    user: MuteLists
  }
  nsfwList: string[]
  repostList: string[]
  followList: string[]
}

export const feedPageLoader =
  (ndkContext: NDKContextType) =>
  async ({ params }: LoaderFunctionArgs) => {
    const { note } = params
    // Empty result
    const result: FeedPageLoaderResult = {
      muteLists: {
        admin: {
          authors: [],
          replaceableEvents: [],
          hardBlockedAuthors: [],
          hardBlockedEvents: [],
          illegalBlockedAuthors: [],
          illegalBlockedEvents: [],
          blockedFileHashes: []
        },
        user: {
          authors: [],
          replaceableEvents: [],
          hardBlockedAuthors: [],
          hardBlockedEvents: [],
          illegalBlockedAuthors: [],
          illegalBlockedEvents: [],
          blockedFileHashes: []
        }
      },
      nsfwList: [],
      repostList: [],
      followList: []
    }

    // Get the current state
    const userState = store.getState().user
    const loggedInUserPubkey =
      (userState?.user?.pubkey as string | undefined) || getFallbackPubkey()

    // Exception for visiting notes directly
    if (!loggedInUserPubkey && !note) return redirect(appRoutes.home)
    const ndkUser = new NDKUser({ pubkey: loggedInUserPubkey })
    ndkUser.ndk = ndkContext.ndk

    const settled = await Promise.allSettled([
      ndkContext.getMuteLists(loggedInUserPubkey),
      getReportingSet(CurationSetIdentifiers.NSFW, ndkContext),
      getReportingSet(CurationSetIdentifiers.Repost, ndkContext),
      ndkUser.followSet()
    ])

    // Check the mutelist event result
    const muteListResult = settled[0]
    if (muteListResult.status === 'fulfilled' && muteListResult.value) {
      result.muteLists = muteListResult.value
    } else if (muteListResult.status === 'rejected') {
      log(
        true,
        LogType.Error,
        'Failed to fetch mutelist.',
        muteListResult.reason
      )
    }

    // Check the nsfwlist event result
    const nsfwListResult = settled[1]
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
    const repostListResult = settled[2]
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

    // Check the followSet result
    const followSetResult = settled[3]
    if (followSetResult.status === 'fulfilled') {
      result.followList = Array.from(followSetResult.value)
    } else if (followSetResult.status === 'rejected') {
      log(
        true,
        LogType.Error,
        'Failed to fetch follow set.',
        followSetResult.reason
      )
    }

    return result
  }
