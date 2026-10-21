"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { ErrorBanner } from "@/components/error-banner"
import { useShell } from "@/components/shell"
import { Button, Field, PageIntro } from "@/components/ui"
import { routes } from "@/lib/routes"

type Errors = {
  name?: string
  email?: string
  server?: string
}

export default function CustomerFormPage() {
  const router = useRouter()
  const { notify, companyId, viewer, role } = useShell()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [region, setRegion] = useState("")
  const [postal, setPostal] = useState("")
  const [country, setCountry] = useState("United States")
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  const readOnly = viewer || role === "VIEWER"

  const address = [street, city, region, postal, country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ")

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!companyId) {
      setErrors({ server: "No company workspace is selected." })
      return
    }
    const next: Errors = {}
    if (!name.trim()) next.name = "Please enter a contact name."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Please enter a valid email address."
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          address: address || undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErrors({ server: data?.error ?? "Failed to create customer." })
        setSaving(false)
        return
      }
      notify("Customer created successfully.")
      router.push(routes.customers)
    } catch {
      setErrors({ server: "Network error. Please try again." })
      setSaving(false)
    }
  }

  return (
    <div className="page narrow-page">
      <button
        className="back-link"
        type="button"
        onClick={() => router.push(routes.customers)}
      >
        <ChevronLeft />
        Back to customers
      </button>
      <PageIntro
        title="Add a new customer"
        text="Create a customer profile for invoicing and record keeping."
      />
      <form onSubmit={submit}>
        {errors.server && (
          <ErrorBanner title="Could not create customer">
            {errors.server}
          </ErrorBanner>
        )}
        <section className="card form-card">
          <div className="form-section-title">
            <h3>Customer information</h3>
            <p>Basic contact and business details.</p>
          </div>
          <div className="form-grid">
            <Field label="Contact name" error={errors.name}>
              <input
                placeholder="e.g. Jordan Lee"
                value={name}
                disabled={readOnly}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email address" error={errors.email}>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                disabled={readOnly}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Phone number" hint="Optional">
              <input
                placeholder="+1 (555) 000-0000"
                value={phone}
                disabled={readOnly}
                onChange={(e) => setPhone(e.target.value)}
              />
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
              <input
                placeholder="Street and number"
                value={street}
                disabled={readOnly}
                onChange={(e) => setStreet(e.target.value)}
              />
            </Field>
            <Field label="City">
              <input
                placeholder="City"
                value={city}
                disabled={readOnly}
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>
            <Field label="State / Region">
              <input
                placeholder="State or region"
                value={region}
                disabled={readOnly}
                onChange={(e) => setRegion(e.target.value)}
              />
            </Field>
            <Field label="Postal code">
              <input
                placeholder="Postal code"
                value={postal}
                disabled={readOnly}
                onChange={(e) => setPostal(e.target.value)}
              />
            </Field>
            <Field label="Country">
              <select
                value={country}
                disabled={readOnly}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option>United States</option>
                <option>Canada</option>
                <option>United Kingdom</option>
                <option>Bangladesh</option>
                <option>India</option>
              </select>
            </Field>
          </div>
        </section>
        <div className="form-actions">
          <Button
            kind="secondary"
            onClick={() => router.push(routes.customers)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={readOnly || saving}>
            {saving ? "Saving..." : "Save customer"}
          </Button>
        </div>
      </form>
    </div>
  )
}
