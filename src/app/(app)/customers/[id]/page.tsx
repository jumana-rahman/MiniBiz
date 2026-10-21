"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Pencil, Plus, Trash2 } from "lucide-react"
import { ErrorBanner } from "@/components/error-banner"
import { useShell } from "@/components/shell"
import { InvoiceTable } from "@/components/invoice-table"
import { Avatar, Button, EmptyState, PageIntro } from "@/components/ui"
import { routes } from "@/lib/routes"

type Customer = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  createdAt: string
}

type Invoice = {
  id: string
  invoiceNumber: string
  customer?: { name?: string } | null
  invoiceDate?: string
  total?: number
  currency?: string
  status: string
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { notify, companyId, viewer, role } = useShell()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const id = params?.id as string
  const readOnly = viewer || role === "VIEWER"

  const load = useCallback(() => {
    if (!companyId || !id) return
    setLoading(true)
    Promise.all([
      fetch(`/api/customers/${id}?companyId=${companyId}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/invoices?companyId=${companyId}&customerId=${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([c, i]) => {
      if (c?.customer) setCustomer(c.customer)
      else setNotFound(true)
      setInvoices(i?.invoices ?? [])
      setLoading(false)
    })
  }, [companyId, id])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!customer || !companyId) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(
        `/api/customers/${customer.id}?companyId=${companyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone ?? "",
            address: customer.address ?? "",
          }),
        },
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? "Failed to update customer.")
        setSaving(false)
        return
      }
      setCustomer(data.customer)
      setEditing(false)
      setSaving(false)
      notify("Customer updated.")
    } catch {
      setError("Network error. Please try again.")
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!customer || !companyId) return
    if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`))
      return
    const res = await fetch(
      `/api/customers/${customer.id}?companyId=${companyId}`,
      {
        method: "DELETE",
      },
    )
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      notify(data?.error ?? "Failed to delete customer.")
      return
    }
    notify("Customer deleted.")
    router.push(routes.customers)
  }

  if (loading) {
    return (
      <div className="page">
        <EmptyState
          title="Loading customer..."
          text="Fetching customer details."
        />
      </div>
    )
  }

  if (notFound || !customer) {
    return (
      <div className="page">
        <EmptyState
          title="Customer not found"
          text="This customer does not exist in your workspace."
          action={
            <Button onClick={() => router.push(routes.customers)}>
              Back to customers
            </Button>
          }
        />
      </div>
    )
  }

  const issued = invoices.filter((i) => i.status === "ISSUED")
  const draft = invoices.filter((i) => i.status === "DRAFT")
  const issuedValue = issued.reduce((sum, i) => sum + (i.total ?? 0), 0)
  const draftValue = draft.reduce((sum, i) => sum + (i.total ?? 0), 0)
  const initials = customer.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="page">
      <button
        className="back-link"
        type="button"
        onClick={() => router.push(routes.customers)}
      >
        <ChevronLeft />
        Back to customers
      </button>
      <PageIntro
        title={customer.name}
        text={`Customer since ${new Date(customer.createdAt).toLocaleDateString()}`}
        actions={
          <>
            {!readOnly && !editing && (
              <Button
                kind="secondary"
                icon={Pencil}
                onClick={() => setEditing(true)}
              >
                Edit customer
              </Button>
            )}
            {!readOnly && !editing && (
              <Button
                icon={Plus}
                onClick={() => router.push(routes.invoiceNew)}
              >
                Create invoice
              </Button>
            )}
          </>
        }
      />
      {error && (
        <ErrorBanner title="Could not save changes">{error}</ErrorBanner>
      )}
      <div className="detail-grid">
        <section className="card detail-card">
          <div className="profile-head">
            <Avatar initials={initials} color="sage" />
            <div>
              <h3>{customer.name}</h3>
              <p>{customer.email}</p>
            </div>
          </div>
          {editing ? (
            <div className="detail-form">
              <label>
                <span>Name</span>
                <input
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer({ ...customer, email: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  value={customer.phone ?? ""}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Billing address</span>
                <textarea
                  rows={3}
                  value={customer.address ?? ""}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                />
              </label>
              <div className="form-actions">
                <Button kind="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="detail-list">
              <div>
                <span>Email</span>
                <strong>{customer.email}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{customer.phone || "—"}</strong>
              </div>
              <div>
                <span>Billing address</span>
                <strong>{customer.address || "—"}</strong>
              </div>
              {role === "OWNER" && !viewer && (
                <div>
                  <span>Danger zone</span>
                  <strong>
                    <Button kind="danger" icon={Trash2} onClick={remove}>
                      Delete customer
                    </Button>
                  </strong>
                </div>
              )}
            </div>
          )}
        </section>
        <div className="detail-main">
          <div className="mini-stats">
            <div className="card">
              <span>Total invoices</span>
              <strong>{invoices.length}</strong>
            </div>
            <div className="card">
              <span>Issued value</span>
              <strong>
                {issuedValue.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </strong>
            </div>
            <div className="card">
              <span>Draft value</span>
              <strong>
                {draftValue.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </strong>
            </div>
          </div>
          <section className="card table-card">
            <div className="card-heading">
              <div>
                <h3>Invoice history</h3>
                <p>All invoices for this customer</p>
              </div>
            </div>
            <InvoiceTable data={invoices} />
          </section>
        </div>
      </div>
    </div>
  )
}
