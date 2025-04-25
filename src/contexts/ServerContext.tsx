import {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState
} from 'react'
import { ServerService } from '../controllers/server'

export const ServerContext = createContext<{
  state: string
  retryCount: number
  isServerActive: boolean
  isRelayFallbackActive: boolean
}>({
  state: 'disabled',
  retryCount: 0,
  isServerActive: false,
  isRelayFallbackActive: false
})

export const ServerProvider = ({ children }: PropsWithChildren) => {
  const [serverState, setServerState] = useState<string>('disabled')
  const [retryCount, setRetryCount] = useState<number>(0)
  const isServerActive = useMemo(() => serverState === 'active', [serverState])
  const isRelayFallbackActive = useMemo(
    () =>
      (retryCount > 2 && serverState === 'retrying') ||
      serverState === 'inactive' ||
      serverState === 'disabled',
    [retryCount, serverState]
  )

  useEffect(() => {
    const service = ServerService.getInstance()
    const handleStateChange = (event: Event) =>
      setServerState((event as CustomEvent).detail)

    const handleRetryChange = (event: Event) =>
      setRetryCount((event as CustomEvent).detail)

    service.addEventListener('stateChange', handleStateChange)
    service.addEventListener('retry', handleRetryChange)

    return () => {
      service.removeEventListener('stateChange', handleStateChange)
      service.removeEventListener('retry', handleRetryChange)
    }
  }, [])

  return (
    <ServerContext.Provider
      value={{
        state: serverState,
        retryCount,
        isServerActive,
        isRelayFallbackActive
      }}
    >
      {children}
    </ServerContext.Provider>
  )
}
