"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/icon"
import { InvoiceTable } from "@/components/invoice-table"
import { useShell } from "@/components/shell"
import { Button, PageIntro } from "@/components/ui"

export default function InvoicesPage() {
  const router = useRouter()
  const { viewer, companyId } = useShell()
  const [filter, setFilter] = useState("All")
  const [invoices, setInvoices] = useState<any[]>([])
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

  const data = invoices.filter(
    (i: any) => filter === "All" || i.status === filter,
  )

  return (
    <div className="page">
      <PageIntro
        title="Invoices"
        text="Create, issue, and track invoices for your customers."
        actions={
          !viewer && (
            <Button icon="plus" onClick={() => router.push("/invoices/new")}>
              Create invoice
            </Button>
          )
        }
      />
      <div className="panel">
        <div className="panel-header">
          <div className="tab-group">
            {["All", "Draft", "Issued"].map((tab) => (
              <button
                key={tab}
                className={filter === tab ? "active" : ""}
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
        ) : (
          <InvoiceTable data={data} />
        )}
        <div className="panel-footer">
          <span>
            Showing {data.length} of {invoices.length} invoices
          </span>
        </div>
      </div>
    </div>
  )
}
