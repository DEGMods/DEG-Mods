import { useLocalStorage } from './useLocalStorage'

/**
 * Hook to manage moderation settings
 * Provides access to enhanced moderation and trust filter options
 */
export const useModerationSettings = () => {
  const [enhancedModeration, setEnhancedModeration] = useLocalStorage<boolean>(
    'enhanced-moderation-filter',
    false
  )
  const [enhancedTrust, setEnhancedTrust] = useLocalStorage<boolean>(
    'enhanced-trust-filter',
    false
  )

  return {
    enhancedModeration,
    enhancedTrust,
    setEnhancedModeration,
    setEnhancedTrust
  }
}
