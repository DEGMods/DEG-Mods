import { useEffect, useState } from 'react'

export const useAsyncLoader = <T>(loader: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    loader()
      .then((data) => setData(data))
      .catch(setError)
      .finally(() => setLoading(false))
  }, [loader])

  return { data, error, loading }
}
