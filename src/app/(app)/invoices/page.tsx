"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { ErrorBanner } from "@/components/error-banner"
import { InvoiceTable } from "@/components/invoice-table"
import { useShell } from "@/components/shell"
import { Button, EmptyState, PageIntro } from "@/components/ui"
import { Pagination, type PaginationState } from "@/components/pagination"
import { routes } from "@/lib/routes"

type InvoiceRow = {
  id: string
  invoiceNumber: string
  customer?: { name?: string } | null
  invoiceDate?: string
  total?: number
  currency?: string
  status: string
}

const tabs = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "ISSUED", label: "Issued" },
] as const

const emptyPagination: PaginationState = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
}

export default function InvoicesPage() {
  const router = useRouter()
  const { companyId, readOnly } = useShell()
  const [filter, setFilter] = useState<typeof tabs[number]["key"]>("ALL")
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [pagination, setPagination] = useState(emptyPagination)
  const [counts, setCounts] = useState({ ALL: 0, DRAFT: 0, ISSUED: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    const params = new URLSearchParams({ companyId, page: String(page) })
    if (filter !== "ALL") params.set("status", filter)
    fetch(`/api/invoices?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        if (data?.invoices) setInvoices(data.invoices)
        if (data?.pagination) setPagination(data.pagination)
        if (data?.counts) setCounts(data.counts)
        setError("")
        setLoading(false)
      })
      .catch(() => {
        setError("Could not load invoices. Please try again.")
        setLoading(false)
      })
  }, [companyId, page, filter])

  const switchTab = (key: typeof tabs[number]["key"]) => {
    setFilter(key)
    setPage(1)
  }

  return (
    <div className="page">
      <PageIntro
        title="Invoices"
        text="Create, issue, and track invoices for your customers."
        actions={
          !readOnly && (
            <Button icon={Plus} onClick={() => router.push(routes.invoiceNew)}>
              Create invoice
            </Button>
          )
        }
      />
      {error && (
        <ErrorBanner title="Could not load invoices">{error}</ErrorBanner>
      )}
      <section className="card table-card">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={filter === tab.key ? "active" : ""}
              onClick={() => switchTab(tab.key)}
            >
              {tab.label}
              <span>{counts[tab.key]}</span>
            </button>
          ))}
        </div>
        {loading ? (
          <EmptyState title="Loading..." text="Fetching invoices." />
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            text="Create your first invoice to start tracking revenue."
            action={
              !readOnly && (
                <Button
                  icon={Plus}
                  onClick={() => router.push(routes.invoiceNew)}
                >
                  Create invoice
                </Button>
              )
            }
          />
        ) : (
          <InvoiceTable data={invoices} />
        )}
        <Pagination state={pagination} onPage={setPage} label="invoices" />
      </section>
    </div>
  )
}
