"use client"

import { InvoiceTable } from "@/components/invoice-table"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Badge, Button, PageIntro, Stat } from "@/components/ui"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatLimit } from "@/lib/subscription"

type DashboardData = {
  company: { id: string; name: string; slug: string; plan: string }
  role: string
  stats: { customers: number; invoices: number; drafts: number; issued: number; issuedTotal: number }
  usage: { customers: { used: number; limit: number }; invoices: { used: number; limit: number }; seats: { used: number; limit: number } }
}

export default function DashboardPage() {
  const { viewer, companyId } = useShell()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    fetch(`/api/dashboard?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        setData(d)
        setLoading(false)
      })
  }, [companyId])

  const companyName = data?.company?.name || "your business"
  const firstName = (companyName.split(" ")[0] || "there")
  const plan = data?.company?.plan || "TRIAL"
  const issuedTotal = (data?.stats?.issuedTotal ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })

  return (
    <div className="page">
      <PageIntro
        title={`Hello, ${firstName}`}
        text={`Here's what's happening with ${companyName} today.`}
        actions={
          !viewer && data?.role !== "VIEWER" && (
            <Button icon="plus" onClick={() => router.push("/invoices/new")}>
              Create invoice
            </Button>
          )
        }
      />
      <div className="stats-grid">
        <Stat
          label="Total customers"
          value={loading ? "—" : String(data?.stats?.customers ?? 0)}
          note={data?.usage ? `${data.usage.customers.used} / ${formatLimit(data.usage.customers.limit)} used` : ""}
          icon="users"
        />
        <Stat
          label="Draft invoices"
          value={loading ? "—" : String(data?.stats?.drafts ?? 0)}
          note={data?.usage ? `${data.usage.invoices.used} / ${formatLimit(data.usage.invoices.limit)} used` : ""}
          icon="file"
        />
        <Stat
          label="Issued value"
          value={loading ? "—" : issuedTotal}
          note={`${data?.stats?.issued ?? 0} issued invoices`}
          icon="trend"
          positive={(data?.stats?.issued ?? 0) > 0}
        />
        <Stat
          label="Current plan"
          value={plan}
          note="Multi-tenant workspace"
          icon="card"
        />
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="card-heading">
            <div>
              <h3>Recent invoices</h3>
              <p>Latest invoices for {companyName}</p>
            </div>
            <Button kind="ghost" onClick={() => router.push("/invoices")}>
              View all
            </Button>
          </div>
          <InvoiceTable data={[]} />
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h3>Workspace summary</h3>
              <p>Plan usage at a glance</p>
            </div>
          </div>
          <div className="activity-list">
            <article className="activity-item">
              <span className="activity-dot" />
              <div>
                <strong>Customers</strong>
                <p>
                  {data?.usage ? `${data.usage.customers.used} / ${formatLimit(data.usage.customers.limit)}` : "—"}
                </p>
              </div>
            </article>
            <article className="activity-item">
              <span className="activity-dot" />
              <div>
                <strong>Invoices</strong>
                <p>
                  {data?.usage ? `${data.usage.invoices.used} / ${formatLimit(data.usage.invoices.limit)}` : "—"}
                </p>
              </div>
            </article>
            <article className="activity-item">
              <span className="activity-dot" />
              <div>
                <strong>Team seats</strong>
                <p>
                  {data?.usage ? `${data.usage.seats.used} / ${formatLimit(data.usage.seats.limit)}` : "—"}
                </p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}
