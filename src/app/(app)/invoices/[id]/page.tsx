"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Lock, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react"
import { ErrorBanner } from "@/components/error-banner"
import { useShell } from "@/components/shell"
import {
  Badge,
  BrandMark,
  Button,
  EmptyState,
  Field,
  Modal,
  PageIntro,
} from "@/components/ui"
import { routes } from "@/lib/routes"
import { toCents, fromCents, lineTotalCents } from "@/lib/money"

type InvoiceItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

type Invoice = {
  id: string
  invoiceNumber: string
  status: string
  invoiceDate: string
  issuedAt: string | null
  subtotal: number
  tax: number
  discount: number
  total: number
  currency: string
  notes: string | null
  customer: {
    id: string
    name: string
    email: string
    address: string | null
  } | null
  invoiceItems: InvoiceItem[]
}

type EditableItem = { description: string; quantity: string; unitPrice: string }

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { notify, companyId, companyName, readOnly, role } = useShell()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<EditableItem[]>([])
  const [notes, setNotes] = useState("")
  const [tax, setTax] = useState("0")
  const [discount, setDiscount] = useState("0")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [issueModal, setIssueModal] = useState(false)

  const id = params?.id as string
  const locked = invoice?.status === "ISSUED"

  const load = useCallback(() => {
    if (!companyId || !id) return
    setLoading(true)
    fetch(`/api/invoices/${id}?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (d?.invoice) {
          setInvoice(d.invoice)
          setItems(
            d.invoice.invoiceItems.map((i: InvoiceItem) => ({
              description: i.description,
              quantity: String(i.quantity),
              unitPrice: String(i.unitPrice),
            })),
          )
          setNotes(d.invoice.notes ?? "")
          setTax(String(d.invoice.tax ?? 0))
          setDiscount(String(d.invoice.discount ?? 0))
        } else {
          setNotFound(true)
        }
        setLoading(false)
      })
  }, [companyId, id])

  useEffect(() => {
    load()
  }, [load])

  const money = (amount: number, currency = "USD") =>
    (amount ?? 0).toLocaleString("en-US", {
      style: "currency",
      currency: currency || "USD",
    })

  const previewSubtotal = items.reduce((sum, item) => {
    const qty = Number.parseFloat(item.quantity) || 0
    const price = Number.parseFloat(item.unitPrice) || 0
    if (qty <= 0 || price < 0) return sum
    return sum + lineTotalCents(qty, toCents(price))
  }, 0)
  const previewTotal =
    previewSubtotal +
    toCents(Number.parseFloat(tax) || 0) -
    toCents(Number.parseFloat(discount) || 0)

  const save = async () => {
    if (!invoice || !companyId) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(
        `/api/invoices/${invoice.id}?companyId=${companyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            notes,
            tax: Number.parseFloat(tax) || 0,
            discount: Number.parseFloat(discount) || 0,
            items: items.map((item) => ({
              description: item.description.trim(),
              quantity: Number.parseFloat(item.quantity) || 0,
              unitPrice: Number.parseFloat(item.unitPrice) || 0,
            })),
          }),
        },
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? "Failed to update invoice.")
        setSaving(false)
        return
      }
      setInvoice(data.invoice)
      setEditing(false)
      setSaving(false)
      notify("Invoice updated.")
    } catch {
      setError("Network error. Please try again.")
      setSaving(false)
    }
  }

  const issue = async () => {
    if (!invoice || !companyId) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(
        `/api/invoices/${invoice.id}?companyId=${companyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, status: "ISSUED" }),
        },
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? "Failed to issue invoice.")
        setIssueModal(false)
        setSaving(false)
        return
      }
      setInvoice(data.invoice)
      setIssueModal(false)
      setSaving(false)
      notify("Invoice issued and locked.")
    } catch {
      setError("Network error. Please try again.")
      setIssueModal(false)
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!invoice || !companyId) return
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}?`)) return
    const res = await fetch(
      `/api/invoices/${invoice.id}?companyId=${companyId}`,
      {
        method: "DELETE",
      },
    )
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      notify(data?.error ?? "Failed to delete invoice.")
      return
    }
    notify("Invoice deleted.")
    router.push(routes.invoices)
  }

  if (loading) {
    return (
      <div className="page">
        <EmptyState
          title="Loading invoice..."
          text="Fetching invoice details."
        />
      </div>
    )
  }

  if (notFound || !invoice) {
    return (
      <div className="page">
        <EmptyState
          title="Invoice not found"
          text="This invoice does not exist in your workspace."
          action={
            <Button onClick={() => router.push(routes.invoices)}>
              Back to invoices
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page">
      <button
        className="back-link"
        type="button"
        onClick={() => router.push(routes.invoices)}
      >
        <ChevronLeft />
        Back to invoices
      </button>
      <PageIntro
        eyebrow={
          locked
            ? `Issued ${new Date(invoice.issuedAt ?? invoice.invoiceDate).toLocaleDateString()}`
            : "Draft"
        }
        title={`Invoice ${invoice.invoiceNumber}`}
        text={`Invoice date ${new Date(invoice.invoiceDate).toLocaleDateString()}`}
        actions={
          <>
            {!locked && !readOnly && !editing && (
              <Button
                kind="secondary"
                icon={Pencil}
                onClick={() => setEditing(true)}
              >
                Edit draft
              </Button>
            )}
            {!locked && !readOnly && !editing && (
              <Button onClick={() => setIssueModal(true)}>Issue invoice</Button>
            )}
            {!locked && !readOnly && (role === "OWNER" || role === "STAFF") && (
              <Button kind="danger" icon={Trash2} onClick={remove}>
                Delete
              </Button>
            )}
          </>
        }
      />
      {error && (
        <ErrorBanner title="Action failed">{error}</ErrorBanner>
      )}
      {locked ? (
        <div className="locked-banner">
          <Lock />
          <div>
            <strong>This invoice is issued and locked</strong>
            <span>
              Issued invoices are read-only to preserve financial records.
            </span>
          </div>
          <Badge tone="green">Issued</Badge>
        </div>
      ) : (
        <div className="locked-banner">
          <Pencil />
          <div>
            <strong>This invoice is a draft</strong>
            <span>It can still be edited until it is issued.</span>
          </div>
          <Badge tone="amber">Draft</Badge>
        </div>
      )}

      {editing ? (
        <div className="invoice-form-layout">
          <div>
            <section className="card form-card">
              <div className="form-section-title">
                <h3>Line items</h3>
                <p>Update the products or services included in this invoice.</p>
              </div>
              <div className="item-head">
                <span>Description</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
                <span />
              </div>
              {items.map((item, index) => (
                <div className="item-row" key={index}>
                  <input
                    value={item.description}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index
                            ? { ...it, description: e.target.value }
                            : it,
                        ),
                      )
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={item.quantity}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index
                            ? { ...it, quantity: e.target.value }
                            : it,
                        ),
                      )
                    }
                  />
                  <div className="money-input">
                    <span>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === index
                              ? { ...it, unitPrice: e.target.value }
                              : it,
                          ),
                        )
                      }
                    />
                  </div>
                  <strong>
                    {money(
                      fromCents(
                        lineTotalCents(
                          Number.parseFloat(item.quantity) || 0,
                          toCents(Number.parseFloat(item.unitPrice) || 0),
                        ),
                      ),
                    )}
                  </strong>
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2  size={16} />
                  </button>
                </div>
              ))}
              <Button
                kind="secondary"
                icon={Plus}
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { description: "", quantity: "1", unitPrice: "" },
                  ])
                }
              >
                Add line item
              </Button>
            </section>
            <section className="card form-card">
              <div className="form-grid">
                <Field label="Tax">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                  />
                </Field>
                <Field label="Discount">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Notes">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </section>
            <div className="form-actions">
              <Button kind="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
          <aside className="card total-preview">
            <span className="eyebrow">Total preview</span>
            <h3>Invoice summary</h3>
            <div>
              <span>Subtotal</span>
              <strong>{money(fromCents(previewSubtotal))}</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>{money(Number.parseFloat(tax) || 0)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>-{money(Number.parseFloat(discount) || 0)}</strong>
            </div>
            <div className="preview-total">
              <span>Total due</span>
              <strong>{money(fromCents(previewTotal))}</strong>
            </div>
            <small>Totals are recalculated on the server when you save.</small>
          </aside>
        </div>
      ) : (
        <section className="card invoice-paper">
          <div className="invoice-brand">
            <BrandMark label="MiniBiz" />
            <div className="invoice-heading">
              <span>INVOICE</span>
              <strong>#{invoice.invoiceNumber}</strong>
            </div>
          </div>
          <div className="invoice-parties">
            <div>
              <span className="invoice-label">From</span>
              <strong>{companyName ?? "MiniBiz workspace"}</strong>
              <p>
                Issued through MiniBiz
                <br />
                Workspace: {companyName ?? "—"}
              </p>
            </div>
            <div>
              <span className="invoice-label">Bill to</span>
              <strong>{invoice.customer?.name ?? "—"}</strong>
              <p>
                {invoice.customer?.address ?? "No billing address on file"}
                <br />
                {invoice.customer?.email ?? ""}
              </p>
            </div>
            <div>
              <span className="invoice-label">Invoice details</span>
              <p>
                <b>Issue date</b>{" "}
                {new Date(invoice.invoiceDate).toLocaleDateString()}
                <br />
                <b>Currency</b> {invoice.currency}
                <br />
                <b>Status</b> {locked ? "Issued" : "Draft"}
              </p>
            </div>
          </div>
          <div className="invoice-lines">
            <div className="line-head">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Amount</span>
            </div>
            {invoice.invoiceItems.map((item) => (
              <div className="line-row" key={item.id}>
                <span>
                  <strong>{item.description}</strong>
                </span>
                <span>{item.quantity}</span>
                <span>{money(item.unitPrice, invoice.currency)}</span>
                <strong>{money(item.lineTotal, invoice.currency)}</strong>
              </div>
            ))}
          </div>
          <div className="invoice-totals">
            <div>
              <span>Subtotal</span>
              <strong>{money(invoice.subtotal, invoice.currency)}</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>{money(invoice.tax, invoice.currency)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>-{money(invoice.discount, invoice.currency)}</strong>
            </div>
            <div className="total">
              <span>Total due</span>
              <strong>{money(invoice.total, invoice.currency)}</strong>
            </div>
          </div>
          {invoice.notes && (
            <div className="invoice-note">
              <strong>Notes</strong>
              <p>{invoice.notes}</p>
            </div>
          )}
        </section>
      )}

      {issueModal && (
        <Modal
          title="Issue this invoice?"
          icon={TriangleAlert}
          onClose={() => setIssueModal(false)}
        >
          <p>
            Once issued, <strong>{invoice.invoiceNumber}</strong> will be locked
            and can no longer be edited.
          </p>
          <div className="modal-note">
            <Lock />
            <span>
              Total due:{" "}
              <strong>{money(invoice.total, invoice.currency)}</strong>
              <br />
              <small>Bill to {invoice.customer?.name ?? "customer"}</small>
            </span>
          </div>
          <div className="modal-actions">
            <Button kind="secondary" onClick={() => setIssueModal(false)}>
              Keep as draft
            </Button>
            <Button onClick={issue} disabled={saving}>
              {saving ? "Issuing..." : "Issue invoice"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
