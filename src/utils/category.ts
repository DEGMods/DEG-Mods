import { Categories, Category } from 'types/category'
import categoriesData from './../assets/categories/categories.json'

export const flattenCategories = (
  categories: (Category | string)[],
  parentPath: string[] = []
): Categories[] => {
  return categories.flatMap<Categories, Category | string>((cat) => {
    if (typeof cat === 'string') {
      const path = [...parentPath, cat]
      const hierarchy = path.join(' > ')
      return [{ name: cat, hierarchy, l: path }]
    } else {
      const path = [...parentPath, cat.name]
      const hierarchy = path.join(' > ')
      if (cat.sub) {
        const obj: Categories = { name: cat.name, hierarchy, l: path }
        return [obj].concat(flattenCategories(cat.sub, path))
      }
      return [{ name: cat.name, hierarchy, l: path }]
    }
  })
}

export const getCategories = () => {
  return flattenCategories(categoriesData)
}

export const addToUserCategories = (
  categories: (string | Category)[],
  input: string
) => {
  const segments = input.split('>').map((s) => s.trim())
  let currentLevel: (string | Category)[] = categories

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i].trim()
    const existingNode = currentLevel.find(
      (item) => typeof item !== 'string' && item.name === segment
    )
    if (!existingNode) {
      const newCategory: Category = { name: segment, sub: [] }
      currentLevel.push(newCategory)
      if (newCategory.sub) {
        currentLevel = newCategory.sub
      }
    } else if (typeof existingNode !== 'string') {
      if (!existingNode.sub) {
        existingNode.sub = []
      }
      currentLevel = existingNode.sub
    }
  }
}

export const deleteFromUserCategories = (
  categories: (string | Category)[],
  input: string
) => {
  const segments = input.split('>').map((s) => s.trim())
  const value = segments.pop()
  if (!value) {
    return
  }

  let currentLevel: (string | Category)[] = categories
  for (let i = 0; i < segments.length; i++) {
    const key = segments[i]
    const existingNode = currentLevel.find(
      (item) => typeof item === 'object' && item.name === key
    ) as Category

    if (existingNode && existingNode.sub) {
      currentLevel = existingNode.sub
    }
  }
  const valueIndex = currentLevel.findIndex(
    (item) =>
      item === value || (typeof item === 'object' && item.name === value)
  )
  if (valueIndex !== -1) {
    currentLevel.splice(valueIndex, 1)
  }
}
