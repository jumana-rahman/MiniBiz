"use client"

import { useRouter } from "next/navigation"
import { invoices, routes, type Screen } from "@/components/data"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { InvoiceTable } from "@/components/invoice-table"
import { Avatar, Button, PageIntro } from "@/components/ui"

export default function CustomerDetailPage() {
  const router = useRouter()
  const { viewer } = useShell()

  const go = (screen: Screen) => router.push(routes[screen])

  return (
    <div className="page">
      <button className="back-link" onClick={() => go("customers")}>
        <Icon name="arrow" />
        Back to customers
      </button>
      <PageIntro
        title="Northstar Coffee"
        text="Customer since January 12, 2024"
        actions={
          <>
            {!viewer && (
              <Button
                kind="secondary"
                icon="edit"
                onClick={() => go("customer-form")}
              >
                Edit customer
              </Button>
            )}
            {!viewer && (
              <Button icon="plus" onClick={() => go("invoice-form")}>
                Create invoice
              </Button>
            )}
          </>
        }
      />
      <div className="detail-grid">
        <section className="card detail-card">
          <div className="profile-head">
            <Avatar initials="NC" color="sage" />
            <div>
              <h3>Northstar Coffee</h3>
              <p>Northstar Coffee Ltd.</p>
            </div>
          </div>
          <div className="detail-list">
            <div>
              <span>Email</span>
              <strong>hello@northstar.co</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>+1 (415) 555-0142</strong>
            </div>
            <div>
              <span>Tax ID</span>
              <strong>US-8291048</strong>
            </div>
            <div>
              <span>Billing address</span>
              <strong>
                218 Mission Street
                <br />
                San Francisco, CA 94105
              </strong>
            </div>
          </div>
        </section>
        <div className="detail-main">
          <div className="mini-stats">
            <div className="card">
              <span>Total invoices</span>
              <strong>8</strong>
            </div>
            <div className="card">
              <span>Issued value</span>
              <strong>$18,620</strong>
            </div>
            <div className="card">
              <span>Open balance</span>
              <strong>$4,280</strong>
            </div>
          </div>
          <section className="card table-card">
            <div className="card-heading">
              <div>
                <h3>Invoice history</h3>
                <p>All invoices for this customer</p>
              </div>
            </div>
            <InvoiceTable data={invoices.slice(0, 3)} />
          </section>
        </div>
      </div>
    </div>
  )
}
