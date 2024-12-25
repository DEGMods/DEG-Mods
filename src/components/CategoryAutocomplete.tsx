import { useLocalStorage } from 'hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getGamePageRoute } from 'routes'
import { ModFormState, Categories, Category } from 'types'
import {
  getCategories,
  flattenCategories,
  addToUserCategories,
  capitalizeEachWord
} from 'utils'

interface CategoryAutocompleteProps {
  game: string
  LTags: string[]
  setFormState: (value: React.SetStateAction<ModFormState>) => void
}

export const CategoryAutocomplete = ({
  game,
  LTags,
  setFormState
}: CategoryAutocompleteProps) => {
  // Fetch the hardcoded categories from assets
  const flattenedCategories = useMemo(() => getCategories(), [])

  // Fetch the user categories from local storage
  const [userHierarchies, setUserHierarchies] = useLocalStorage<
    (string | Category)[]
  >('user-hierarchies', [])
  const flattenedUserCategories = useMemo(
    () => flattenCategories(userHierarchies, []),
    [userHierarchies]
  )

  // Create options and select categories from the mod LTags (hierarchies)
  const { selectedCategories, combinedOptions } = useMemo(() => {
    const combinedCategories = [
      ...flattenedCategories,
      ...flattenedUserCategories
    ]
    const hierarchies = LTags.map((hierarchy) => {
      const existingCategory = combinedCategories.find(
        (cat) => cat.hierarchy === hierarchy.replace(/:/g, ' > ')
      )
      if (existingCategory) {
        return existingCategory
      } else {
        const segments = hierarchy.split(':')
        const lastSegment = segments[segments.length - 1]
        return { name: lastSegment, hierarchy: hierarchy, l: [lastSegment] }
      }
    })

    // Selected categorires (based on the LTags)
    const selectedCategories = Array.from(new Set([...hierarchies]))

    // Combine user, predefined category hierarchies and selected values (LTags in case some are missing)
    const combinedOptions = Array.from(
      new Set([...combinedCategories, ...selectedCategories])
    )

    return { selectedCategories, combinedOptions }
  }, [LTags, flattenedCategories, flattenedUserCategories])

  const [inputValue, setInputValue] = useState<string>('')
  const filteredOptions = useMemo(
    () =>
      combinedOptions.filter((option) =>
        option.hierarchy.toLowerCase().includes(inputValue.toLowerCase())
      ),
    [combinedOptions, inputValue]
  )

  const getSelectedCategories = (cats: Categories[]) => {
    const uniqueValues = new Set(
      cats.reduce<string[]>((prev, cat) => [...prev, ...cat.l], [])
    )
    const concatenatedValue = Array.from(uniqueValues)
    return concatenatedValue
  }
  const getSelectedHierarchy = (cats: Categories[]) => {
    const hierarchies = cats.reduce<string[]>(
      (prev, cat) => [...prev, cat.hierarchy.replace(/ > /g, ':')],
      []
    )
    const concatenatedValue = Array.from(hierarchies)
    return concatenatedValue
  }
  const handleReset = () => {
    setFormState((prevState) => ({
      ...prevState,
      ['lTags']: [],
      ['LTags']: []
    }))
    setInputValue('')
  }
  const handleRemove = (option: Categories) => {
    const updatedCategories = selectedCategories.filter(
      (cat) => cat.hierarchy !== option.hierarchy
    )
    setFormState((prevState) => ({
      ...prevState,
      ['lTags']: getSelectedCategories(updatedCategories),
      ['LTags']: getSelectedHierarchy(updatedCategories)
    }))
  }
  const handleSelect = (option: Categories) => {
    if (!selectedCategories.some((cat) => cat.hierarchy === option.hierarchy)) {
      const updatedCategories = [...selectedCategories, option]
      setFormState((prevState) => ({
        ...prevState,
        ['lTags']: getSelectedCategories(updatedCategories),
        ['LTags']: getSelectedHierarchy(updatedCategories)
      }))
    }
    setInputValue('')
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }
  const handleAddNew = () => {
    if (inputValue) {
      const value = inputValue.trim().toLowerCase()
      const values = value.split('>').map((s) => s.trim())
      const newOption: Categories = {
        name: value,
        hierarchy: value,
        l: values
      }
      setUserHierarchies((prev) => {
        addToUserCategories(prev, value)
        return [...prev]
      })
      const updatedCategories = [...selectedCategories, newOption]
      setFormState((prevState) => ({
        ...prevState,
        ['lTags']: getSelectedCategories(updatedCategories),
        ['LTags']: getSelectedHierarchy(updatedCategories)
      }))
      setInputValue('')
    }
  }
  const handleAddNewCustom = (option: Categories) => {
    setUserHierarchies((prev) => {
      addToUserCategories(prev, option.hierarchy)
      return [...prev]
    })
  }

  const Row = ({ index }: { index: number }) => {
    return (
      <div
        className='dropdown-item dropdownMainMenuItem dropdownMainMenuItemCategory'
        onClick={() => handleSelect(filteredOptions[index])}
      >
        {capitalizeEachWord(filteredOptions[index].hierarchy)}

        {/* Show "Remove" button when the category is selected */}
        {selectedCategories.some(
          (cat) => cat.hierarchy === filteredOptions[index].hierarchy
        ) && (
          <button
            type='button'
            className='btn btnMain btnMainInsideField btnMainRemove'
            onClick={() => handleRemove(filteredOptions[index])}
            title='Remove'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='-32 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M323.3 32.01H188.7C172.3 32.01 160 44.31 160 60.73V96.01H32C14.33 96.01 0 110.3 0 128S14.33 160 32 160H480c17.67 0 32-14.33 32-32.01S497.7 96.01 480 96.01H352v-35.28C352 44.31 339.7 32.01 323.3 32.01zM64.9 477.5C66.5 492.3 79.31 504 94.72 504H417.3c15.41 0 28.22-11.72 29.81-26.5L480 192.2H32L64.9 477.5z'></path>
            </svg>
          </button>
        )}

        {/* Show "Add" button when the category is not included in the predefined or userdefined lists */}
        {!flattenedCategories.some(
          (cat) => cat.hierarchy === filteredOptions[index].hierarchy
        ) &&
          !flattenedUserCategories.some(
            (cat) => cat.hierarchy === filteredOptions[index].hierarchy
          ) && (
            <button
              type='button'
              className='btn btnMain btnMainInsideField btnMainAdd'
              onClick={() => handleAddNewCustom(filteredOptions[index])}
              title='Add'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='-32 0 512 512'
                width='1em'
                height='1em'
                fill='currentColor'
              >
                <path d='M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z'></path>
              </svg>
            </button>
          )}
      </div>
    )
  }

  return (
    <div className='inputLabelWrapperMain'>
      <label className='form-label labelMain'>Categories</label>
      <p className='labelDescriptionMain'>You can select multiple categories</p>
      <div className='dropdown dropdownMain'>
        <div className='inputWrapperMain inputWrapperMainAlt'>
          <input
            type='text'
            className='inputMain inputMainWithBtn dropdown-toggle'
            placeholder='Select some categories...'
            data-bs-toggle='dropdown'
            value={inputValue}
            onChange={handleInputChange}
          />
          <button
            className='btn btnMain btnMainInsideField btnMainRemove'
            title='Remove'
            type='button'
            onClick={handleReset}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
            >
              <path d='M480 416C497.7 416 512 430.3 512 448C512 465.7 497.7 480 480 480H150.6C133.7 480 117.4 473.3 105.4 461.3L25.37 381.3C.3786 356.3 .3786 315.7 25.37 290.7L258.7 57.37C283.7 32.38 324.3 32.38 349.3 57.37L486.6 194.7C511.6 219.7 511.6 260.3 486.6 285.3L355.9 416H480zM265.4 416L332.7 348.7L195.3 211.3L70.63 336L150.6 416L265.4 416z'></path>
            </svg>
          </button>

          <div
            className='dropdown-menu dropdownMainMenu dropdownMainMenuAlt category'
            style={{
              maxHeight: '500px'
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((c, i) => <Row key={c.hierarchy} index={i} />)
            ) : (
              <div
                className='dropdown-item dropdownMainMenuItem dropdownMainMenuItemCategory'
                onClick={handleAddNew}
              >
                {inputValue &&
                !filteredOptions?.find(
                  (option) =>
                    option.hierarchy.toLowerCase() === inputValue.toLowerCase()
                ) ? (
                  <>
                    Add "{inputValue}"
                    <button
                      type='button'
                      className='btn btnMain btnMainInsideField btnMainAdd'
                      title='Add'
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='-32 0 512 512'
                        width='1em'
                        height='1em'
                        fill='currentColor'
                      >
                        <path d='M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z'></path>
                      </svg>
                    </button>
                  </>
                ) : (
                  <>No matches</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {LTags.length > 0 && (
        <div className='IBMSMSMBSSCategories'>
          {LTags.map((hierarchy) => {
            const hierarchicalCategories = hierarchy.split(`:`)
            const categories = hierarchicalCategories
              .map<React.ReactNode>((c, i) => {
                const partialHierarchy = hierarchicalCategories
                  .slice(0, i + 1)
                  .join(':')

                return game ? (
                  <Link
                    key={`category-${i}`}
                    target='_blank'
                    to={{
                      pathname: getGamePageRoute(game),
                      search: `h=${partialHierarchy}`
                    }}
                    className='IBMSMSMBSSCategoriesBoxItem'
                  >
                    <p>{capitalizeEachWord(c)}</p>
                  </Link>
                ) : (
                  <p className='IBMSMSMBSSCategoriesBoxItem'>
                    {capitalizeEachWord(c)}
                  </p>
                )
              })
              .reduce((prev, curr, i) => [
                prev,
                <div
                  key={`separator-${i}`}
                  className='IBMSMSMBSSCategoriesBoxSeparator'
                >
                  <p>&gt;</p>
                </div>,
                curr
              ])

            return (
              <div key={hierarchy} className='IBMSMSMBSSCategoriesBox'>
                {categories}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
