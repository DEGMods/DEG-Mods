import NDK, {
  getRelayListForUser,
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKList,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
  NDKSubscriptionOptions,
  NDKUser,
  zapInvoiceFromEvent
} from '@nostr-dev-kit/ndk'
import NDKCacheAdapterDexie from '@nostr-dev-kit/ndk-cache-dexie'
import {
  CLIENT_NAME_VALUE,
  CLIENT_TAG_VALUE,
  MOD_FILTER_LIMIT,
  T_TAG_VALUE
} from 'constants.ts'
import { Dexie } from 'dexie'
import { createContext, ReactNode, useEffect, useMemo } from 'react'
import { toast } from 'react-toastify'
import { ModDetails, MuteLists, UserProfile, UserRelaysType } from 'types'
import {
  constructModListFromEvents,
  hexToNpub,
  log,
  LogType,
  npubToHex,
  orderEventsChronologically,
  timeout
} from 'utils'

export type FetchModsOptions = {
  source?: string
  until?: number
  since?: number
  limit?: number
  author?: string
}

export interface NDKContextType {
  ndk: NDK
  fetchMods: (opts: FetchModsOptions) => Promise<ModDetails[]>
  fetchEvents: (filter: NDKFilter) => Promise<NDKEvent[]>
  fetchEvent: (filter: NDKFilter) => Promise<NDKEvent | null>
  fetchEventsFromUserRelays: (
    filter: NDKFilter | NDKFilter[],
    hexKey: string,
    userRelaysType: UserRelaysType
  ) => Promise<NDKEvent[]>
  fetchEventFromUserRelays: (
    filter: NDKFilter | NDKFilter[],
    hexKey: string,
    userRelaysType: UserRelaysType
  ) => Promise<NDKEvent | null>
  findMetadata: (
    pubkey: string,
    opts?: NDKSubscriptionOptions
  ) => Promise<UserProfile>
  getTotalZapAmount: (
    user: string,
    eTag: string,
    aTag?: string,
    currentLoggedInUser?: string
  ) => Promise<{
    accumulatedZapAmount: number
    hasZapped: boolean
  }>
  publish: (event: NDKEvent) => Promise<string[]>
  getNSFWList: () => Promise<string[]>
  getMuteLists: (pubkey?: string) => Promise<{
    admin: MuteLists
    user: MuteLists
  }>
}

// Create the context with an initial value of `null`
export const NDKContext = createContext<NDKContextType | null>(null)

