import { NDKEvent, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { nip19 } from 'nostr-tools'
import { LoaderFunctionArgs, redirect } from 'react-router-dom'
import { appRoutes } from 'routes'
import { store } from 'store'
import { ModPageLoaderResult } from 'types'
import {
  extractModData,
  getFallbackPubkey,
  log,
  LogType
} from 'utils'

/**
 * Edit-mod route loader — fetches the mod event so the edit form can be
 * pre-filled. Unlike the view-page loader (which returns fast defaults),
 * this loader must wait for the mod data before rendering.
 */
export const modEditRouteLoader =
  (ndkContext: NDKContextType) =>
  async ({ params }: LoaderFunctionArgs) => {
    const { naddr } = params
    if (!naddr) {
      log(true, LogType.Error, 'Required naddr.')
      return redirect(appRoutes.mods)
    }

    let pubkey: string | undefined
    let identifier: string | undefined
    let kind: number | undefined
    try {
      const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
      pubkey = decoded.data.pubkey
      identifier = decoded.data.identifier
      kind = decoded.data.kind
    } catch (error) {
      log(true, LogType.Error, `Failed to decode naddr: ${naddr}`, error)
      throw new Error('Failed to fetch the mod. The address might be wrong')
    }

    const userState = store.getState().user
    const loggedInUserPubkey =
      (userState?.user?.pubkey as string | undefined) || getFallbackPubkey()

    // Only the author can edit
    if (loggedInUserPubkey !== pubkey) {
      return redirect(appRoutes.mods)
    }

    const result: ModPageLoaderResult = {
      mod: undefined,
      event: undefined,
      latest: [],
      isAddedToNSFW: false,
      isBlocked: false,
      isRepost: false,
      isHardBlocked: false,
      hardBlockedType: undefined,
      isIllegalBlocked: false,
      illegalBlockedType: undefined,
      isBlockCheckComplete: false
    }

    try {
      const filter = {
        '#a': [identifier || ''],
        authors: [pubkey || ''],
        kinds: [kind || 0]
      }

      // Fetch the mod event
      const modEvent = await new Promise<NDKEvent | null>((resolve) => {
        let bestEvent: NDKEvent | null = null
        const sub = ndkContext.ndk.subscribe(filter, {
          closeOnEose: true,
          cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
        })
        sub.on('event', (event: NDKEvent) => {
          if (!bestEvent || event.created_at! > bestEvent.created_at!) {
            bestEvent = event
          }
        })
        sub.on('eose', () => resolve(bestEvent))
        setTimeout(() => resolve(bestEvent), 15000)
      })

      if (modEvent) {
        result.event = modEvent
        result.mod = extractModData(modEvent)
      }

      if (!result.mod) {
        throw new Error('We are unable to find the mod on the relays')
      }

      return result
    } catch (error) {
      let message = 'An error occurred in fetching mod details from relays'
      log(true, LogType.Error, message, error)
      if (error instanceof Error) {
        message = error.message
        throw new Error(message)
      }
    }
  }
