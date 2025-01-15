import { PropsWithChildren, useEffect, useMemo, useState } from 'react'
import { useNavigation } from 'react-router-dom'
import styles from '../../styles/loadingSpinner.module.scss'

interface Props {
  desc: string
}

export const LoadingSpinner = ({ desc }: Props) => {
  return (
    <div className={styles.loadingSpinnerOverlay}>
      <div className={styles.loadingSpinnerContainer}>
        <div className={styles.loadingSpinner}></div>
        {desc && <span>{desc}</span>}
      </div>
    </div>
  )
}

export const RouterLoadingSpinner = () => {
  const navigation = useNavigation()

  if (navigation.state === 'idle') return null

  const desc =
    navigation.state.charAt(0).toUpperCase() + navigation.state.slice(1)

  return <LoadingSpinner desc={`${desc}...`} />
}

interface TimerLoadingSpinner {
  timeoutMs?: number
  countdownMs?: number
}

export const TimerLoadingSpinner = ({
  timeoutMs = 10000,
  countdownMs = 30000,
  children
}: PropsWithChildren<TimerLoadingSpinner>) => {
  const [show, setShow] = useState(false)
  const [timer, setTimer] = useState(
    Math.floor((countdownMs - timeoutMs) / 1000)
  )
  const startTime = useMemo(() => Date.now(), [])

  useEffect(() => {
    let interval: number
    const timeout = window.setTimeout(() => {
      setShow(true)
      interval = window.setInterval(() => {
        const time = Date.now() - startTime
        const diff = Math.max(0, countdownMs - time)
        setTimer(Math.floor(diff / 1000))
      }, 1000)
    }, timeoutMs)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [countdownMs, startTime, timeoutMs])

  return (
    <div className={styles.loadingSpinnerOverlay}>
      <div className={styles.loadingSpinnerContainer}>
        <div className={styles.loadingSpinner}></div>
        {children}
        {show && (
          <>
            <div>You can try again in {timer}s...</div>
          </>
        )}
      </div>
    </div>
  )
}
