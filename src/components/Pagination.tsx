import React, { useCallback, useMemo } from 'react'

type PaginationProps = {
  page: number
  disabledNext: boolean
  handlePrev: () => void
  handleNext: () => void
}

export const Pagination = React.memo(
  ({ page, disabledNext, handlePrev, handleNext }: PaginationProps) => {
    return (
      <div className='IBMSecMain'>
        <div className='PaginationMain'>
          <div className='PaginationMainInside'>
            <button
              className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
              onClick={handlePrev}
              disabled={page === 1}
            >
              <i className='fas fa-chevron-left'></i>
            </button>
            <div className='PaginationMainInsideBoxGroup'>
              <button className='PaginationMainInsideBox PMIBActive'>
                <p>{page}</p>
              </button>
            </div>
            <button
              className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
              onClick={handleNext}
              disabled={disabledNext}
            >
              <i className='fas fa-chevron-right'></i>
            </button>
          </div>
        </div>
      </div>
    )
  }
)

type PaginationWithPageNumbersProps = {
  currentPage: number
  totalPages: number
  handlePageChange: (page: number) => void
}

export const PaginationWithPageNumbers = ({
  currentPage,
  totalPages,
  handlePageChange
}: PaginationWithPageNumbersProps) => {
  // Function to render the pagination controls with page numbers
  const renderPagination = () => {
    const pagesToShow = 5 // Number of page numbers to show around the current page
    const pageNumbers: (number | string)[] = [] // Array to store page numbers and ellipses

    // Case when the total number of pages is less than or equal to the limit
    if (totalPages <= pagesToShow + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i) // Add all pages to the pagination
      }
    } else {
      // Add the first page (always visible)
      pageNumbers.push(1)

      // Calculate the range of pages to show around the current page
      const startPage = Math.max(2, currentPage - Math.floor(pagesToShow / 2))
      const endPage = Math.min(
        totalPages - 1,
        currentPage + Math.floor(pagesToShow / 2)
      )

      // Add ellipsis if there are pages between the first page and the startPage
      if (startPage > 2) pageNumbers.push('...')

      // Add the pages around the current page
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }

      // Add ellipsis if there are pages between the endPage and the last page
      if (endPage < totalPages - 1) pageNumbers.push('...')

      // Add the last page (always visible)
      pageNumbers.push(totalPages)
    }

    // Map over the array and render each page number or ellipsis
    return pageNumbers.map((page, index) => {
      if (typeof page === 'number') {
        // For actual page numbers, render clickable boxes
        return (
          <div
            key={index}
            className={`PaginationMainInsideBox ${
              currentPage === page ? 'PMIBActive' : '' // Highlight the current page
            }`}
            onClick={() => handlePageChange(page)} // Navigate to the selected page
          >
            <p>{page}</p>
          </div>
        )
      } else {
        // For ellipses, render non-clickable dots
        return (
          <p key={index} className='PaginationMainInsideBox PMIBDots'>
            ...
          </p>
        )
      }
    })
  }

  return (
    <div className='IBMSecMain'>
      <div className='PaginationMain'>
        <div className='PaginationMainInside'>
          <div
            className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <i className='fas fa-chevron-left'></i>
          </div>
          <div className='PaginationMainInsideBoxGroup'>
            {renderPagination()}
          </div>
          <div
            className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <i className='fas fa-chevron-right'></i>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PaginationOffsetProps {
  total: number
  limit: number
  offset: number
  hasMore: boolean
  onPageChange: (newOffset: number) => void
}

export const PaginationOffset: React.FC<PaginationOffsetProps> = ({
  total,
  limit,
  offset,
  hasMore,
  onPageChange
}) => {
  // Calculate current page and total pages
  const currentPage = useMemo(
    () => Math.floor(offset / limit) + 1,
    [offset, limit]
  )
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  )

  // Handle page change by converting page number to offset
  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1) return // Don't go below page 1

      // Check if going to the next page is allowed:
      // - Allow if there are more pages (hasMore is true)
      // - Or if the requested page doesn't exceed current offset + limit
      if (page > currentPage && !hasMore) return

      const newOffset = (page - 1) * limit
      onPageChange(Math.max(0, newOffset))
    },
    [limit, currentPage, hasMore, onPageChange]
  )

  // Function to render the pagination controls with page numbers
  const renderPagination = useCallback(() => {
    const pagesToShow = 5 // Number of page numbers to show around the current page
    const pageNumbers: (number | string)[] = [] // Array to store page numbers and ellipses

    // Case when the total number of pages is less than or equal to the pagesToShow + 2
    // (first page + last page + pagesToShow in between)
    if (totalPages <= pagesToShow + 2) {
      // Show all pages if there are fewer than or equal to pagesToShow + 2
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Always show the first page
      pageNumbers.push(1)

      // Calculate the range of pages to show around the current page
      const startPage = Math.max(2, currentPage - Math.floor(pagesToShow / 2))
      const endPage = Math.min(totalPages - 1, startPage + pagesToShow - 1)

      // Add ellipsis if there's a gap between the first page and the starting page
      if (startPage > 2) {
        pageNumbers.push('...')
      }

      // Add the pages around the current page
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }

      // Add ellipsis if there's a gap between the ending page and the last page
      if (endPage < totalPages - 1) {
        pageNumbers.push('...')
      }

      // Always show the last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages)
      }
    }

    // Map page numbers and ellipses to UI elements
    return pageNumbers.map((page, index) => {
      if (typeof page === 'number') {
        // Render clickable page number
        return (
          <button
            key={`page-${index}-${page}`}
            className={`PaginationMainInsideBox ${
              currentPage === page ? 'PMIBActive' : ''
            }`}
            onClick={() => handlePageChange(page)}
            aria-label={`Go to page ${page}`}
            disabled={page > currentPage && !hasMore}
          >
            <p>{page}</p>
          </button>
        )
      } else {
        // Render ellipsis (non-clickable)
        return (
          <div
            key={`ellipsis-${index}`}
            className='PaginationMainInsideBox PMIBDots'
          >
            <p>...</p>
          </div>
        )
      }
    })
  }, [totalPages, currentPage, handlePageChange, hasMore])

  // Don't show pagination if there's only one page and no more items
  if (totalPages === 1 && !hasMore) {
    return null
  }

  return (
    <div className='IBMSecMain'>
      <div className='PaginationMain'>
        <div className='PaginationMainInside'>
          {/* Previous page button */}
          <button
            className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label='Previous page'
          >
            <i className='fas fa-chevron-left'></i>
          </button>

          {/* Page numbers */}
          <div className='PaginationMainInsideBoxGroup'>
            {renderPagination()}
          </div>

          {/* Next page button */}
          <button
            className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasMore}
            aria-label='Next page'
          >
            <i className='fas fa-chevron-right'></i>
          </button>
        </div>
      </div>
    </div>
  )
}
