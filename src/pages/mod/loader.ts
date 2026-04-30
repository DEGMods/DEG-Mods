import { NDKKind } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { nip19 } from 'nostr-tools'
import { LoaderFunctionArgs, redirect } from 'react-router-dom'
import { appRoutes } from 'routes'
import { store } from 'store'
import {
  ModPageLoaderResult,
} from 'types'
import {
  getFallbackPubkey,
  log,
  LogType
} from 'utils'

/**
 * Mod route loader — performs only fast, synchronous validation (naddr decode,
 * edit-mode auth check) and returns safe defaults immediately.
 *
 * All heavy relay data fetching is handled by the useModData hook after
 * navigation, so clicking a mod card navigates instantly.
 */
export const modRouteLoader =
  (ndkContext: NDKContextType) =>
  async ({ params, request }: LoaderFunctionArgs) => {
    const { naddr } = params
    if (!naddr) {
      log(true, LogType.Error, 'Required naddr.')
      return redirect(appRoutes.mods)
    }

    // Decode from naddr
    let pubkey: string | undefined
    try {
      const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
      pubkey = decoded.data.pubkey
    } catch (error) {
      log(true, LogType.Error, `Failed to decode naddr: ${naddr}`, error)
      throw new Error('Failed to fetch the mod. The address might be wrong')
    }

    const userState = store.getState().user
    const loggedInUserPubkey =
      (userState?.user?.pubkey as string | undefined) || getFallbackPubkey()

    // Check if editing and the user is the original author
    // Redirect if NOT
    const url = new URL(request.url)
    const isEditMode = url.pathname.includes('edit-mod')
    if (isEditMode && loggedInUserPubkey !== pubkey) {
      return redirect(appRoutes.mods)
    }

    // Return safe defaults immediately — useModData hook handles all data
    // fetching after navigation, making card clicks feel instant.
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

    return result
  }
