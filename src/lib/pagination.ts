/**
 * Shared pagination helpers for the list endpoints (SRS §9.1).
 * Pages are 1-based; `pageSize` is clamped to a safe range so a hand-crafted
 * request can never ask the database for an unbounded result set.
 */

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export function readPage(searchParams: URLSearchParams): {
  page: number
  pageSize: number
} {
  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10)
  const rawSize = Number.parseInt(
    searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
    10,
  )
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageSize = Number.isFinite(rawSize)
    ? Math.min(Math.max(rawSize, 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE
  return { page, pageSize }
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
