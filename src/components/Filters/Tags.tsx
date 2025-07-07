import { useMemo } from 'react'

export type TagsProps = {
  title?: string
  tags: string[]
  setTags: (tags: string[]) => void
  onlyCount?: boolean
}

export const Tags: React.FunctionComponent<TagsProps> = ({
  tags,
  setTags,
  title = 'Tags',
  onlyCount = false
}) => {
  const remainingCount = tags.length - 1
  const buttonContent = useMemo(() => {
    if (tags.length === 0) {
      return title
    }

    if (onlyCount) {
      return (
        <span>
          {title}: <span className="IBMSMTag">{tags.length}</span>
        </span>
      )
    }

    if (tags.length === 1) {
      return (
        <span>
          {title}: <span className="IBMSMTag">{tags[0]}</span>
        </span>
      )
    }
    return (
      <span>
        {title}: <span className="IBMSMTag">{tags[0]}</span>
        <span
          className="IBMSMTitleMainHeadingSpan"
          style={{ fontSize: '11px', marginLeft: '5px' }}
        >
          & {remainingCount} more
        </span>
      </span>
    )
  }, [title, tags, remainingCount, onlyCount])

  const handleAddTag = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    event.stopPropagation()

    const inputElement = event.currentTarget.parentElement?.querySelector(
      'input'
    ) as HTMLInputElement
    const tagValue = inputElement?.value.trim()

    if (tagValue && !tags.includes(tagValue)) {
      const updatedTags = [tagValue, ...tags]
      setTags(updatedTags)
      inputElement.value = ''
    }
  }

  const handleKeyPress = (
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()

      const inputElement = event.currentTarget
      const tagValue = inputElement.value.trim()

      if (tagValue && !tags.includes(tagValue)) {
        const updatedTags = [tagValue, ...tags]
        setTags(updatedTags)
        inputElement.value = ''
      }
    }
  }

  const handleRemoveTag = (
    event: React.MouseEvent<HTMLDivElement>,
    tag: string
  ): void => {
    event.preventDefault()
    event.stopPropagation()

    const updatedTags = tags.filter((t) => t !== tag)
    setTags(updatedTags)
  }

  return (
    <div className="FiltersMainElement">
      <div className="dropdown dropdownMain">
        <button
          className="btn dropdown-toggle btnMain btnMainDropdown"
          aria-expanded="false"
          data-bs-toggle="dropdown"
          type="button"
        >
          <span style={{ userSelect: 'none' }}>{buttonContent}</span>
        </button>
        <div
          className="dropdown-menu dropdownMainMenu"
          style={{ overflow: 'hidden' }}
        >
          <div className="SearchMain" style={{ marginBottom: '5px' }}>
            <div className="SearchMainInside">
              <div className="SearchMainInsideWrapper">
                <input
                  type="text"
                  className="SMIWInput"
                  placeholder="Add tag"
                  onKeyDown={handleKeyPress}
                />
                <button
                  className="btn btnMain SMIWButton"
                  type="button"
                  onClick={handleAddTag}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                  >
                    <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div style={{ maxHeight: '132px', overflow: 'auto' }}>
            {tags.map((item, index) => (
              <div
                key={`searchingFilterItem-${index}`}
                className="dropdown-item dropdownMainMenuItem"
                onClick={(event) => handleRemoveTag(event, item)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <span style={{ userSelect: 'none' }}>{item}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 384 512"
                  width="12"
                  height="12"
                  fill="currentColor"
                  style={{ marginLeft: '8px' }}
                >
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"></path>
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
