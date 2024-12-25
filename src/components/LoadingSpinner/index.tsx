import { useNavigation } from 'react-router-dom'
import styles from '../../styles/loadingSpinner.module.scss'

interface Props {
  desc: string
}

export const LoadingSpinner = (props: Props) => {
  const { desc } = props

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
