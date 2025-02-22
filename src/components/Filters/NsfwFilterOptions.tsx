import { FilterOptions, NSFWFilter } from 'types'
import { Option } from './Option'
import { NsfwAlertPopup } from 'components/NsfwAlertPopup'
import { useState } from 'react'
import { useLocalStorage } from 'hooks'
import { DEFAULT_FILTER_OPTIONS } from 'utils'

interface NsfwFilterOptionsProps {
  filterKey: string
  skipOnlyNsfw?: boolean
}

export const NsfwFilterOptions = ({
  filterKey,
  skipOnlyNsfw
}: NsfwFilterOptionsProps) => {
  const [, setFilterOptions] = useLocalStorage<FilterOptions>(
    filterKey,
    DEFAULT_FILTER_OPTIONS
  )
  const [showNsfwPopup, setShowNsfwPopup] = useState<boolean>(false)
  const [selectedNsfwOption, setSelectedNsfwOption] = useState<
    NSFWFilter | undefined
  >()
  const [confirmNsfw] = useLocalStorage<boolean>('confirm-nsfw', false)
  const handleConfirm = (confirm: boolean) => {
    if (confirm && selectedNsfwOption) {
      setFilterOptions((prev) => ({
        ...prev,
        nsfw: selectedNsfwOption
      }))
    }
  }

  return (
    <>
      {Object.values(NSFWFilter).map((item, index) => {
        // Posts feed filter exception
        if (item === NSFWFilter.Only_NSFW && skipOnlyNsfw) return null

        return (
          <Option
            key={`nsfwFilterItem-${index}`}
            onClick={() => {
              // Trigger NSFW popup
              if (
                (item === NSFWFilter.Only_NSFW ||
                  item === NSFWFilter.Show_NSFW) &&
                !confirmNsfw
              ) {
                setSelectedNsfwOption(item)
                setShowNsfwPopup(true)
              } else {
                setFilterOptions((prev) => ({
                  ...prev,
                  nsfw: item
                }))
              }
            }}
          >
            {item}
          </Option>
        )
      })}
      {showNsfwPopup && (
        <NsfwAlertPopup
          handleConfirm={handleConfirm}
          handleClose={() => setShowNsfwPopup(false)}
        />
      )}
    </>
  )
}
