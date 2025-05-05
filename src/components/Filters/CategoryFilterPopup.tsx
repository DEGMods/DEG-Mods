import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Category } from 'types'
import {
  addToUserCategories,
  capitalizeEachWord,
  deleteFromUserCategories,
  flattenCategories
} from 'utils'
import { useLocalStorage } from 'hooks'
import { useSearchParams } from 'react-router-dom'
import styles from './CategoryFilterPopup.module.scss'
import categoriesData from './../../assets/categories/categories.json'

interface CategoryFilterPopupProps {
  categories: string[]
  setCategories: React.Dispatch<React.SetStateAction<string[]>>
  hierarchies: string[]
  setHierarchies: React.Dispatch<React.SetStateAction<string[]>>
  handleClose: () => void
}

export const CategoryFilterPopup = ({
  categories,
  setCategories,
  hierarchies,
  setHierarchies,
  handleClose
}: CategoryFilterPopupProps) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const linkedHierarchy = searchParams.get('h')

  const [userHierarchies, setUserHierarchies] = useLocalStorage<
    (string | Category)[]
  >('user-hierarchies', [])
  const [filterCategories, setFilterCategories] = useState(categories)
  const [filterHierarchies, setFilterHierarchies] = useState(hierarchies)
  const handleApply = () => {
    // Update selection with linked category if it exists
    if (linkedHierarchy !== null && linkedHierarchy !== '') {
      // Combine existing selection with the linked
      setFilterHierarchies((prev) => {
        prev.push(linkedHierarchy)
        const newFilterHierarchies = Array.from(new Set([...prev]))
        setHierarchies(newFilterHierarchies)
        return newFilterHierarchies
      })
      // Clear hierarchy link in search params
      searchParams.delete('h')
      setSearchParams(searchParams)
    } else {
      setHierarchies(filterHierarchies)
    }
    setCategories(filterCategories)
  }
  const [inputValue, setInputValue] = useState<string>('')
  const userHierarchiesMatching = useMemo(
    () =>
      flattenCategories(userHierarchies, []).some((h) =>
        h.hierarchy.includes(inputValue.toLowerCase())
      ),
    [inputValue, userHierarchies]
  )
  // const hierarchiesMatching = useMemo(
  //   () =>
  //     flattenCategories(categoriesData, []).some((h) =>
  //       h.hierarchy.includes(inputValue.toLowerCase())
  //     ),
  //   [inputValue]
  // )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }
  const handleSingleSelection = (category: string, isSelected: boolean) => {
    let updatedCategories = [...filterCategories]
    if (isSelected) {
      updatedCategories.push(category)
    } else {
      updatedCategories = updatedCategories.filter((item) => item !== category)
    }
    setFilterCategories(updatedCategories)
  }
  const handleCombinationSelection = (path: string[], isSelected: boolean) => {
    const pathString = path.join(':')
    let updatedHierarchies = [...filterHierarchies]
    if (isSelected) {
      updatedHierarchies.push(pathString)
    } else {
      updatedHierarchies = updatedHierarchies.filter(
        (item) => item !== pathString
      )
    }
    setFilterHierarchies(updatedHierarchies)
  }
  const handleAddNew = () => {
    if (inputValue) {
      const value = inputValue.toLowerCase()
      const values = value
        .trim()
        .split('>')
        .map((s) => s.trim())

      setUserHierarchies((prev) => {
        addToUserCategories(prev, value)
        return [...prev]
      })

      const path = values.join(':')

      // Add new hierarchy to current selection and active selection
      // Convert through set to remove duplicates
      setFilterHierarchies((prev) => {
        prev.push(path)
        return Array.from(new Set([...prev]))
      })
      setHierarchies((prev) => {
        prev.push(path)
        return Array.from(new Set([...prev]))
      })
      setInputValue('')
    }
  }

  return createPortal(
    <div className="popUpMain">
      <div className="ContainerMain">
        <div className="popUpMainCardWrapper">
          <div className="popUpMainCard">
            <div className="popUpMainCardTop">
              <div className="popUpMainCardTopInfo">
                <h3>Categories filter</h3>
              </div>
              <div className="popUpMainCardTopClose" onClick={handleClose}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-96 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                  style={{ zIndex: 1 }}
                >
                  <path d="M310.6 361.4c12.5 12.5 12.5 32.75 0 45.25C304.4 412.9 296.2 416 288 416s-16.38-3.125-22.62-9.375L160 301.3L54.63 406.6C48.38 412.9 40.19 416 32 416S15.63 412.9 9.375 406.6c-12.5-12.5-12.5-32.75 0-45.25l105.4-105.4L9.375 150.6c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L160 210.8l105.4-105.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-105.4 105.4L310.6 361.4z"></path>
                </svg>
              </div>
            </div>
            <div className="pUMCB_Zaps">
              <div className="pUMCB_ZapsInside">
                <div className="inputLabelWrapperMain">
                  <label
                    className="form-label labelMain"
                    style={{ fontWeight: 'bold' }}
                  >
                    Choose categories...
                  </label>
                  <p className="labelDescriptionMain">
                    Choose one or more pre-definied or custom categories to
                    filter out mods with.
                  </p>
                </div>
                <input
                  type="text"
                  className="inputMain inputMainWithBtn"
                  placeholder="Select some categories..."
                  value={inputValue}
                  onChange={handleInputChange}
                />
                {userHierarchies.length > 0 && (
                  <>
                    <div className="inputLabelWrapperMain">
                      <label
                        className="form-label labelMain"
                        style={{ fontWeight: 'bold' }}
                      >
                        Custom categories
                      </label>
                      <p className="labelDescriptionMain">
                        Here&apos;s where your custom categories appear (You can
                        add them in the above field. Example &gt; banana &gt;
                        seed)
                      </p>
                    </div>
                    <div
                      className="inputMain"
                      style={{
                        minHeight: '40px',
                        maxHeight: '500px',
                        height: '100%',
                        overflow: 'auto'
                      }}
                    >
                      {!userHierarchiesMatching && <div>No results.</div>}
                      {userHierarchies
                        .filter((c) => typeof c !== 'string')
                        .map((c, i) => (
                          <CategoryCheckbox
                            key={`${c}_${i}`}
                            inputValue={inputValue}
                            category={c}
                            path={[c.name]}
                            handleSingleSelection={handleSingleSelection}
                            handleCombinationSelection={
                              handleCombinationSelection
                            }
                            selectedSingles={filterCategories}
                            selectedCombinations={filterHierarchies}
                            handleRemove={(path) => {
                              setUserHierarchies((prev) => {
                                deleteFromUserCategories(prev, path.join('>'))
                                return [...prev]
                              })

                              // Remove the deleted hierarchies from current filter selection and active selection
                              setFilterHierarchies((prev) =>
                                prev.filter(
                                  (h) => !h.startsWith(path.join(':'))
                                )
                              )
                              setHierarchies((prev) =>
                                prev.filter(
                                  (h) => !h.startsWith(path.join(':'))
                                )
                              )
                            }}
                          />
                        ))}
                    </div>
                  </>
                )}
                <div className="inputLabelWrapperMain">
                  <div className="inputLabelWrapperMain">
                    <label
                      className="form-label labelMain"
                      style={{ fontWeight: 'bold' }}
                    >
                      Categories
                    </label>
                    <p className="labelDescriptionMain">
                      Here&apos;s where you select any of the pre-defined
                      categories
                    </p>
                  </div>
                  <div
                    className="inputMain"
                    style={{
                      minHeight: '40px',
                      maxHeight: '500px',
                      height: '100%',
                      overflow: 'auto'
                    }}
                  >
                    <div className={`${styles.noResult}`}>
                      <div>No results.</div>
                      <br />
                      {userHierarchiesMatching ? (
                        <div>Already defined in your categories</div>
                      ) : (
                        <div
                          className="dropdown-item dropdownMainMenuItem dropdownMainMenuItemCategory"
                          onClick={handleAddNew}
                        >
                          Add and search for "{inputValue}" category
                          <button
                            type="button"
                            className="btn btnMain btnMainInsideField btnMainAdd"
                            title="Add"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="-32 0 512 512"
                              width="1em"
                              height="1em"
                              fill="currentColor"
                            >
                              <path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"></path>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {(categoriesData as Category[]).map((category) => {
                      const name =
                        typeof category === 'string' ? category : category.name
                      return (
                        <CategoryCheckbox
                          key={name}
                          inputValue={inputValue}
                          category={category}
                          path={[name]}
                          handleSingleSelection={handleSingleSelection}
                          handleCombinationSelection={
                            handleCombinationSelection
                          }
                          selectedSingles={filterCategories}
                          selectedCombinations={filterHierarchies}
                        />
                      )
                    })}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    gap: '10px'
                  }}
                >
                  <button
                    className="btn btnMain btnMainPopup"
                    type="button"
                    onPointerDown={handleClose}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btnMain btnMainPopup"
                    type="button"
                    onPointerDown={() => {
                      // Clear the linked hierarchy
                      searchParams.delete('h')
                      setSearchParams(searchParams)

                      // Clear current filters
                      setFilterCategories([])
                      setFilterHierarchies([])
                    }}
                  >
                    Reset
                  </button>
                  <button
                    className="btn btnMain btnMainPopup"
                    type="button"
                    onPointerDown={() => {
                      handleApply()
                      handleClose()
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

interface CategoryCheckboxProps {
  inputValue: string
  category: Category | string
  path: string[]
  handleSingleSelection: (category: string, isSelected: boolean) => void
  handleCombinationSelection: (path: string[], isSelected: boolean) => void
  selectedSingles: string[]
  selectedCombinations: string[]
  indentLevel?: number
  handleRemove?: (path: string[]) => void
}

const CategoryCheckbox: React.FC<CategoryCheckboxProps> = ({
  inputValue,
  category,
  path,
  handleSingleSelection,
  handleCombinationSelection,
  selectedSingles,
  selectedCombinations,
  indentLevel = 0,
  handleRemove
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const linkedHierarchy = searchParams.get('h')
  const name = typeof category === 'string' ? category : category.name
  const hierarchy = path.join(' > ').toLowerCase()
  const isMatching = hierarchy.includes(inputValue.toLowerCase())
  const isLinked =
    linkedHierarchy !== null &&
    hierarchy === linkedHierarchy.replace(/:/g, ' > ')
  const [isSingleChecked, setIsSingleChecked] = useState<boolean>(false)
  const [isCombinationChecked, setIsCombinationChecked] =
    useState<boolean>(false)
  const [isIndeterminate, setIsIndeterminate] = useState<boolean>(false)

  useEffect(() => {
    const pathString = path.join(':')
    setIsSingleChecked(selectedSingles.includes(name))
    setIsCombinationChecked(selectedCombinations.includes(pathString))
    // Recursive function to gather all descendant paths
    const collectChildPaths = (
      category: string | Category,
      basePath: string[]
    ) => {
      if (!category.sub || !Array.isArray(category.sub)) {
        return []
      }
      let paths: string[] = []
      for (const sub of category.sub) {
        const subPath =
          typeof sub === 'string'
            ? [...basePath, sub].join(':')
            : [...basePath, sub.name].join(':')
        paths.push(subPath)
        if (typeof sub === 'object') {
          paths = paths.concat(collectChildPaths(sub, [...basePath, sub.name]))
        }
      }
      return paths
    }
    const childPaths = collectChildPaths(category, path)
    const anyChildCombinationSelected = childPaths.some((childPath) =>
      selectedCombinations.includes(childPath)
    )
    const anyChildCombinationLinked = childPaths.some(
      (childPath) =>
        linkedHierarchy !== null && linkedHierarchy.includes(childPath)
    )
    setIsIndeterminate(
      (anyChildCombinationSelected || anyChildCombinationLinked) &&
        !selectedCombinations.includes(pathString)
    )
  }, [
    category,
    linkedHierarchy,
    name,
    path,
    selectedCombinations,
    selectedSingles
  ])

  const handleSingleChange = () => {
    setIsSingleChecked(!isSingleChecked)
    handleSingleSelection(name, !isSingleChecked)
  }

  const handleCombinationChange = () => {
    // If combination is linked, clicking it again we will delete it
    if (isLinked) {
      searchParams.delete('h')
      setSearchParams(searchParams)
    } else {
      setIsCombinationChecked(!isCombinationChecked)
      handleCombinationSelection(path, !isCombinationChecked)
    }
  }

  return (
    <>
      {isMatching && (
        <div
          className="dropdown-item dropdownMainMenuItem dropdownMainMenuItemCategory dropdownMainMenuItemCategoryAlt"
          style={{
            marginLeft: `${indentLevel * 20}px`,
            width: `calc(100% - ${indentLevel * 20}px)`
          }}
        >
          <div
            className={`inputLabelWrapperMain inputLabelWrapperMainAlt stylized`}
            style={{
              overflow: 'hidden'
            }}
          >
            <input
              id={name}
              type="checkbox"
              ref={(input) => {
                if (input) {
                  input.indeterminate = isIndeterminate
                }
              }}
              className={`CheckboxMain  ${
                isIndeterminate ? 'CheckboxIndeterminate' : ''
              }`}
              checked={isCombinationChecked || isLinked}
              onChange={handleCombinationChange}
            />
            <label
              htmlFor={name}
              className="form-label labelMain labelMainCategory"
            >
              {capitalizeEachWord(name)}
            </label>
            <input
              style={{
                display: 'none'
              }}
              id={name}
              type="checkbox"
              className="CheckboxMain"
              name={name}
              checked={isSingleChecked}
              onChange={handleSingleChange}
            />
            {typeof handleRemove === 'function' && (
              <button
                className="btn btnMain btnMainInsideField btnMainRemove"
                title="Remove"
                type="button"
                onClick={() => handleRemove(path)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M323.3 32.01H188.7C172.3 32.01 160 44.31 160 60.73V96.01H32C14.33 96.01 0 110.3 0 128S14.33 160 32 160H480c17.67 0 32-14.33 32-32.01S497.7 96.01 480 96.01H352v-35.28C352 44.31 339.7 32.01 323.3 32.01zM64.9 477.5C66.5 492.3 79.31 504 94.72 504H417.3c15.41 0 28.22-11.72 29.81-26.5L480 192.2H32L64.9 477.5z"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      {typeof category !== 'string' &&
        category.sub &&
        Array.isArray(category.sub) && (
          <>
            {category.sub.map((subCategory) => {
              if (typeof subCategory === 'string') {
                return (
                  <CategoryCheckbox
                    inputValue={inputValue}
                    key={`${category.name}-${subCategory}`}
                    category={{ name: subCategory }}
                    path={[...path, subCategory]}
                    handleSingleSelection={handleSingleSelection}
                    handleCombinationSelection={handleCombinationSelection}
                    selectedSingles={selectedSingles}
                    selectedCombinations={selectedCombinations}
                    indentLevel={indentLevel + 1}
                    handleRemove={handleRemove}
                  />
                )
              } else {
                return (
                  <CategoryCheckbox
                    inputValue={inputValue}
                    key={subCategory.name}
                    category={subCategory}
                    path={[...path, subCategory.name]}
                    handleSingleSelection={handleSingleSelection}
                    handleCombinationSelection={handleCombinationSelection}
                    selectedSingles={selectedSingles}
                    selectedCombinations={selectedCombinations}
                    indentLevel={indentLevel + 1}
                    handleRemove={handleRemove}
                  />
                )
              }
            })}
          </>
        )}
    </>
  )
}
