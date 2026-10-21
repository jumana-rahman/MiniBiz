"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

export type PaginationState = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * Shared pager for the list screens (SRS §9.1). The pages are server-paged,
 * so the component only reports the requested page back to its owner.
 */
export function Pagination({
  state,
  onPage,
  label = "records",
  unit = "customer",
}: {
  state: PaginationState
  onPage: (page: number) => void
  label?: string
  unit?: string
}) {
  const { page, pageSize, total, totalPages } = state
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="pagination">
      <span>
        {total === 0
          ? `No ${label} to show`
          : `Showing ${from}–${to} of ${total} ${label}`}
      </span>
      <div>
        <button
          className="button secondary"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
          Previous
        </button>
        <span className="pagination-status">
          Page {page} of {totalPages}
        </span>
        <button
          className="button secondary"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
