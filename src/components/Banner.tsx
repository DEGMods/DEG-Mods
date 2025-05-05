import navStyles from '../styles/nav.module.scss'

export const Banner = () => {
  return (
    <div className={navStyles.FundingCampaign}>
      <p className={navStyles.FundingCampaignLink}>
        DEG Mods is currently in alpha (
        <a
          href="https://geyser.fund/project/degmods/posts/view/3411"
          target="_blank"
        >
          Learn more
        </a>
        ). Check out its funding campaign (
        <a href="https://geyser.fund/project/degmods" target="_blank">
          Learn more
        </a>
        ). (Soon on Kickstarter)
      </p>
    </div>
  )
}
