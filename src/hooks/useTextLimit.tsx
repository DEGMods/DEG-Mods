import { MAX_VISIBLE_TEXT_PER_COMMENT } from '../constants'
import { useState } from 'react'

export const useTextLimit = (
  text: string,
  limit: number = MAX_VISIBLE_TEXT_PER_COMMENT
) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isTextOverflowing = text.length > limit
  const updated =
    isExpanded || !isTextOverflowing ? text : text.slice(0, limit) + '…'

  return {
    text: updated,
    isTextOverflowing,
    isExpanded,
    toggle: () => setIsExpanded((prev) => !prev)
  }
}
