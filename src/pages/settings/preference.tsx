import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { useAppDispatch, useAppSelector, useNDKContext } from 'hooks'
import { UnsignedEvent, Event } from 'nostr-tools'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { setSiteWotLevel, setUserWotLevel } from 'store/reducers/wot'
import { UserRelaysType } from 'types'
import { log, LogType, now, npubToHex } from 'utils'

// todo: use components from Input.tsx
export const PreferencesSetting = () => {
  const { ndk, fetchEventFromUserRelays, publish } = useNDKContext()
  const dispatch = useAppDispatch()

  const user = useAppSelector((state) => state.user.user)
  const { userWotLevel } = useAppSelector((state) => state.wot)

  const [wotLevel, setWotLevel] = useState(userWotLevel)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user?.pubkey) {
      const hexPubkey = user.pubkey as string
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
          if (wot) setWotLevel(parseInt(wot))
        }
      })
    }
  }, [user, fetchEventFromUserRelays])

  const handleSave = async () => {
    setIsSaving(true)

    let hexPubkey: string | undefined

    if (user?.pubkey) {
      hexPubkey = user.pubkey as string
    } else {
      try {
        hexPubkey = (await window.nostr?.getPublicKey()) as string
      } catch (error) {
        log(true, LogType.Error, `Could not get pubkey`, error)
      }
    }

    if (!hexPubkey) {
      toast.error('Could not get pubkey')
      setIsSaving(false)
      return
    }

    const unsignedEvent: UnsignedEvent = {
      kind: NDKKind.AppSpecificData,
      created_at: now(),
      pubkey: hexPubkey,
      content: '',
      tags: [
        ['d', 'degmods'],
        ['wot', wotLevel.toString()]
      ]
    }

    const signedEvent = await window.nostr
      ?.signEvent(unsignedEvent)
      .then((event) => event as Event)
      .catch((err) => {
        toast.error('Failed to sign the event!')
        log(true, LogType.Error, 'Failed to sign the event!', err)
        return null
      })

    if (!signedEvent) {
      setIsSaving(false)
      return
    }

    const ndkEvent = new NDKEvent(ndk, signedEvent)
    await publish(ndkEvent)
      .then((publishedOnRelays) => {
        toast.success(
          `Preferences published to following relays: \n\n${publishedOnRelays.join(
            '\n'
          )}`
        )

        dispatch(setUserWotLevel(wotLevel))

        // If wot admin, update site wot level too
        const SITE_WOT_NPUB = import.meta.env.VITE_SITE_WOT_NPUB
        const siteWotPubkey = npubToHex(SITE_WOT_NPUB)
        if (siteWotPubkey === hexPubkey) {
          dispatch(setSiteWotLevel(wotLevel))
        }
      })
      .catch((err) => {
        console.error(err)
        toast.error('Error: Failed to publish preferences!')
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  return (
    <>
      {isSaving && <LoadingSpinner desc='Saving preferences to relays' />}
      <div className='IBMSMSplitMainFullSideFWMid'>
        <div className='IBMSMSplitMainFullSideSec'>
          <div className='IBMSMSMBS_Write'>
            <div className='inputLabelWrapperMain'>
              <div className='labelWrapperMain'>
                <p className='labelMain'>Web of Trust (WoT) level</p>
              </div>
              <p className='labelDescriptionMain'>
                This affects what posts you see, reactions, DMs, and
                notifications. Learn more:&nbsp;Link
              </p>
              <div className='inputLabelWrapperMainSliderWrapper'>
                <input
                  className='form-range inputRangeMain inputRangeMainZap'
                  type='range'
                  max='100'
                  min='0'
                  value={wotLevel}
                  onChange={(e) => setWotLevel(parseInt(e.target.value))}
                  step='1'
                  required
                  name='WoTLevel'
                />
                <p className='ZapSplitUserBoxRangeText'>{wotLevel}</p>
              </div>
            </div>
            <div className='IBMSMSMBS_WriteAction'>
              <button
                className='btn btnMain'
                type='button'
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
