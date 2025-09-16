import { NDKContextType } from 'contexts/NDKContext'
import { store } from 'store'
import { MuteLists } from 'types'
import {
  getReportingSet,
  CurationSetIdentifiers,
  log,
  LogType,
  getFallbackPubkey
} from 'utils'

export interface ModsPageLoaderResult {
  muteLists: {
    admin: MuteLists
    user: MuteLists
  }
  nsfwList: string[]
  repostList: string[]
}

export const modsRouteLoader = (ndkContext: NDKContextType) => async () => {
  // Empty result
  const result: ModsPageLoaderResult = {
    muteLists: {
      admin: {
        authors: [],
        replaceableEvents: [],
        hardBlockedAuthors: [],
        hardBlockedEvents: [],
        blockedFileHashes: []
      },
      user: {
        authors: [],
        replaceableEvents: [],
        hardBlockedAuthors: [],
        hardBlockedEvents: [],
        blockedFileHashes: []
      }
    },
    nsfwList: [],
    repostList: []
  }

  // Get the current state
  const userState = store.getState().user
  const loggedInUserPubkey =
    (userState?.user?.pubkey as string | undefined) || getFallbackPubkey()

  const settled = await Promise.allSettled([
    ndkContext.getMuteLists(loggedInUserPubkey),
    getReportingSet(CurationSetIdentifiers.NSFW, ndkContext),
    getReportingSet(CurationSetIdentifiers.Repost, ndkContext)
  ])

  // Check the mutelist event result
  const muteListResult = settled[0]
  if (muteListResult.status === 'fulfilled' && muteListResult.value) {
    result.muteLists = muteListResult.value
  } else if (muteListResult.status === 'rejected') {
    log(true, LogType.Error, 'Failed to fetch mutelist.', muteListResult.reason)
  }

  // Check the nsfwlist event result
  const nsfwListResult = settled[1]
  if (nsfwListResult.status === 'fulfilled' && nsfwListResult.value) {
    result.nsfwList = nsfwListResult.value
  } else if (nsfwListResult.status === 'rejected') {
    log(true, LogType.Error, 'Failed to fetch nsfwlist.', nsfwListResult.reason)
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

  return result
}
