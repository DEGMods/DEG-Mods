import { Link } from 'react-router-dom'
import styles from '../styles/footer.module.scss'
import { appRoutes, getProfilePageRoute } from 'routes'

export const Footer = () => {
  return (
    <div className={styles.secMainFooterWrapper}>
      <div className={styles.secMainFooter}>
        <p className={styles.secMainFooterPara}>
          Built with&nbsp;
          <a
            rel="noopener"
            className={styles.secMainFooterParaLink}
            href="https://github.com/nostr-protocol/nostr"
            target="_blank"
          >
            Nostr
          </a>{' '}
          by&nbsp;
          <Link
            className={styles.secMainFooterParaLink}
            to={getProfilePageRoute(
              'nprofile1qqsre6jgq6c7r2vzn5cdtju20qq36sn3cer5avc4x8kfru5pzrlr7sqnancjp'
            )}
            target="_blank"
          >
            Freakoverse
          </Link>
          , with the support of{' '}
          <Link
            className={styles.secMainFooterParaLink}
            to={appRoutes.supporters}
          >
            Supporters
          </Link>
          . Check our&nbsp;
          <Link className={styles.secMainFooterParaLink} to={appRoutes.backup}>
            Backup Plan
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
