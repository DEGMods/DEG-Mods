import { useRef, useEffect } from 'react'

export const useDidMount = (callback: () => void) => {
  const didMount = useRef<boolean>(false)

  useEffect(() => {
    if (callback && !didMount.current) {
      didMount.current = true
      callback()
    }
  })
}