// Create a provider component to wrap around parts of your app
export const NDKContextProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    window.onunhandledrejection = async (event: PromiseRejectionEvent) => {
      event.preventDefault()
      if (event.reason?.name === Dexie.errnames.DatabaseClosed) {
        console.log(
          'Could not open Dexie DB, probably version change. Deleting old DB and reloading...'
        )
        await Dexie.delete('degmod-db')
        // Must reload to open a brand new DB
        window.location.reload()
      }
    }
  }, [])

  const addAdminRelays = async (ndk: NDK) => {
    const adminNpubs = import.meta.env.VITE_ADMIN_NPUBS.split(',')
    adminNpubs.forEach((npub) => {
      const hexKey = npubToHex(npub)
      if (hexKey) {
        getRelayListForUser(hexKey, ndk)
          .then((ndkRelayList) => {
            if (ndkRelayList) {
              ndkRelayList.bothRelayUrls.forEach((url) =>
                ndk.addExplicitRelay(url)
              )
            }
          })
          .catch((err) => {
            log(
              true,
              LogType.Error,
              `❌ Error occurred in getting the instance of NDKRelayList for npub: ${npub}`,
              err
            )
          })
      }
    })
  }

  const ndk = useMemo(() => {
    if (import.meta.env.MODE === 'development') {
      localStorage.setItem('debug', '*')
    } else {
      localStorage.removeItem('debug')
    }

    const dexieAdapter = new NDKCacheAdapterDexie({ dbName: 'degmod-db' })
    dexieAdapter.locking = true
    const ndk = new NDK({
      enableOutboxModel: true,
      autoConnectUserRelays: true,
      autoFetchUserMutelist: true,
      clientName: CLIENT_NAME_VALUE,
      clientNip89: CLIENT_TAG_VALUE,
      explicitRelayUrls: [
        'wss://user.kindpag.es',
        'wss://purplepag.es',
        'wss://relay.damus.io/',
        import.meta.env.VITE_APP_RELAY
      ],
      cacheAdapter: dexieAdapter
    })
    addAdminRelays(ndk)

    ndk.connect()

    return ndk
  }, [])

  /**
   * Fetches a list of mods based on the provided source.
   *
   * @param source - The source URL to filter the mods. If it matches the current window location,
   *                 it adds a filter condition to the request.
   * @param until - Optional timestamp to filter events until this time.
   * @param since - Optional timestamp to filter events from this time.
   * @returns A promise that resolves to an array of `ModDetails` objects. In case of an error,
   *          it logs the error and shows a notification, then returns an empty array.
   */
  const fetchMods = async ({
    source,
    until,
    since,
    limit,
    author
  }: FetchModsOptions): Promise<ModDetails[]> => {
    // Define the filter criteria for fetching mods
    const filter: NDKFilter = {
      kinds: [NDKKind.Classified], // Specify the kind of events to fetch
      limit: limit || MOD_FILTER_LIMIT, // Limit the number of events fetched to 20
      '#t': [T_TAG_VALUE]
    }

    // If the source matches the current window location, add a filter condition
    if (source === window.location.host) {
      filter['#r'] = [window.location.host] // Add a tag filter for the current host
    }
    // Optional filter to fetch events until this timestamp
    if (until) {
      filter['until'] = until
    }
    // Optional filter to fetch events from this timestamp
    if (since) {
      filter['since'] = since
    }
    // Optional filter to fetch events from only this author
    if (author) {
      filter['authors'] = [author]
    }

    return ndk
      .fetchEvents(filter, {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      .then((ndkEventSet) => {
        const ndkEvents = Array.from(ndkEventSet)
        orderEventsChronologically(ndkEvents)

        // Convert the fetched events into a list of mods
        const modList = constructModListFromEvents(ndkEvents)
        return modList // Return the list of mods
      })
      .catch((err) => {
        // Log the error and show a notification if fetching fails
        log(
          true,
          LogType.Error,
          'An error occurred in fetching mods from relays',
          err
        )
        toast.error('An error occurred in fetching mods from relays') // Show error notification
        return [] // Return an empty array in case of an error
      })
  }

  /**
   * Asynchronously retrieves multiple event based on a provided filter.
   *
   * @param filter - The filter criteria to find the event.
   * @returns  Returns a promise that resolves to the found event or null if not found.
   */
  const fetchEvents = async (filter: NDKFilter): Promise<NDKEvent[]> => {
    return ndk
      .fetchEvents(filter, {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      .then((ndkEventSet) => {
        const ndkEvents = Array.from(ndkEventSet)
        return orderEventsChronologically(ndkEvents)
      })
      .catch((err) => {
        // Log the error and show a notification if fetching fails
        log(true, LogType.Error, 'An error occurred in fetching events', err)
        toast.error('An error occurred in fetching events') // Show error notification
        return [] // Return an empty array in case of an error
      })
  }

  /**
   * Asynchronously retrieves an event based on a provided filter.
   *
   * @param filter - The filter criteria to find the event.
   * @returns  Returns a promise that resolves to the found event or null if not found.
   */
  const fetchEvent = async (filter: NDKFilter) => {
    const events = await fetchEvents(filter)
    if (events.length === 0) return null
    return events[0]
  }

  /**
   * Asynchronously retrieves multiple events from the user's relays based on a specified filter.
   * The function first retrieves the user's relays, and then fetches the events using the provided filter.
   *
   * @param filter - The event filter to use when fetching the event (e.g., kinds, authors).
   * @param hexKey - The hexadecimal representation of the user's public key.
   * @param userRelaysType - The type of relays to search (e.g., write, read).
   * @returns  A promise that resolves with an array of events.
   */
  const fetchEventsFromUserRelays = async (
    filter: NDKFilter | NDKFilter[],
    hexKey: string,
    userRelaysType: UserRelaysType
  ): Promise<NDKEvent[]> => {
    // Find the user's relays (10s timeout).
    const relayUrls = await Promise.race([
      getRelayListForUser(hexKey, ndk),
      timeout(3000)
    ])
      .then((ndkRelayList) => {
        if (ndkRelayList) return ndkRelayList[userRelaysType]
        return [] // Return an empty array if ndkRelayList is undefined
      })
      .catch((err) => {
        log(
          false, // Too many failed requests, turned off for clarity
          LogType.Error,
          `An error occurred in fetching user's (${hexKey}) ${userRelaysType}`,
          err
        )
        return [] as string[]
      })

    return ndk
      .fetchEvents(
        filter,
        { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.PARALLEL },
        relayUrls.length
          ? NDKRelaySet.fromRelayUrls(relayUrls, ndk, true)
          : undefined
      )
      .then((ndkEventSet) => {
        const ndkEvents = Array.from(ndkEventSet)
        return orderEventsChronologically(ndkEvents)
      })
      .catch((err) => {
        // Log the error and show a notification if fetching fails
        log(true, LogType.Error, 'An error occurred in fetching events', err)
        toast.error('An error occurred in fetching events') // Show error notification
        return [] // Return an empty array in case of an error
      })
  }

  /**
   * Fetches an event from the user's relays based on a specified filter.
   * The function first retrieves the user's relays, and then fetches the event using the provided filter.
   *
   * @param filter - The event filter to use when fetching the event (e.g., kinds, authors).
   * @param hexKey - The hexadecimal representation of the user's public key.
   * @param userRelaysType - The type of relays to search (e.g., write, read).
   * @returns  A promise that resolves to the fetched event or null if the operation fails.
   */
  const fetchEventFromUserRelays = async (
    filter: NDKFilter | NDKFilter[],
    hexKey: string,
    userRelaysType: UserRelaysType
  ) => {
    const events = await fetchEventsFromUserRelays(
      filter,
      hexKey,
      userRelaysType
    )
    if (events.length === 0) return null
    return events[0]
  }

  /**
   * Finds metadata for a given pubkey.
   *
   * @param hexKey - The pubkey to search for metadata.
   * @returns A promise that resolves to the metadata event.
   */
  const findMetadata = async (
    pubkey: string,
    opts?: NDKSubscriptionOptions
  ): Promise<UserProfile> => {
    const npub = hexToNpub(pubkey)

    const user = new NDKUser({ npub })
    user.ndk = ndk

    const userProfile = await user.fetchProfile(opts)

    return userProfile
  }

  const getTotalZapAmount = async (
    user: string,
    eTag: string,
    aTag?: string,
    currentLoggedInUser?: string
  ) => {
    const filters: NDKFilter[] = [
      {
        kinds: [NDKKind.Zap],
        '#e': [eTag],
        '#p': [user]
      }
    ]

    if (aTag) {
      filters.push({
        kinds: [NDKKind.Zap],
        '#a': [aTag],
        '#p': [user]
      })
    }

    const zapEvents = await fetchEventsFromUserRelays(
      filters,
      user,
      UserRelaysType.Read
    )

    let accumulatedZapAmount = 0
    let hasZapped = false

    zapEvents.forEach((zap) => {
      const zapInvoice = zapInvoiceFromEvent(zap)
      if (zapInvoice) {
        accumulatedZapAmount += Math.round(zapInvoice.amount / 1000)

        if (!hasZapped) hasZapped = zapInvoice.zappee === currentLoggedInUser
      }
    })

    return {
      accumulatedZapAmount,
      hasZapped
    }
  }

  const publish = async (event: NDKEvent): Promise<string[]> => {
    if (!event.sig) throw new Error('Before publishing first sign the event!')

    try {
      const res = await event.publish(undefined, 10000)
      const relaysPublishedOn = Array.from(res)
      return relaysPublishedOn.map((relay) => relay.url)
    } catch (err) {
      console.error(`An error occurred in publishing event`, err)
      return []
    }
  }

  /**
   * Retrieves a list of NSFW (Not Safe For Work) posts that were not specified as NSFW by post author but marked as NSFW by admin.
   *
   * @returns {Promise<string[]>} - A promise that resolves to an array of NSFW post identifiers (e.g., URLs or IDs).
   */
  const getNSFWList = async (): Promise<string[]> => {
    // Initialize an array to store the NSFW post identifiers
    const nsfwPosts: string[] = []

    const reportingNpub = import.meta.env.VITE_REPORTING_NPUB

    // Convert the  public key (npub) to a hexadecimal format
    const hexKey = npubToHex(reportingNpub)

    // If the conversion is successful and we have a hexKey
    if (hexKey) {
      // Fetch the event that contains the NSFW list
      const nsfwListEvent = await fetchEvent({
        kinds: [NDKKind.ArticleCurationSet],
        authors: [hexKey],
        '#d': ['nsfw']
      })

      if (nsfwListEvent) {
        // Convert the event data to an NDKList, which is a structured list format
        const list = NDKList.from(nsfwListEvent)

        // Iterate through the items in the list
        list.items.forEach((item) => {
          if (item[0] === 'a') {
            // Add the identifier of the NSFW post to the nsfwPosts array
            nsfwPosts.push(item[1])
          }
        })
      }
    }

    // Return the array of NSFW post identifiers
    return nsfwPosts
  }

  const getMuteLists = async (
    pubkey?: string
  ): Promise<{
    admin: MuteLists
    user: MuteLists
  }> => {
    const adminMutedAuthors = new Set<string>()
    const adminMutedPosts = new Set<string>()

    const reportingNpub = import.meta.env.VITE_REPORTING_NPUB

    const adminHexKey = npubToHex(reportingNpub)

    if (adminHexKey) {
      const muteListEvent = await fetchEvent({
        kinds: [NDKKind.MuteList],
        authors: [adminHexKey]
      })

      if (muteListEvent) {
        const list = NDKList.from(muteListEvent)

        list.items.forEach((item) => {
          if (item[0] === 'p') {
            adminMutedAuthors.add(item[1])
          } else if (item[0] === 'a') {
            adminMutedPosts.add(item[1])
          }
        })
      }
    }

    const userMutedAuthors = new Set<string>()
    const userMutedPosts = new Set<string>()

    if (pubkey) {
      const userHexKey = npubToHex(pubkey)

      if (userHexKey) {
        const muteListEvent = await fetchEvent({
          kinds: [NDKKind.MuteList],
          authors: [userHexKey]
        })

        if (muteListEvent) {
          const list = NDKList.from(muteListEvent)

          list.items.forEach((item) => {
            if (item[0] === 'p') {
              userMutedAuthors.add(item[1])
            } else if (item[0] === 'a') {
              userMutedPosts.add(item[1])
            }
          })
        }
      }
    }

    return {
      admin: {
        authors: Array.from(adminMutedAuthors),
        replaceableEvents: Array.from(adminMutedPosts)
      },
      user: {
        authors: Array.from(userMutedAuthors),
        replaceableEvents: Array.from(userMutedPosts)
      }
    }
  }

  return (
    <NDKContext.Provider
      value={{
        ndk,
        fetchMods,
        fetchEvents,
        fetchEvent,
        fetchEventsFromUserRelays,
        fetchEventFromUserRelays,
        findMetadata,
        getTotalZapAmount,
        publish,
        getNSFWList,
        getMuteLists
      }}
    >
      {children}
    </NDKContext.Provider>
  )
}
