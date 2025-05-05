import { useServer } from 'hooks'
import { ModsPageWithServer } from './server'
import { ModsPageWithRelays } from './relay'

export const ModsPage = () => {
  const { isServerActive } = useServer()

  if (isServerActive) return <ModsPageWithServer />

  return <ModsPageWithRelays />
}
