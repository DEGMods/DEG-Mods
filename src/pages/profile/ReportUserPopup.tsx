import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { CheckboxField } from 'components/Inputs'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { useNDKContext, useAppSelector } from 'hooks'
import { now } from 'lodash'
import { UnsignedEvent } from 'nostr-tools'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { UserRelaysType } from 'types'
import {
  log,
  LogType,
  npubToHex,
  signAndPublish,
  sendDMUsingRandomKey
} from 'utils'

type ReportUserPopupProps = {
  reportedPubkey: string
  handleClose: () => void
}

const USER_REPORT_REASONS = [
  { label: `User posts actual CP`, key: 'user_actuallyCP' },
  { label: `User is a spammer`, key: 'user_spam' },
  { label: `User is a scammer`, key: 'user_scam' },
  { label: `User posts malware`, key: 'user_malware' },
  { label: `User posts non-mods`, key: 'user_notAGameMod' },
  { label: `User doesn't tag NSFW`, key: 'user_wasntTaggedNSFW' },
  { label: `Other (user)`, key: 'user_otherReason' }
]

export const ReportUserPopup = ({
  reportedPubkey,
  handleClose
}: ReportUserPopupProps) => {
  const { ndk, fetchEventFromUserRelays, publish } = useNDKContext()
  const userState = useAppSelector((state) => state.user)
  const [selectedOptions, setSelectedOptions] = useState(
    USER_REPORT_REASONS.reduce((acc: { [key: string]: boolean }, cur) => {
      acc[cur.key] = false
      return acc
    }, {})
  )
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSpinnerDesc, setLoadingSpinnerDesc] = useState('')

  const handleCheckboxChange = (option: keyof typeof selectedOptions) => {
    setSelectedOptions((prevState) => ({
      ...prevState,
      [option]: !prevState[option]
    }))
  }

  const handleSubmit = async () => {
    const selectedOptionsCount = Object.values(selectedOptions).filter(
      (isSelected) => isSelected
    ).length

    if (selectedOptionsCount === 0) {
      toast.error('At least one option should be checked!')
      return
    }

    setIsLoading(true)
    setLoadingSpinnerDesc('Getting user pubkey')
    let userHexKey: string | undefined
    if (userState.auth && userState.user?.pubkey) {
      userHexKey = userState.user.pubkey as string
    } else {
      try {
        userHexKey = (await window.nostr?.getPublicKey()) as string
      } catch (error) {
        log(true, LogType.Error, `Could not get pubkey`, error)
      }
    }

    if (!userHexKey) {
      toast.error('Could not get pubkey for reporting user!')
      setIsLoading(false)
      return
    }

    const reportingNpub = import.meta.env.VITE_REPORTING_NPUB
    const reportingPubkey = npubToHex(reportingNpub)

    if (reportingPubkey === userHexKey) {
      setLoadingSpinnerDesc(`Finding user's mute list`)
      // Define the event filter to search for the user's mute list events.
      // We look for events of a specific kind (Mutelist) authored by the given hexPubkey.
      const filter: NDKFilter = {
        kinds: [NDKKind.MuteList],
        authors: [userHexKey]
      }

      // Fetch the mute list event from the relays. This returns the event containing the user's mute list.
      const muteListEvent = await fetchEventFromUserRelays(
        filter,
        userHexKey,
        UserRelaysType.Write
      )

      let unsignedEvent: UnsignedEvent

      if (muteListEvent) {
        // get a list of tags
        const tags = muteListEvent.tags
        const alreadyExists =
          tags.findIndex(
            (item) => item[0] === 'p' && item[1] === reportedPubkey
          ) !== -1

        if (alreadyExists) {
          setIsLoading(false)
          return toast.warn(
            `Reporter user's pubkey is already in the mute list`
          )
        }

        tags.push(['p', reportedPubkey])

        unsignedEvent = {
          pubkey: muteListEvent.pubkey,
          kind: NDKKind.MuteList,
          content: muteListEvent.content,
          created_at: now(),
          tags: [...tags]
        }
      } else {
        unsignedEvent = {
          pubkey: userHexKey,
          kind: NDKKind.MuteList,
          content: '',
          created_at: now(),
          tags: [['p', reportedPubkey]]
        }
      }

      setLoadingSpinnerDesc('Updating mute list event')
      const isUpdated = await signAndPublish(unsignedEvent, ndk, publish)
      if (isUpdated) handleClose()
    } else {
      const href = window.location.href
      let message = `I'd like to report ${href} due to following reasons:\n`

      Object.entries(selectedOptions).forEach(([key, value]) => {
        if (value) {
          message += `* ${key}\n`
        }
      })

      setLoadingSpinnerDesc('Sending report')
      const isSent = await sendDMUsingRandomKey(
        message,
        reportingPubkey!,
        ndk,
        publish
      )
      if (isSent) handleClose()
    }
    setIsLoading(false)
  }

  return (
    <>
      {isLoading && <LoadingSpinner desc={loadingSpinnerDesc} />}
      <div className='popUpMain'>
        <div className='ContainerMain'>
          <div className='popUpMainCardWrapper'>
            <div className='popUpMainCard popUpMainCardQR'>
              <div className='popUpMainCardTop'>
                <div className='popUpMainCardTopInfo'>
                  <h3>Report User</h3>
                </div>
                <div className='popUpMainCardTopClose' onClick={handleClose}>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='-96 0 512 512'
                    width='1em'
                    height='1em'
                    fill='currentColor'
                    style={{ zIndex: 1 }}
                  >
                    <path d='M310.6 361.4c12.5 12.5 12.5 32.75 0 45.25C304.4 412.9 296.2 416 288 416s-16.38-3.125-22.62-9.375L160 301.3L54.63 406.6C48.38 412.9 40.19 416 32 416S15.63 412.9 9.375 406.6c-12.5-12.5-12.5-32.75 0-45.25l105.4-105.4L9.375 150.6c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L160 210.8l105.4-105.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-105.4 105.4L310.6 361.4z'></path>
                  </svg>
                </div>
              </div>
              <div className='pUMCB_Zaps'>
                <div className='pUMCB_ZapsInside'>
                  <div className='inputLabelWrapperMain'>
                    <label
                      className='form-label labelMain'
                      style={{ fontWeight: 'bold' }}
                    >
                      Why are you reporting the user?
                    </label>
                    {USER_REPORT_REASONS.map((r) => (
                      <CheckboxField
                        key={r.key}
                        label={r.label}
                        name={r.key}
                        isChecked={selectedOptions[r.key]}
                        handleChange={() => handleCheckboxChange(r.key)}
                      />
                    ))}
                    <button
                      className='btn btnMain pUMCB_Report'
                      type='button'
                      style={{ width: '100%' }}
                      onClick={handleSubmit}
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
