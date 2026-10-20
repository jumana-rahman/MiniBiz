"use client"

import { useState } from "react"
import { Icon, type IconName } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Button, Modal, PageIntro } from "@/components/ui"

export default function SubscriptionPage() {
  const { notify } = useShell()
  const [modal, setModal] = useState(false)

  return (
    <div className="page">
      <PageIntro
        title="Subscription"
        text="Manage your plan, limits, and billing preferences."
      />
      <section className="card current-plan">
        <div>
          <span className="eyebrow">Current plan</span>
          <h3>Pro</h3>
          <p>For growing teams with higher invoicing needs.</p>
        </div>
        <div className="plan-price">
          <strong>$49</strong>
          <span>/ month</span>
          <Button kind="secondary" onClick={() => setModal(true)}>
            Manage plan
          </Button>
        </div>
      </section>
      <section className="usage-section">
        <div className="section-heading">
          <h3>Current usage</h3>
          <p>Your usage resets on June 1, 2025.</p>
        </div>
        <div className="usage-grid">
          <Usage
            label="Customers"
            value="48"
            limit="Unlimited"
            percent={14}
            icon="users"
          />
          <Usage
            label="Monthly invoices"
            value="18"
            limit="250"
            percent={7}
            icon="file"
          />
          <Usage
            label="Team members"
            value="4"
            limit="10"
            percent={40}
            icon="team"
          />
        </div>
      </section>
      <section className="plans-section">
        <div className="section-heading">
          <h3>Available plans</h3>
          <p>Choose a plan that works for your business.</p>
        </div>
        <div className="plans-grid">
          <Plan
            name="Trial"
            price="$0"
            description="Explore the essentials for 14 days."
            features={["5 customers", "5 invoices total", "1 team member"]}
            button="Start trial"
          />
          <Plan
            name="Basic"
            price="$19"
            description="For freelancers and small businesses."
            features={["50 customers", "50 invoices / month", "3 team members"]}
            button="Switch to Basic"
          />
          <Plan
            name="Pro"
            price="$49"
            description="For established, growing teams."
            features={[
              "Unlimited customers",
              "250 invoices / month",
              "10 team members",
            ]}
            button="Current plan"
            featured
          />
        </div>
      </section>

      {modal && (
        <Modal
          title="Change subscription plan"
          icon="card"
          onClose={() => setModal(false)}
        >
          <p>
            Switch this workspace to the <strong>Pro plan</strong>? The new
            limits and billing will take effect immediately.
          </p>
          <div className="modal-note plan-note">
            <span>Pro</span>
            <span>
              <strong>$49 / month</strong>
              <br />
              <small>Unlimited customers · 250 invoices / month</small>
            </span>
          </div>
          <div className="modal-actions">
            <Button kind="secondary" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModal(false)
                notify("Subscription plan updated.")
              }}
            >
              Confirm change
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Usage({
  label,
  value,
  limit,
  percent,
  icon,
}: {
  label: string
  value: string
  limit: string
  percent: number
  icon: IconName
}) {
  return (
    <div className="card usage-card">
      <div className="usage-head">
        <span className="stat-icon">
          <Icon name={icon} />
        </span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>of {limit}</small>
      <div className="progress">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function Plan({
  name,
  price,
  description,
  features,
  button,
  featured,
}: {
  name: string
  price: string
  description: string
  features: string[]
  button: string
  featured?: boolean
}) {
  return (
    <div className={`card plan-card ${featured ? "featured" : ""}`}>
      {featured && <span className="current-tag">Current plan</span>}
      <h3>{name}</h3>
      <div className="price">
        <strong>{price}</strong>
        {price !== "$0" && <span>/ month</span>}
      </div>
      <p>{description}</p>
      <ul>
        {features.map((f) => (
          <li key={f}>
            <span>
              <Icon name="check" size={14} />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <Button kind={featured ? "secondary" : "primary"} disabled={featured}>
        {button}
      </Button>
    </div>
  )
}
