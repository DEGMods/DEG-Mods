import { useSearchParams } from 'react-router-dom'
import { Tags } from './Tags'
import { useCallback, useState, useEffect } from 'react'
import { useExcludedTags } from 'hooks'

const TagsFilter: React.FunctionComponent = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tags, setTags] = useState<string[]>(() => {
    const tagsParam = searchParams.get('t')
    return tagsParam
      ? tagsParam
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : []
  })
  const [excludeTags, setExcludeTags] = useState<string[]>(() => {
    const excludeTagsParam = searchParams.get('et')
    return excludeTagsParam
      ? excludeTagsParam
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : []
  })
  const {
    excludedTags: excludedTagsFromLocalStorage,
    setExcludedTags: setExcludedTagsFromLocalStorage
  } = useExcludedTags()
  const handleSetTags = useCallback(
    (tags: string[]) => {
      setTags(tags)

      if (tags.length > 0) {
        searchParams.set('t', tags.join(','))
      } else {
        searchParams.delete('t')
      }

      setSearchParams(searchParams, {
        replace: true
      })
    },
    [searchParams, setSearchParams]
  )

  const handleSetExcludeTags = useCallback(
    (tags: string[]) => {
      setExcludeTags(tags)
      setExcludedTagsFromLocalStorage(tags)

      if (tags.length > 0) {
        searchParams.set('et', tags.join(','))
      } else {
        searchParams.delete('et')
      }

      setSearchParams(searchParams, {
        replace: true
      })
    },
    [searchParams, setSearchParams, setExcludedTagsFromLocalStorage]
  )

  useEffect(() => {
    handleSetExcludeTags(excludedTagsFromLocalStorage)
  }, [excludedTagsFromLocalStorage, handleSetExcludeTags])

  return (
    <>
      <Tags tags={tags} setTags={handleSetTags} />
      <Tags
        tags={excludeTags}
        setTags={handleSetExcludeTags}
        title="Exclude Tags"
        onlyCount
      />
    </>
  )
}

export default TagsFilter
