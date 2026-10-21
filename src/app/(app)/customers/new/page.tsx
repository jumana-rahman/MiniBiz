"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Button, Field, PageIntro } from "@/components/ui"

export default function CustomerFormPage() {
  const router = useRouter()
  const { notify } = useShell()
  const [submitted, setSubmitted] = useState(false)

  const go = (screen: Screen) => router.push(routes[screen])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    notify("Customer saved successfully.")
    setTimeout(() => router.push(routes.customers), 650)
  }

  return (
    <div className="page narrow-page">
      <button className="back-link" onClick={() => go("customers")}>
        <Icon name="arrow" />
        Back to customers
      </button>
      <PageIntro
        title="Add a new customer"
        text="Create a customer profile for invoicing and record keeping."
      />
      <form onSubmit={submit}>
        <section className="card form-card">
          <div className="form-section-title">
            <h3>Customer information</h3>
            <p>Basic contact and business details.</p>
          </div>
          <div className="form-grid">
            <Field
              label="Contact name"
              error={submitted ? "Please enter a contact name." : undefined}
            >
              <input placeholder="e.g. Jordan Lee" />
            </Field>
            <Field label="Company name">
              <input placeholder="e.g. Northstar Coffee Ltd." />
            </Field>
            <Field label="Email address">
              <input type="email" placeholder="name@company.com" />
            </Field>
            <Field label="Phone number">
              <input placeholder="+1 (555) 000-0000" />
            </Field>
            <Field label="Tax ID" hint="Optional">
              <input placeholder="e.g. US-1234567" />
            </Field>
          </div>
        </section>
        <section className="card form-card">
          <div className="form-section-title">
            <h3>Billing address</h3>
            <p>Shown on invoices issued to this customer.</p>
          </div>
          <div className="form-grid">
            <Field label="Street address">
              <input placeholder="Street and number" />
            </Field>
            <Field label="City">
              <input placeholder="City" />
            </Field>
            <Field label="State / Region">
              <input placeholder="State or region" />
            </Field>
            <Field label="Postal code">
              <input placeholder="Postal code" />
            </Field>
            <Field label="Country">
              <select defaultValue="United States">
                <option>United States</option>
                <option>Canada</option>
                <option>United Kingdom</option>
              </select>
            </Field>
          </div>
        </section>
        <div className="form-actions">
          <Button kind="secondary" onClick={() => go("customers")}>
            Cancel
          </Button>
          <Button type="submit">Save customer</Button>
        </div>
      </form>
    </div>
  )
}
