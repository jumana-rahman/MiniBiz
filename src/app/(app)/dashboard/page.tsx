"use client"

import { InvoiceTable, useGo } from "@/components/invoice-table"
import { invoices } from "@/components/data"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Badge, Button, PageIntro, Stat } from "@/components/ui"

export default function DashboardPage() {
  const go = useGo()
  const { viewer } = useShell()

  return (
    <div className="page">
      <PageIntro
        title="Good morning, Alex"
        text="Here’s what’s happening with Acme & Bloom today."
        actions={
          !viewer && (
            <Button icon="plus" onClick={() => go("invoice-form")}>
              Create invoice
            </Button>
          )
        }
      />
      <div className="stats-grid">
        <Stat
          label="Total customers"
          value="48"
          note="+6 this month"
          icon="users"
          positive
        />
        <Stat
          label="Invoices issued"
          value="124"
          note="+14 this month"
          icon="file"
          positive
        />
        <Stat
          label="Issued value"
          value="$84,620"
          note="+12.4% vs. last month"
          icon="trend"
          positive
        />
        <Stat
          label="Current plan"
          value="Pro"
          note="Renews June 12"
          icon="card"
        />
      </div>
      <div className="dashboard-grid">
        <section className="card chart-card">
          <div className="card-heading">
            <div>
              <h3>Invoice value</h3>
              <p>Issued invoice value over the last 6 months</p>
            </div>
            <select aria-label="Chart period">
              <option>Last 6 months</option>
              <option>Last 12 months</option>
            </select>
          </div>
          <div className="chart-summary">
            <strong>$42,480</strong>
            <Badge tone="green">+18.2%</Badge>
          </div>
          <div className="chart">
            <div className="y-labels">
              <span>$12k</span>
              <span>$8k</span>
              <span>$4k</span>
              <span>$0</span>
            </div>
            <div className="bars">
              {[
                ["Dec", 42],
                ["Jan", 54],
                ["Feb", 47],
                ["Mar", 71],
                ["Apr", 63],
                ["May", 88],
              ].map(([m, h]) => (
                <div className="bar-wrap" key={m}>
                  <div className="bar" style={{ height: `${h}%` }}>
                    <span />
                  </div>
                  <small>{m}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="card activity-card">
          <div className="card-heading">
            <div>
              <h3>Quick overview</h3>
              <p>Invoice status summary</p>
            </div>
          </div>
          <div className="donut-wrap">
            <div className="donut">
              <div>
                <strong>18</strong>
                <span>Total</span>
              </div>
            </div>
          </div>
          <div className="legend">
            <div>
              <span>
                <i className="dot emerald" />
                Issued
              </span>
              <strong>12</strong>
            </div>
            <div>
              <span>
                <i className="dot amber" />
                Draft
              </span>
              <strong>6</strong>
            </div>
          </div>
          <div className="plan-usage">
            <div>
              <span>Plan usage</span>
              <strong>36%</strong>
            </div>
            <div className="progress">
              <span style={{ width: "36%" }} />
            </div>
            <small>18 of 50 monthly invoices</small>
          </div>
        </section>
      </div>
      <section className="card table-card">
        <div className="card-heading">
          <div>
            <h3>Recent invoices</h3>
            <p>Your latest customer invoices</p>
          </div>
          <button className="text-link" onClick={() => go("invoices")}>
            View all <Icon name="chevron" size={14} />
          </button>
        </div>
        <InvoiceTable data={invoices.slice(0, 4)} />
      </section>
    </div>
  )
}
