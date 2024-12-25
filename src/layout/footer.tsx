import styles from '../styles/footer.module.scss'

export const Footer = () => {
  return (
    <div className={styles.secMainFooterWrapper}>
      <div className={styles.secMainFooter}>
        <p className={styles.secMainFooterPara}>
          Built with&nbsp;
          <a
            className={styles.secMainFooterParaLink}
            href='https://github.com/nostr-protocol/nostr'
            target='_blank'
          >
            Nostr
          </a>{' '}
          by&nbsp;
          <a
            className={styles.secMainFooterParaLink}
            href='https://degmods.com/profile/nprofile1qqsre6jgq6c7r2vzn5cdtju20qq36sn3cer5avc4x8kfru5pzrlr7sqnancjp'
            target='_blank'
          >
            Freakoverse
          </a>
          , with the support of{' '}
          <a className={styles.secMainFooterParaLink} href='backers.html'>
            Supporters
          </a>
          . Check our&nbsp;
          <a className={styles.secMainFooterParaLink} href='backup.html'>
            Backup Plan
          </a>
          .
        </p>
      </div>
    </div>
  )
}
