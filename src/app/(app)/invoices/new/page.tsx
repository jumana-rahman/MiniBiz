"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Button, Field, Modal, PageIntro } from "@/components/ui"

export default function InvoiceFormPage() {
  const router = useRouter()
  const { viewer, notify } = useShell()
  const [items, setItems] = useState(2)
  const [modal, setModal] = useState(false)

  const go = (screen: Screen) => router.push(routes[screen])

  return (
    <div className="page">
      <button className="back-link" onClick={() => go("invoices")}>
        <Icon name="arrow" />
        Back to invoices
      </button>
      <PageIntro
        eyebrow="Draft"
        title="Create invoice"
        text="Prepare an invoice, review the total, then issue it to your customer."
        actions={
          <>
            <Button kind="secondary" onClick={() => go("invoices")}>
              Save draft
            </Button>
            <Button onClick={() => setModal(true)} disabled={viewer}>
              Review & issue
            </Button>
          </>
        }
      />
      <div className="invoice-form-layout">
        <div>
          <section className="card form-card">
            <div className="form-section-title">
              <h3>Invoice details</h3>
              <p>Choose a customer and set the invoice dates.</p>
            </div>
            <div className="form-grid">
              <Field label="Customer">
                <select defaultValue="Northstar Coffee">
                  <option>Northstar Coffee</option>
                  <option>Brightline Studio</option>
                  <option>Harbor &amp; Co.</option>
                </select>
              </Field>
              <Field label="Invoice number">
                <input defaultValue="INV-0249" />
              </Field>
              <Field label="Issue date">
                <input type="date" defaultValue="2025-06-10" />
              </Field>
              <Field label="Payment due">
                <select defaultValue="14 days">
                  <option>Due on receipt</option>
                  <option>14 days</option>
                  <option>30 days</option>
                </select>
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
            {Array.from({ length: items }).map((_, index) => (
              <div className="item-row" key={index}>
                <input
                  defaultValue={
                    index === 0
                      ? "Monthly design retainer"
                      : "Additional design hours"
                  }
                />
                <input type="number" defaultValue={index === 0 ? 1 : 5} />
                <div className="money-input">
                  <span>$</span>
                  <input
                    type="number"
                    defaultValue={index === 0 ? 3200 : 125}
                  />
                </div>
                <strong>{index === 0 ? "$3,200.00" : "$625.00"}</strong>
                <button onClick={() => items > 1 && setItems(items - 1)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
            <Button
              kind="secondary"
              icon="plus"
              onClick={() => setItems(items + 1)}
            >
              Add line item
            </Button>
          </section>
          <section className="card form-card">
            <Field label="Notes">
              <textarea
                rows={3}
                placeholder="Add payment terms or a note for your customer..."
              />
            </Field>
          </section>
        </div>
        <aside className="card total-preview">
          <span className="eyebrow">Total preview</span>
          <h3>Invoice summary</h3>
          <div>
            <span>Subtotal</span>
            <strong>$3,825.00</strong>
          </div>
          <div>
            <span>Tax</span>
            <button>+ Add tax</button>
          </div>
          <div className="preview-total">
            <span>Total due</span>
            <strong>$3,825.00</strong>
          </div>
          <small>Amounts shown in USD</small>
          <hr />
          <div className="customer-preview">
            <span>Billing to</span>
            <strong>Northstar Coffee Ltd.</strong>
            <p>
              hello@northstar.co
              <br />
              218 Mission Street
              <br />
              San Francisco, CA 94105
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
            Once issued, <strong>INV-0249</strong> will be locked and can no
            longer be edited. A copy will be sent to Northstar Coffee.
          </p>
          <div className="modal-note">
            <Icon name="lock" />
            <span>
              Total due: <strong>$3,937.50</strong>
              <br />
              <small>Payment due June 24, 2025</small>
            </span>
          </div>
          <div className="modal-actions">
            <Button kind="secondary" onClick={() => setModal(false)}>
              Keep as draft
            </Button>
            <Button
              onClick={() => {
                setModal(false)
                notify("Invoice issued and sent successfully.")
                go("invoice-detail")
              }}
            >
              Issue invoice
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
