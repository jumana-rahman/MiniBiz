"use client"

import { useRouter } from "next/navigation"
import { routes, type Screen } from "@/components/data"
import { Icon } from "@/components/icon"
import { Badge, BrandMark, Button, PageIntro } from "@/components/ui"

export default function InvoiceDetailPage() {
  const router = useRouter()

  const go = (screen: Screen) => router.push(routes[screen])

  return (
    <div className="page">
      <button className="back-link" onClick={() => go("invoices")}>
        <Icon name="arrow" />
        Back to invoices
      </button>
      <PageIntro
        eyebrow="Issued May 24, 2025"
        title="Invoice INV-0248"
        text="Payment due June 7, 2025"
        actions={
          <>
            <Button kind="secondary" icon="download">
              Download PDF
            </Button>
            <Button kind="secondary" icon="mail">
              Send again
            </Button>
          </>
        }
      />
      <div className="locked-banner">
        <Icon name="lock" />
        <div>
          <strong>This invoice is issued and locked</strong>
          <span>
            Issued invoices are read-only to preserve financial records.
          </span>
        </div>
        <Badge tone="green">Issued</Badge>
      </div>
      <section className="card invoice-paper">
        <div className="invoice-brand">
          <BrandMark label="MiniBiz" />
          <div className="invoice-heading">
            <span>INVOICE</span>
            <strong>#INV-0248</strong>
          </div>
        </div>
        <div className="invoice-parties">
          <div>
            <span className="invoice-label">From</span>
            <strong>Acme &amp; Bloom LLC</strong>
            <p>
              86 Greenpoint Avenue
              <br />
              Brooklyn, NY 11222
              <br />
              billing@acmebloom.com
            </p>
          </div>
          <div>
            <span className="invoice-label">Bill to</span>
            <strong>Northstar Coffee Ltd.</strong>
            <p>
              218 Mission Street
              <br />
              San Francisco, CA 94105
              <br />
              hello@northstar.co
            </p>
          </div>
          <div>
            <span className="invoice-label">Invoice details</span>
            <p>
              <b>Issue date</b> May 24, 2025
              <br />
              <b>Due date</b> June 7, 2025
              <br />
              <b>Currency</b> USD
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
          <div className="line-row">
            <span>
              <strong>Brand strategy workshop</strong>
              <small>Full-day strategy and positioning session</small>
            </span>
            <span>1</span>
            <span>$2,800.00</span>
            <strong>$2,800.00</strong>
          </div>
          <div className="line-row">
            <span>
              <strong>Visual identity refinement</strong>
              <small>Logo system and brand guidelines updates</small>
            </span>
            <span>8</span>
            <span>$185.00</span>
            <strong>$1,480.00</strong>
          </div>
        </div>
        <div className="invoice-totals">
          <div>
            <span>Subtotal</span>
            <strong>$4,280.00</strong>
          </div>
          <div>
            <span>Tax (0%)</span>
            <strong>$0.00</strong>
          </div>
          <div className="total">
            <span>Total due</span>
            <strong>$4,280.00</strong>
          </div>
        </div>
        <div className="invoice-note">
          <strong>Payment details</strong>
          <p>
            Please pay by bank transfer to the account listed in your service
            agreement. Thank you for your business.
          </p>
        </div>
      </section>
    </div>
  )
}
