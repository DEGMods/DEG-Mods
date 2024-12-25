export interface Category {
  name: string
  sub?: (Category | string)[]
}

export type CategoriesData = Category[]

export interface Categories {
  name: string
  hierarchy: string
  l: string[]
}
