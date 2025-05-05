import styles from '../styles/dotsSpinner.module.scss'

export const Spinner = () => (
  <div className="spinner">
    <div className="spinnerCircle"></div>
  </div>
)

export const Dots = () => <span className={styles.loading}></span>
