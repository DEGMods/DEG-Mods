import { Addressable } from 'types'
import { abbreviateNumber } from 'utils'
import { Zap } from './Zap'
import { Reactions } from './Reactions'

type InteractionsProps = {
  addressable: Addressable
  commentCount: number
}

export const Interactions = ({
  addressable,
  commentCount
}: InteractionsProps) => {
  return (
    <div className='IBMSMSplitMainBigSideSec'>
      <div className='IBMSMSMBSS_Details'>
        <a style={{ textDecoration: 'unset', color: 'unset' }}>
          <div className='IBMSMSMBSS_Details_Card IBMSMSMBSS_D_CComments'>
            <div className='IBMSMSMBSS_Details_CardVisual'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 512 512'
                width='1em'
                height='1em'
                fill='currentColor'
                className='IBMSMSMBSS_Details_CardVisualIcon'
              >
                <path d='M256 31.1c-141.4 0-255.1 93.12-255.1 208c0 49.62 21.35 94.98 56.97 130.7c-12.5 50.37-54.27 95.27-54.77 95.77c-2.25 2.25-2.875 5.734-1.5 8.734c1.249 3 4.021 4.766 7.271 4.766c66.25 0 115.1-31.76 140.6-51.39c32.63 12.25 69.02 19.39 107.4 19.39c141.4 0 255.1-93.13 255.1-207.1S397.4 31.1 256 31.1zM127.1 271.1c-17.75 0-32-14.25-32-31.1s14.25-32 32-32s32 14.25 32 32S145.7 271.1 127.1 271.1zM256 271.1c-17.75 0-31.1-14.25-31.1-31.1s14.25-32 31.1-32s31.1 14.25 31.1 32S273.8 271.1 256 271.1zM383.1 271.1c-17.75 0-32-14.25-32-31.1s14.25-32 32-32s32 14.25 32 32S401.7 271.1 383.1 271.1z'></path>
              </svg>
            </div>
            <p className='IBMSMSMBSS_Details_CardText'>
              {abbreviateNumber(commentCount)}
            </p>
          </div>
        </a>
        <Zap addressable={addressable} />
        <Reactions addressable={addressable} />
      </div>
    </div>
  )
}