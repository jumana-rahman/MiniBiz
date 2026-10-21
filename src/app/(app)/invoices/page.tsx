"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { InvoiceTable } from "@/components/invoice-table"
import { useShell } from "@/components/shell"
import { Button, EmptyState, PageIntro } from "@/components/ui"
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

export default function InvoicesPage() {
  const router = useRouter()
  const { viewer, companyId } = useShell()
  const [filter, setFilter] = useState<typeof tabs[number]["key"]>("ALL")
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    fetch(`/api/invoices?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (data?.invoices) setInvoices(data.invoices)
        setLoading(false)
      })
  }, [companyId])

  const data = invoices.filter((i) => filter === "ALL" || i.status === filter)

  return (
    <div className="page">
      <PageIntro
        title="Invoices"
        text="Create, issue, and track invoices for your customers."
        actions={
          !viewer && (
            <Button icon="plus" onClick={() => router.push(routes.invoiceNew)}>
              Create invoice
            </Button>
          )
        }
      />
      <section className="card table-card">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={filter === tab.key ? "active" : ""}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span>
                {tab.key === "ALL"
                  ? invoices.length
                  : invoices.filter((i) => i.status === tab.key).length}
              </span>
            </button>
          ))}
        </div>
        {loading ? (
          <EmptyState title="Loading..." text="Fetching invoices." />
        ) : (
          <InvoiceTable data={data} />
        )}
        <div className="pagination">
          <span>
            Showing {data.length} of {invoices.length} invoices
          </span>
        </div>
      </section>
    </div>
  )
}
