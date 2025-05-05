import { NostrEvent } from '@nostr-dev-kit/ndk'
import { Dots } from 'components/Spinner'
import { useReactions } from 'hooks'

export const Reactions = (props: NostrEvent) => {
  const {
    isDataLoaded,
    likesCount,
    disLikesCount,
    handleReaction,
    hasReactedPositively,
    hasReactedNegatively
  } = useReactions({
    pubkey: props.pubkey,
    eTag: props.id!
  })

  return (
    <>
      <div
        className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEUp ${
          hasReactedPositively ? 'IBMSMSMBSSCL_CAEUpActive' : ''
        }`}
        onClick={isDataLoaded ? () => handleReaction(true) : undefined}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width="1em"
          height="1em"
          fill="currentColor"
          className="IBMSMSMBSSCL_CAElementIcon"
        >
          <path d="M0 190.9V185.1C0 115.2 50.52 55.58 119.4 44.1C164.1 36.51 211.4 51.37 244 84.02L256 96L267.1 84.02C300.6 51.37 347 36.51 392.6 44.1C461.5 55.58 512 115.2 512 185.1V190.9C512 232.4 494.8 272.1 464.4 300.4L283.7 469.1C276.2 476.1 266.3 480 256 480C245.7 480 235.8 476.1 228.3 469.1L47.59 300.4C17.23 272.1 .0003 232.4 .0003 190.9L0 190.9z"></path>
        </svg>
        <p className="IBMSMSMBSSCL_CAElementText">
          {isDataLoaded ? likesCount : <Dots />}
        </p>
        <div className="IBMSMSMBSSCL_CAElementLoadWrapper">
          <div className="IBMSMSMBSSCL_CAElementLoad"></div>
        </div>
      </div>
      <div
        className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEDown ${
          hasReactedNegatively ? 'IBMSMSMBSSCL_CAEDownActive' : ''
        }`}
        onClick={isDataLoaded ? () => handleReaction() : undefined}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width="1em"
          height="1em"
          fill="currentColor"
          className="IBMSMSMBSSCL_CAElementIcon"
        >
          <path d="M512 440.1C512 479.9 479.7 512 439.1 512H71.92C32.17 512 0 479.8 0 440c0-35.88 26.19-65.35 60.56-70.85C43.31 356 32 335.4 32 312C32 272.2 64.25 240 104 240h13.99C104.5 228.2 96 211.2 96 192c0-35.38 28.56-64 63.94-64h16C220.1 128 256 92.12 256 48c0-17.38-5.784-33.35-15.16-46.47C245.8 .7754 250.9 0 256 0c53 0 96 43 96 96c0 11.25-2.288 22-5.913 32h5.879C387.3 128 416 156.6 416 192c0 19.25-8.59 36.25-22.09 48H408C447.8 240 480 272.2 480 312c0 23.38-11.38 44.01-28.63 57.14C485.7 374.6 512 404.3 512 440.1z"></path>
        </svg>
        <p className="IBMSMSMBSSCL_CAElementText">
          {isDataLoaded ? disLikesCount : <Dots />}
        </p>
        <div className="IBMSMSMBSSCL_CAElementLoadWrapper">
          <div className="IBMSMSMBSSCL_CAElementLoad"></div>
        </div>
      </div>
    </>
  )
}
