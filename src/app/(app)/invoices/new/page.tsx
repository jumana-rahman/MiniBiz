"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Button, Field, Modal, PageIntro } from "@/components/ui"
import { routes } from "@/lib/routes"
import { toCents, fromCents, lineTotalCents } from "@/lib/money"

type Customer = { id: string; name: string; email: string; address: string | null }
type LineItem = { description: string; quantity: string; unitPrice: string }

const emptyItem = (): LineItem => ({
  description: "",
  quantity: "1",
  unitPrice: "",
})

export default function InvoiceFormPage() {
  const router = useRouter()
  const { notify, companyId, viewer, role } = useShell()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<LineItem[]>([emptyItem()])
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const readOnly = viewer || role === "VIEWER"

  useEffect(() => {
    if (!companyId) return
    fetch(`/api/customers?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        const list: Customer[] = d?.customers ?? []
        setCustomers(list)
        if (list.length > 0) setCustomerId(list[0].id)
      })
  }, [companyId])

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const subtotalCents = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = Number.parseFloat(item.quantity) || 0
        const price = Number.parseFloat(item.unitPrice) || 0
        if (qty <= 0 || price < 0) return sum
        return sum + lineTotalCents(qty, toCents(price))
      }, 0),
    [items],
  )

  const money = (cents: number) =>
    fromCents(cents).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    })

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    )
  }

  const buildPayload = () => ({
    companyId,
    customerId,
    invoiceNumber: invoiceNumber.trim(),
    invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
    notes: notes.trim() || undefined,
    items: items.map((item) => ({
      description: item.description.trim(),
      quantity: Number.parseFloat(item.quantity) || 0,
      unitPrice: Number.parseFloat(item.unitPrice) || 0,
    })),
  })

  const validate = (): string | null => {
    if (!companyId) return "No company workspace is selected."
    if (!customerId) return "Select a customer."
    if (!invoiceNumber.trim()) return "Invoice number is required."
    if (items.length === 0) return "Add at least one line item."
    for (const item of items) {
      if (!item.description.trim())
        return "Every line item needs a description."
      const qty = Number.parseFloat(item.quantity)
      const price = Number.parseFloat(item.unitPrice)
      if (!Number.isFinite(qty) || qty <= 0)
        return "Quantities must be greater than zero."
      if (!Number.isFinite(price) || price < 0)
        return "Unit prices cannot be negative."
    }
    return null
  }

  const save = async (issue: boolean) => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      setModal(false)
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? "Failed to create invoice.")
        setModal(false)
        setSaving(false)
        return
      }

      if (issue) {
        const issueRes = await fetch(
          `/api/invoices/${data.invoice.id}?companyId=${companyId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, status: "ISSUED" }),
          },
        )
        const issueData = await issueRes.json().catch(() => null)
        if (!issueRes.ok) {
          setError(issueData?.error ?? "Failed to issue invoice.")
          setModal(false)
          setSaving(false)
          return
        }
        notify("Invoice issued and locked.")
        router.push(`/invoices/${data.invoice.id}`)
        return
      }

      notify("Draft invoice saved.")
      router.push(routes.invoices)
    } catch {
      setError("Network error. Please try again.")
      setModal(false)
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <button
        className="back-link"
        type="button"
        onClick={() => router.push(routes.invoices)}
      >
        <Icon name="arrow" />
        Back to invoices
      </button>
      <PageIntro
        eyebrow="Draft"
        title="Create invoice"
        text="Prepare an invoice, review the total, then issue it to your customer."
        actions={
          <>
            <Button
              kind="secondary"
              onClick={() => save(false)}
              disabled={readOnly || saving}
            >
              Save draft
            </Button>
            <Button
              onClick={() => setModal(true)}
              disabled={readOnly || saving}
            >
              Review &amp; issue
            </Button>
          </>
        }
      />
      {error && (
        <div className="error-banner">
          <Icon name="alert" size={16} />
          <span>
            <strong>Could not save invoice</strong>
            <small>{error}</small>
          </span>
        </div>
      )}
      <div className="invoice-form-layout">
        <div>
          <section className="card form-card">
            <div className="form-section-title">
              <h3>Invoice details</h3>
              <p>Choose a customer and set the invoice date.</p>
            </div>
            <div className="form-grid">
              <Field label="Customer">
                <select
                  value={customerId}
                  disabled={readOnly}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  {customers.length === 0 && (
                    <option value="">No customers yet</option>
                  )}
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Invoice number">
                <input
                  placeholder="INV-0001"
                  value={invoiceNumber}
                  disabled={readOnly}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </Field>
              <Field label="Issue date">
                <input
                  type="date"
                  value={invoiceDate}
                  disabled={readOnly}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </Field>
            </div>
          </section>
          <section className="card form-card line-items-card">
            <div className="form-section-title">
              <h3>Line items</h3>
              <p>Add the products or services included in this invoice.</p>
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
                  placeholder="Description"
                  value={item.description}
                  disabled={readOnly}
                  onChange={(e) =>
                    updateItem(index, { description: e.target.value })
                  }
                />
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={item.quantity}
                  disabled={readOnly}
                  onChange={(e) =>
                    updateItem(index, { quantity: e.target.value })
                  }
                />
                <div className="money-input">
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateItem(index, { unitPrice: e.target.value })
                    }
                  />
                </div>
                <strong>
                  {money(
                    lineTotalCents(
                      Number.parseFloat(item.quantity) || 0,
                      toCents(Number.parseFloat(item.unitPrice) || 0),
                    ),
                  )}
                </strong>
                <button
                  type="button"
                  disabled={readOnly || items.length === 1}
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
            <Button
              kind="secondary"
              icon="plus"
              disabled={readOnly}
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
            >
              Add line item
            </Button>
          </section>
          <section className="card form-card">
            <Field label="Notes">
              <textarea
                rows={3}
                placeholder="Add payment terms or a note for your customer..."
                value={notes}
                disabled={readOnly}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </section>
        </div>
        <aside className="card total-preview">
          <span className="eyebrow">Total preview</span>
          <h3>Invoice summary</h3>
          <div>
            <span>Subtotal</span>
            <strong>{money(subtotalCents)}</strong>
          </div>
          <div>
            <span>Tax</span>
            <strong>$0.00</strong>
          </div>
          <div className="preview-total">
            <span>Total due</span>
            <strong>{money(subtotalCents)}</strong>
          </div>
          <small>
            Totals are recalculated on the server when the invoice is saved.
          </small>
          <hr />
          <div className="customer-preview">
            <span>Billing to</span>
            <strong>{selectedCustomer?.name ?? "—"}</strong>
            <p>
              {selectedCustomer?.email ?? ""}
              <br />
              {selectedCustomer?.address ?? "No billing address on file"}
            </p>
          </div>
        </aside>
      </div>

      {modal && (
        <Modal
          title="Issue this invoice?"
          icon="alert"
          onClose={() => setModal(false)}
        >
          <p>
            Once issued, <strong>{invoiceNumber || "this invoice"}</strong> will
            be locked and can no longer be edited.
          </p>
          <div className="modal-note">
            <Icon name="lock" />
            <span>
              Total due: <strong>{money(subtotalCents)}</strong>
              <br />
              <small>
                Issued to {selectedCustomer?.name ?? "the selected customer"}
              </small>
            </span>
          </div>
          <div className="modal-actions">
            <Button kind="secondary" onClick={() => setModal(false)}>
              Keep as draft
            </Button>
            <Button onClick={() => save(true)} disabled={saving}>
              {saving ? "Issuing..." : "Issue invoice"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
