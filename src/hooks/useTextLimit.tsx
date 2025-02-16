import { MAX_VISIBLE_TEXT_PER_COMMENT } from '../constants'
import { useState } from 'react'

interface UseTextLimitResult {
  text: string
  isTextOverflowing: boolean
  isExpanded: boolean
  toggle: () => void
}

export const useTextLimit = (
  text: string,
  limit: number = MAX_VISIBLE_TEXT_PER_COMMENT
): UseTextLimitResult => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getFilteredTextAndIndices = (): {
    filteredText: string
    indices: number[]
  } => {
    const words = text.split(' ')
    const filteredWords: string[] = []
    const indices: number[] = []
    let currentIndex = 0

    words.forEach((word) => {
      if (!word.startsWith('nostr:')) {
        filteredWords.push(word)
        indices.push(currentIndex)
      }
      currentIndex += word.length + 1
    })

    return { filteredText: filteredWords.join(' '), indices }
  }

  const { filteredText, indices } = getFilteredTextAndIndices()
  const isTextOverflowing = filteredText.length > limit

  const getUpdatedText = (): string => {
    if (isExpanded || !isTextOverflowing) {
      return text
    }
    const sliceEndIndex = indices.find((index) => index >= limit) || limit
    return text.slice(0, sliceEndIndex) + '…'
  }

  return {
    text: getUpdatedText(),
    isTextOverflowing,
    isExpanded,
    toggle: () => setIsExpanded((prev) => !prev)
  }
}
