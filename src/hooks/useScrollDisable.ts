import { useEffect } from 'react'

export const useBodyScrollDisable = (disable: boolean) => {
  useEffect(() => {
    const initialOverflow = document.body.style.overflow

    if (disable && initialOverflow !== 'hidden') {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      if (initialOverflow !== 'hidden') {
        document.body.style.overflow = initialOverflow
      }
    }
  }, [disable])
}
