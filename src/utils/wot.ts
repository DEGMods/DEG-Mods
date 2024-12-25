import NDK, {
  Hexpubkey,
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage,
  NDKTag
} from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'

interface UserRelations {
  follows: Set<Hexpubkey>
  muted: Set<Hexpubkey>
}

type Network = Map<Hexpubkey, UserRelations>

export const calculateWot = async (pubkey: Hexpubkey, ndk: NDK) => {
  const WoT: Record<string, number> = {}

  const userRelations = await findFollowsAndMuteUsers(pubkey, ndk)
  const follows = Array.from(userRelations.follows)
  const muted = Array.from(userRelations.muted)

  // Add all the following users to WoT with score set to Positive_Infinity
  follows.forEach((f) => {
    WoT[f] = Number.POSITIVE_INFINITY
  })

  // Add all the muted users to WoT with score set to Negative_Infinity
  muted.forEach((m) => {
    WoT[m] = Number.NEGATIVE_INFINITY
  })

  const network: Network = new Map()

  // find the userRelations of every user in follow list
  const promises = follows.map((user) =>
    findFollowsAndMuteUsers(user, ndk).then((userRelations) => {
      network.set(user, userRelations)
    })
  )
  await Promise.all(promises)

  // make a list of all the users in the network either mutes or followed
  const users = new Set<Hexpubkey>()
  const userRelationsArray = Array.from(network.values())
  userRelationsArray.forEach(({ follows, muted }) => {
    follows.forEach((f) => users.add(f))
    muted.forEach((m) => users.add(m))
  })

  users.forEach((user) => {
    // Only calculate if it's not already added to WoT
    if (!(user in WoT)) {
      const wotScore = calculateWoTScore(user, network)
      WoT[user] = wotScore
    }
  })

  return WoT
}

export const calculateWoTScore = (user: Hexpubkey, network: Network) => {
  let wotScore = 0

  // iterate over all the entries in the network and increment/decrement
  // wotScore based on the list user in which exists (followed/mutes)
  network.forEach(({ follows, muted }) => {
    if (follows.has(user)) wotScore += 1

    if (muted.has(user)) wotScore -= 1
  })

  return wotScore
}

export const findFollowsAndMuteUsers = async (
  pubkey: string,
  ndk: NDK
): Promise<UserRelations> => {
  const follows = new Set<Hexpubkey>()
  const muted = new Set<Hexpubkey>()

  const filter: NDKFilter = {
    kinds: [NDKKind.Contacts, NDKKind.MuteList],
    authors: [pubkey]
  }

  const events = await ndk.fetchEvents(filter, {
    groupable: false,
    closeOnEose: true,
    cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
  })

  events.forEach((event) => {
    if (event.kind === NDKKind.Contacts) {
      filterValidPTags(event.tags).forEach((f) => {
        follows.add(f)
      })
    }

    if (event.kind === NDKKind.MuteList) {
      filterValidPTags(event.tags).forEach((f) => {
        muted.add(f)
      })
    }
  })

  return {
    follows,
    muted
  }
}

export const filterValidPTags = (tags: NDKTag[]) =>
  tags
    .filter((t: NDKTag) => t[0] === 'p')
    .map((t: NDKTag) => t[1])
    .filter((f: Hexpubkey) => {
      try {
        nip19.npubEncode(f)
        return true
      } catch {
        return false
      }
    })

export const isInWoT = (
  WoT: Record<string, number>,
  targetScore: number,
  targetUser: string
): boolean => {
  const wotScore = WoT[targetUser] ?? 0 // Default to 0 if the user is not in the record
  return wotScore >= targetScore
}
