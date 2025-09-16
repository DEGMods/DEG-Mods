import styles from '../styles/dotsSpinner.module.scss'

interface SpinnerProps {
  height?: number
}

export const Spinner = ({ height = 40 }: SpinnerProps) => (
  <div className="spinner">
    <div className="spinnerCircle" style={{ height, width: height }}></div>
  </div>
)

export const Dots = () => <span className={styles.loading}></span>
