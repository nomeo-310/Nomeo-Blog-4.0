'use client'

import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight02Icon, ArrowLeft02Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void 
  maxVisiblePages?: number
  showPageNumbers?: boolean
  className?: string
  variant?: 'primary' | 'secondary' // New variant prop
}

interface PaginationWithInfoProps extends Omit<PaginationProps, 'onPageChange'> {
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void 
  showInfo?: boolean
}

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  maxVisiblePages = 5, 
  showPageNumbers = true, 
  className,
  variant = 'primary' // Default to primary
}: PaginationProps) => {
  if (totalPages <= 1) return null

  // Get variant styles based on your theme
  const getVariantStyles = (isActive: boolean) => {
    if (!isActive) {
      return 'hover:bg-accent hover:text-accent-foreground text-card-foreground'
    }
    
    if (variant === 'secondary') {
      return 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
    }
    
    // Default primary variant
    return 'bg-primary text-primary-foreground hover:bg-primary/90'
  }

  // Calculate visible page range
  const getVisiblePages = (): number[] => {
    const halfVisible = Math.floor(maxVisiblePages / 2)
    let startPage = Math.max(1, currentPage - halfVisible)
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    const pages: number[] = []
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
  }

  const visiblePages = getVisiblePages()

  // Create button click handler
  const handlePageClick = (page: number) => {
    onPageChange(page)
  }

  // Common button styles using your theme variables
  const buttonBaseStyles = cn(
    'p-2 rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  )

  const pageButtonBaseStyles = cn(
    'min-w-[2.5rem] h-10 px-3 rounded-lg font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
  )

  return (
    <nav 
      className={cn('flex items-center justify-center space-x-1', className)}
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <button
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          buttonBaseStyles,
          'hover:bg-accent hover:text-accent-foreground',
          'text-muted-foreground'
        )}
        aria-label="Go to previous page"
      >
        <HugeiconsIcon icon={ArrowLeft02Icon} className="w-4 h-4" />
      </button>

      {/* First Page */}
      {showPageNumbers && visiblePages[0] > 1 && (
        <>
          <button
            onClick={() => handlePageClick(1)}
            className={cn(
              pageButtonBaseStyles,
              currentPage === 1
                ? getVariantStyles(true)
                : getVariantStyles(false)
            )}
          >
            1
          </button>
          {visiblePages[0] > 2 && (
            <span className="px-2">
              <HugeiconsIcon 
                icon={MoreHorizontalIcon} 
                className="w-4 h-4 text-muted-foreground" 
              />
            </span>
          )}
        </>
      )}

      {/* Visible Page Numbers */}
      {showPageNumbers && visiblePages.map((page: number) => (
        <button
          key={page}
          onClick={() => handlePageClick(page)}
          className={cn(
            pageButtonBaseStyles,
            currentPage === page
              ? getVariantStyles(true)
              : getVariantStyles(false)
          )}
          aria-current={currentPage === page ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      {/* Last Page */}
      {showPageNumbers && visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span className="px-2">
              <HugeiconsIcon 
                icon={MoreHorizontalIcon} 
                className="w-4 h-4 text-muted-foreground" 
              />
            </span>
          )}
          <button
            onClick={() => handlePageClick(totalPages)}
            className={cn(
              pageButtonBaseStyles,
              currentPage === totalPages
                ? getVariantStyles(true)
                : getVariantStyles(false)
            )}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next Button */}
      <button
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          buttonBaseStyles,
          'hover:bg-accent hover:text-accent-foreground',
          'text-muted-foreground'
        )}
        aria-label="Go to next page"
      >
        <HugeiconsIcon icon={ArrowRight02Icon} className="w-4 h-4" />
      </button>
    </nav>
  )
}

export const PaginationWithInfo = ({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  showInfo = true,
  variant = 'primary',
  ...props 
}: PaginationWithInfoProps) => {
  const startItem = totalItems === 0 ? 0 : Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {showInfo && totalItems > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-card-foreground">{startItem}-{endItem}</span> of{' '}
          <span className="font-semibold text-card-foreground">{totalItems.toLocaleString()}</span> items
        </div>
      )}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        variant={variant}
        {...props}
      />
    </div>
  )
}

export default Pagination