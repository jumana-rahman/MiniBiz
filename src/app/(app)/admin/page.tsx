"use client"

import { useState } from "react"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import {
  Avatar,
  Badge,
  Button,
  Modal,
  PageIntro,
  Stat,
} from "@/components/ui"

const companies = [
  [
    "AB",
    "Acme & Bloom",
    "alex@acmebloom.com",
    "Pro",
    "48",
    "18 / 250",
    "Active",
  ],
  [
    "NC",
    "Northstar Coffee",
    "maya@northstar.co",
    "Basic",
    "34",
    "42 / 50",
    "Active",
  ],
  [
    "BL",
    "Brightline Studio",
    "hello@brightline.design",
    "Trial",
    "4",
    "3 / 5",
    "Trial",
  ],
  [
    "FW",
    "Fieldwork Labs",
    "admin@fieldworklabs.io",
    "Pro",
    "126",
    "86 / 250",
    "Active",
  ],
  [
    "HC",
    "Harbor & Co.",
    "ops@harborco.com",
    "Basic",
    "49",
    "50 / 50",
    "Limit reached",
  ],
]

export default function AdminPage() {
  const { notify } = useShell()
  const [modal, setModal] = useState(false)

  return (
    <div className="page admin-page">
      <div className="admin-banner">
        <div>
          <span className="admin-mark">
            <Icon name="building" />
          </span>
          <div>
            <span className="eyebrow">Platform console</span>
            <h2>Super Admin</h2>
          </div>
        </div>
        <Badge tone="blue">Separate workspace</Badge>
      </div>
      <PageIntro
        title="Company overview"
        text="Monitor company accounts, subscription plans, and platform usage."
      />
      <div className="stats-grid admin-stats">
        <Stat
          label="Total companies"
          value="286"
          note="+18 this month"
          icon="building"
          positive
        />
        <Stat
          label="Active trials"
          value="34"
          note="12 expire this week"
          icon="trend"
        />
        <Stat
          label="Monthly revenue"
          value="$9,842"
          note="+8.2% vs. last month"
          icon="card"
          positive
        />
        <Stat
          label="Limit warnings"
          value="7"
          note="Require attention"
          icon="alert"
        />
      </div>
      <section className="card table-card">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" />
            <input placeholder="Search company or owner..." />
          </div>
          <Button kind="secondary" icon="filter">
            All plans
          </Button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Customers</th>
                <th>Invoice usage</th>
                <th>Status</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr key={c[1]}>
                  <td>
                    <div className="person-cell">
                      <Avatar initials={c[0]} color={i % 2 ? "blue" : "sage"} />
                      <span>
                        <strong>{c[1]}</strong>
                        <small>{c[2]}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge
                      tone={
                        c[3] === "Pro"
                          ? "green"
                          : c[3] === "Trial"
                            ? "blue"
                            : "neutral"
                      }
                    >
                      {c[3]}
                    </Badge>
                  </td>
                  <td>{c[4]}</td>
                  <td>
                    <div className="usage-cell">
                      <strong>{c[5]}</strong>
                      <div className="progress">
                        <span
                          className={
                            c[6] === "Limit reached" ? "danger-progress" : ""
                          }
                          style={{
                            width: `${Math.min(100, (parseInt(c[5].split(" / ")[0]) / parseInt(c[5].split(" / ")[1])) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge tone={c[6] === "Limit reached" ? "amber" : "green"}>
                      {c[6]}
                    </Badge>
                  </td>
                  <td>May {20 - i}, 2025</td>
                  <td>
                    <Button kind="ghost" onClick={() => setModal(true)}>
                      Change plan
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>Showing 1–5 of 286 companies</span>
          <div>
            <Button kind="secondary" disabled>
              Previous
            </Button>
            <Button kind="secondary">Next</Button>
          </div>
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
