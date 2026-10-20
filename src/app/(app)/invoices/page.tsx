"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { invoices, routes, type Screen } from "@/components/data"
import { Icon } from "@/components/icon"
import { InvoiceTable } from "@/components/invoice-table"
import { useShell } from "@/components/shell"
import { Button, PageIntro } from "@/components/ui"

export default function InvoicesPage() {
  const router = useRouter()
  const { viewer } = useShell()
  const [filter, setFilter] = useState("All")

  const go = (screen: Screen) => router.push(routes[screen])

  const data = invoices.filter(
    (i) => filter === "All" || i.status === filter,
  )

  return (
    <div className="page">
      <PageIntro
        title="Invoices"
        text="Create, issue, and track invoices for your customers."
        actions={
          !viewer && (
            <Button icon="plus" onClick={() => go("invoice-form")}>
              Create invoice
            </Button>
          )
        }
      />
      <section className="card table-card">
        <div className="tabs">
          {["All", "Draft", "Issued"].map((t) => (
            <button
              key={t}
              className={filter === t ? "active" : ""}
              onClick={() => setFilter(t)}
            >
              {t}
              <span>{t === "All" ? 124 : t === "Draft" ? 8 : 116}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <div className="search">
            <Icon name="search" />
            <input placeholder="Search invoice or customer..." />
          </div>
          <div className="toolbar-right">
            <Button kind="secondary" icon="filter">
              Filters
            </Button>
            <Button kind="secondary" icon="download">
              Export
            </Button>
          </div>
        </div>
        <InvoiceTable data={data} />
        <div className="pagination">
          <span>Showing 1–5 of 124 invoices</span>
          <div>
            <Button kind="secondary" disabled>
              Previous
            </Button>
            <Button kind="secondary">Next</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
