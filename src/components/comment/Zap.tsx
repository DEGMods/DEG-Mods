import { NostrEvent } from '@nostr-dev-kit/ndk'
import { ZapPopUp } from 'components/Zap'
import {
  useAppSelector,
  useNDKContext,
  useBodyScrollDisable,
  useDidMount
} from 'hooks'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { abbreviateNumber } from 'utils'

export const Zap = (props: NostrEvent) => {
  const [isOpen, setIsOpen] = useState(false)
  const [totalZappedAmount, setTotalZappedAmount] = useState(0)
  const [hasZapped, setHasZapped] = useState(false)

  const userState = useAppSelector((state) => state.user)
  const { getTotalZapAmount } = useNDKContext()

  useBodyScrollDisable(isOpen)

  useDidMount(() => {
    getTotalZapAmount(
      props.pubkey,
      props.id!,
      undefined,
      userState.user?.pubkey as string
    )
      .then((res) => {
        setTotalZappedAmount(res.accumulatedZapAmount)
        setHasZapped(res.hasZapped)
      })
      .catch((err) => {
        toast.error(err.message || err)
      })
  })

  return (
    <>
      <div
        className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEBolt ${
          hasZapped ? 'IBMSMSMBSSCL_CAEBoltActive' : ''
        }`}
        onClick={() => setIsOpen(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-64 0 512 512"
          width="1em"
          height="1em"
          fill="currentColor"
          className="IBMSMSMBSSCL_CAElementIcon"
        >
          <path d="M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z"></path>
        </svg>
        <p className="IBMSMSMBSSCL_CAElementText">
          {abbreviateNumber(totalZappedAmount)}
        </p>
        <div className="IBMSMSMBSSCL_CAElementLoadWrapper">
          <div className="IBMSMSMBSSCL_CAElementLoad"></div>
        </div>
      </div>
      {isOpen && (
        <ZapPopUp
          title="Tip/Zap"
          receiver={props.pubkey}
          eventId={props.id}
          handleClose={() => setIsOpen(false)}
          setTotalZapAmount={setTotalZappedAmount}
          setHasZapped={setHasZapped}
        />
      )}
    </>
  )
}
