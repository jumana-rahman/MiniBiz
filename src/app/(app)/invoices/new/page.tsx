"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Lock, Plus, Trash2, TriangleAlert } from "lucide-react"
import { ErrorBanner } from "@/components/error-banner"
import { CustomerPicker, type CustomerOption } from "@/components/customer-picker"
import { useShell } from "@/components/shell"
import { Button, Field, Modal, PageIntro } from "@/components/ui"
import { routes } from "@/lib/routes"
import { toCents, fromCents, lineTotalCents } from "@/lib/money"

type Customer = CustomerOption
type LineItem = { description: string; quantity: string; unitPrice: string }

const emptyItem = (): LineItem => ({
  description: "",
  quantity: "1",
  unitPrice: "",
})

export default function InvoiceFormPage() {
  const router = useRouter()
  const { notify, companyId, readOnly } = useShell()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [notes, setNotes] = useState("")
  const [tax, setTax] = useState("")
  const [discount, setDiscount] = useState("")
  const [items, setItems] = useState<LineItem[]>([emptyItem()])
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    fetch(`/api/customers?companyId=${companyId}&pageSize=8`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => {
        if (cancelled) return
        const list: Customer[] = d?.customers ?? []
        setCustomer(list[0] ?? null)
      })
      .catch(() => {
        if (!cancelled) setCustomer(null)
      })
    return () => {
      cancelled = true
    }
  }, [companyId])

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

  const taxCents = toCents(Number.parseFloat(tax) || 0)
  const discountCents = toCents(Number.parseFloat(discount) || 0)
  const totalCents = subtotalCents + taxCents - discountCents

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    )
  }

  const buildPayload = () => ({
    companyId,
    customerId: customer?.id ?? "",
    invoiceNumber: invoiceNumber.trim(),
    invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
    notes: notes.trim() || undefined,
    tax: Number.parseFloat(tax) || 0,
    discount: Number.parseFloat(discount) || 0,
    items: items.map((item) => ({
      description: item.description.trim(),
      quantity: Number.parseFloat(item.quantity) || 0,
      unitPrice: Number.parseFloat(item.unitPrice) || 0,
    })),
  })

  const validate = (): string | null => {
    if (!companyId) return "No company workspace is selected."
    if (!customer) return "Select a customer."
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
    const taxValue = Number.parseFloat(tax)
    const discountValue = Number.parseFloat(discount)
    if (tax && (!Number.isFinite(taxValue) || taxValue < 0))
      return "Tax cannot be negative."
    if (discount && (!Number.isFinite(discountValue) || discountValue < 0))
      return "Discount cannot be negative."
    if (discountCents > subtotalCents + taxCents)
      return "The discount is larger than the invoice total."
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
        router.push(routes.invoiceDetail(data.invoice.id))
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
        <ChevronLeft />
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
        <ErrorBanner title="Could not save invoice">{error}</ErrorBanner>
      )}
      <div className="invoice-form-layout">
        <div>
          <section className="card form-card">
            <div className="form-section-title">
              <h3>Invoice details</h3>
              <p>Choose a customer and set the invoice date.</p>
            </div>
            <div className="form-grid">
              <Field label="Customer" hint="Type to search this workspace.">
                <CustomerPicker
                  companyId={companyId}
                  value={customer}
                  onChange={setCustomer}
                  disabled={readOnly}
                />
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
              <Field label="Tax" hint="Added to the subtotal.">
                <div className="money-input">
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={tax}
                    disabled={readOnly}
                    onChange={(e) => setTax(e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Discount" hint="Subtracted from the subtotal.">
                <div className="money-input">
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={discount}
                    disabled={readOnly}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
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
                  <Trash2  size={16} />
                </button>
              </div>
            ))}
            <Button
              kind="secondary"
              icon={Plus}
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
            <strong>{money(taxCents)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>-{money(discountCents)}</strong>
          </div>
          <div className="preview-total">
            <span>Total due</span>
            <strong>{money(totalCents)}</strong>
          </div>
          <small>
            Totals are recalculated on the server when the invoice is saved.
          </small>
          <hr />
          <div className="customer-preview">
            <span>Billing to</span>
            <strong>{customer?.name ?? "—"}</strong>
            <p>
              {customer?.email ?? ""}
              <br />
              {customer?.address ?? "No billing address on file"}
            </p>
          </div>
        </aside>
      </div>

      {modal && (
        <Modal
          title="Issue this invoice?"
          icon={TriangleAlert}
          onClose={() => setModal(false)}
        >
          <p>
            Once issued, <strong>{invoiceNumber || "this invoice"}</strong> will
            be locked and can no longer be edited.
          </p>
          <div className="modal-note">
            <Lock />
            <span>
              Total due: <strong>{money(totalCents)}</strong>
              <br />
              <small>
                Issued to {customer?.name ?? "the selected customer"}
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
