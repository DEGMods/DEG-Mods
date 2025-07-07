import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { DEFAULT_EXCLUDED_TAGS } from 'utils/consts'

export const useExcludedTags = () => {
  const [excludedTags, setExcludedTags] = useLocalStorage<string[]>(
    'excluded-tags',
    DEFAULT_EXCLUDED_TAGS
  )

  useEffect(() => {
    if (excludedTags.length === 0) {
      setExcludedTags(DEFAULT_EXCLUDED_TAGS)
    }
  }, [excludedTags, setExcludedTags])

  return { excludedTags, setExcludedTags }
}
