import { Helmet } from 'react-helmet'
import thumb from '../assets/img/DEGM Thumb.png'
import logoWithCircle from '../assets/img/Logo with circle.png'

export const Head = () => {
  return (
    <Helmet>
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content="DEG Mods - Liberating Game Mods" />
      <meta
        property="og:description"
        content="Never get your game mods censored, get banned, lose your history, nor lose the connection between game mod creators and fans. Download your mods freely."
      />
      <meta property="og:image" content={thumb} />
      <meta property="og:url" content="https://degmods.com" />
      <meta property="og:type" content="website" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="DEG Mods - Liberating Game Mods" />
      <meta
        name="twitter:description"
        content="Never get your game mods censored, get banned, lose your history, nor lose the connection between game mod creators and fans. Download your mods freely."
      />
      <meta name="twitter:image" content={thumb} />

      {/* Other Meta Tags */}
      <meta
        name="description"
        content="Never get your game mods censored, get banned, lose your history, nor lose the connection between game mod creators and fans. Download your mods freely."
      />

      <link rel="icon" type="image/png" sizes="935x934" href={logoWithCircle} />

      {/* Umami Analytics */}
      <script
        defer
        src="https://an.degmods.com/script.js"
        data-website-id="5738aafa-e5ab-4e8a-b92b-41828ddd9c1b"
      ></script>
    </Helmet>
  )
}
