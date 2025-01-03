import { Outlet, ScrollRestoration } from 'react-router-dom'
import { Footer } from './footer'
import { Header } from './header'
import { SocialNav } from './socialNav'
import { Head } from './head'
import { useAppDispatch, useAppSelector, useNDKContext } from 'hooks'
import { useEffect } from 'react'
import { npubToHex } from 'utils'
import { calculateWot } from 'utils/wot'
import {
  setSiteWot,
  setSiteWotLevel,
  setSiteWotStatus,
  setUserWot,
  setUserWotLevel,
  WOTStatus
} from 'store/reducers/wot'
import { toast } from 'react-toastify'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { NDKKind } from '@nostr-dev-kit/ndk'
import { UserRelaysType } from 'types'

export const Layout = () => {
  const dispatch = useAppDispatch()
  const { ndk, fetchEventFromUserRelays } = useNDKContext()
  const userState = useAppSelector((state) => state.user)
  const { siteWotStatus } = useAppSelector((state) => state.wot)

  // calculate site's wot
  useEffect(() => {
    if (ndk) {
      const SITE_WOT_NPUB = import.meta.env.VITE_SITE_WOT_NPUB
      const hexPubkey = npubToHex(SITE_WOT_NPUB)
      if (hexPubkey) {
        dispatch(setSiteWotStatus(WOTStatus.LOADING))
        calculateWot(hexPubkey, ndk)
          .then((wot) => {
            dispatch(setSiteWot(wot))
          })
          .catch((err) => {
            console.trace('An error occurred in calculating site WOT', err)
            toast.error('An error occurred in calculating site web-of-trust!')
            dispatch(setSiteWotStatus(WOTStatus.FAILED))
          })
      }
    }
  }, [dispatch, ndk])

  // calculate user's wot
  useEffect(() => {
    if (ndk && userState.user?.pubkey) {
      const hexPubkey = npubToHex(userState.user.pubkey as string)
      if (hexPubkey)
        calculateWot(hexPubkey, ndk)
          .then((wot) => {
            dispatch(setUserWot(wot))
          })
          .catch((err) => {
            console.trace('An error occurred in calculating user WOT', err)
            toast.error('An error occurred in calculating user web-of-trust!')
          })
    }
  }, [dispatch, ndk, userState.user?.pubkey])

  // get site's wot level
  useEffect(() => {
    const SITE_WOT_NPUB = import.meta.env.VITE_SITE_WOT_NPUB
    const hexPubkey = npubToHex(SITE_WOT_NPUB)
    if (hexPubkey) {
      fetchEventFromUserRelays(
        {
          kinds: [NDKKind.AppSpecificData],
          '#d': ['degmods'],
          authors: [hexPubkey]
        },
        hexPubkey,
        UserRelaysType.Both
      ).then((event) => {
        if (event) {
          const wot = event.tagValue('wot')
          if (wot) dispatch(setSiteWotLevel(parseInt(wot)))
        }
      })
    }
  }, [dispatch, fetchEventFromUserRelays])

  // get user's wot level
  useEffect(() => {
    if (userState.user?.pubkey) {
      const hexPubkey = npubToHex(userState.user.pubkey as string)

      if (hexPubkey) {
        fetchEventFromUserRelays(
          {
            kinds: [NDKKind.AppSpecificData],
            '#d': ['degmods'],
            authors: [hexPubkey]
          },
          hexPubkey,
          UserRelaysType.Both
        ).then((event) => {
          if (event) {
            const wot = event.tagValue('wot')
            if (wot) dispatch(setUserWotLevel(parseInt(wot)))
          }
        })
      }
    }
  }, [dispatch, fetchEventFromUserRelays, userState.user?.pubkey])

  return (
    <>
      <Head />
      <Header />
      {siteWotStatus === WOTStatus.LOADED && <Outlet />}
      {siteWotStatus === WOTStatus.LOADING && (
        <LoadingSpinner desc="Loading site's web-of-trust" />
      )}
      {siteWotStatus === WOTStatus.FAILED && (
        <h3>Failed to load site's web-of-trust</h3>
      )}
      <Footer />
      <SocialNav />
      <ScrollRestoration />
    </>
  )
}
