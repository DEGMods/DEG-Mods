import { useEffect, useMemo, useRef, useState } from 'react'
import { useLoaderData, useNavigation, useSearchParams } from 'react-router-dom'
import { useLocalStorage } from 'hooks'
import { BlogCardDetails, NSFWFilter, SortBy } from 'types'
import { SearchInput } from '../../components/SearchInput'
import { BlogCard } from '../../components/BlogCard'
import '../../styles/filters.css'
import '../../styles/pagination.css'
import '../../styles/search.css'
import '../../styles/styles.css'
import { PaginationWithPageNumbers } from 'components/Pagination'
import { normalizeSearchString, scrollIntoView } from 'utils'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { Filter } from 'components/Filters'
import { Dropdown } from 'components/Filters/Dropdown'
import { Option } from 'components/Filters/Option'
import { NsfwFilterOptions } from 'components/Filters/NsfwFilterOptions'

export const BlogsPage = () => {
  const navigation = useNavigation()
  const blogs = useLoaderData() as Partial<BlogCardDetails>[] | undefined
  const filterKey = 'filter-blog-curated'
  const [filterOptions, setFilterOptions] = useLocalStorage(filterKey, {
    sort: SortBy.Latest,
    nsfw: NSFWFilter.Hide_NSFW
  })

  // Search
  const searchTermRef = useRef<HTMLInputElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    // Keep the states synced with the URL
    const q = searchParams.get('q')
    if (searchTermRef.current) searchTermRef.current.value = q ?? ''
    setSearchTerm(q ?? '')
  }, [searchParams])
  const [searchTerm, setSearchTerm] = useState('')
  const handleSearch = () => {
    const value = searchTermRef.current?.value ?? '' // Access the input value from the ref
    setSearchTerm(value)

    if (value) {
      searchParams.set('q', value)
    } else {
      searchParams.delete('q')
    }

    setSearchParams(searchParams, {
      replace: true
    })
  }
  // Reset search automatically when deleting last entry
  const handleChange = () => {
    const value = searchTermRef.current?.value ?? '' // Access the input value from the ref
    if (!value && searchParams.get('q')) {
      searchParams.delete('q')
      setSearchParams(searchParams, {
        replace: true
      })
      handleSearch()
    }
  }
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  // Filter
  const filteredBlogs = useMemo(() => {
    const filterNsfwFn = (blog: Partial<BlogCardDetails>) => {
      switch (filterOptions.nsfw) {
        case NSFWFilter.Hide_NSFW:
          return !blog.nsfw
        case NSFWFilter.Only_NSFW:
          return blog.nsfw
        default:
          return blog
      }
    }

    let filtered = blogs?.filter(filterNsfwFn) || []
    const normalizedSearchTerm = normalizeSearchString(searchTerm)

    if (normalizedSearchTerm !== '') {
      const filterSearchTermFn = (blog: Partial<BlogCardDetails>) =>
        normalizeSearchString(blog.title || '').includes(
          normalizedSearchTerm
        ) ||
        (blog.summary || '').toLowerCase().includes(normalizedSearchTerm) ||
        (blog.content || '').toLowerCase().includes(normalizedSearchTerm) ||
        (blog.tTags || []).findIndex((tag) =>
          tag.toLowerCase().includes(normalizedSearchTerm)
        ) > -1
      filtered = filtered.filter(filterSearchTermFn)
    }

    if (filterOptions.sort === SortBy.Latest) {
      filtered.sort((a, b) =>
        a.published_at && b.published_at ? b.published_at - a.published_at : 0
      )
    } else if (filterOptions.sort === SortBy.Oldest) {
      filtered.sort((a, b) =>
        a.published_at && b.published_at ? a.published_at - b.published_at : 0
      )
    }

    return filtered
  }, [blogs, searchTerm, filterOptions.sort, filterOptions.nsfw])

  // Pagination logic
  const [currentPage, setCurrentPage] = useState(1)
  const scrollTargetRef = useRef<HTMLDivElement>(null)

  const MAX_BLOGS_PER_PAGE = 16
  const totalBlogs = filteredBlogs.length
  const totalPages = Math.ceil(totalBlogs / MAX_BLOGS_PER_PAGE)
  const startIndex = (currentPage - 1) * MAX_BLOGS_PER_PAGE
  const endIndex = startIndex + MAX_BLOGS_PER_PAGE
  const currentMods = filteredBlogs.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      scrollIntoView(scrollTargetRef.current)
      setCurrentPage(page)
    }
  }

  return (
    <div className='InnerBodyMain'>
      {navigation.state !== 'idle' && <LoadingSpinner desc={'Loading'} />}
      <div className='ContainerMain'>
        <div
          className='IBMSecMainGroup IBMSecMainGroupAlt'
          ref={scrollTargetRef}
        >
          <div className='IBMSecMain'>
            <div className='SearchMainWrapper'>
              <div className='IBMSMTitleMain'>
                <h2 className='IBMSMTitleMainHeading'>Blogs</h2>
              </div>
              <SearchInput
                ref={searchTermRef}
                handleKeyDown={handleKeyDown}
                handleSearch={handleSearch}
                handleChange={handleChange}
              />
            </div>
          </div>

          <Filter>
            <Dropdown label={filterOptions.sort}>
              {Object.values(SortBy).map((item, index) => (
                <Option
                  key={`sortByItem-${index}`}
                  onClick={() =>
                    setFilterOptions((prev) => ({
                      ...prev,
                      sort: item
                    }))
                  }
                >
                  {item}
                </Option>
              ))}
            </Dropdown>

            <Dropdown label={filterOptions.nsfw}>
              <NsfwFilterOptions filterKey={filterKey} />
            </Dropdown>
          </Filter>

          <div className='IBMSecMain IBMSMListWrapper'>
            <div className='IBMSMList'>
              {currentMods &&
                currentMods.map((b) => <BlogCard key={b.id} {...b} />)}
            </div>
          </div>

          {totalPages > 1 && (
            <PaginationWithPageNumbers
              currentPage={currentPage}
              totalPages={totalPages}
              handlePageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}
