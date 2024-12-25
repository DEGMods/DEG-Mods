import { useEffect } from 'react'

export const useBodyScrollDisable = (disable: boolean) => {
  useEffect(() => {
    if (disable) document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [disable])
}
