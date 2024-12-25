import { NDKContextType } from 'contexts/NDKContext'
import { store } from 'store'
import { MuteLists } from 'types'
import { getReportingSet, CurationSetIdentifiers, log, LogType } from 'utils'

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

  // Get the current state
  const userState = store.getState().user

  // Check if current user is logged in
  let userPubkey: string | undefined
  if (userState.auth && userState.user?.pubkey) {
    userPubkey = userState.user.pubkey as string
  }

  const settled = await Promise.allSettled([
    ndkContext.getMuteLists(userPubkey),
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
