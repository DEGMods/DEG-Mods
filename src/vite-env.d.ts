/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_RELAY: string
  readonly VITE_ADMIN_NPUBS: string
  readonly VITE_REPORTING_NPUB: string
  readonly VITE_SITE_WOT_NPUB: string
  readonly VITE_FALLBACK_MOD_IMAGE: string
  readonly VITE_FALLBACK_GAME_IMAGE: string
  readonly VITE_BLOG_NPUBS: string
  readonly VITE_DEFAULT_SERVER: string
  readonly VITE_DISABLE_NDK_LOGGING?: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
