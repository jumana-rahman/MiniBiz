"use client"

import { useState } from "react"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Avatar, Badge, Button, Field, Modal, PageIntro } from "@/components/ui"

const members = [
  ["AM", "Alex Morgan", "alex@acmebloom.com", "Owner", "Active", "dark"],
  ["JT", "Jamie Torres", "jamie@acmebloom.com", "Staff", "Active", "blue"],
  ["SK", "Sam Kim", "sam@acmebloom.com", "Viewer", "Active", "purple"],
  ["RP", "Riley Patel", "riley@acmebloom.com", "Staff", "Invited", "amber"],
]

export default function TeamPage() {
  const { viewer, notify } = useShell()
  const [modal, setModal] = useState(false)

  return (
    <div className="page">
      <PageIntro
        title="Team"
        text="Manage who can access your company workspace."
        actions={
          !viewer && (
            <Button icon="plus" onClick={() => setModal(true)}>
              Invite member
            </Button>
          )
        }
      />
      <div className="role-cards">
        <div className="card">
          <Icon name="settings" />
          <div>
            <strong>Owner</strong>
            <span>Full access, billing, and team management</span>
          </div>
        </div>
        <div className="card">
          <Icon name="edit" />
          <div>
            <strong>Staff</strong>
            <span>Can manage customers and invoices</span>
          </div>
        </div>
        <div className="card">
          <Icon name="eye" />
          <div>
            <strong>Viewer</strong>
            <span>Read-only access to workspace data</span>
          </div>
        </div>
      </div>
      <section className="card table-card">
        <div className="card-heading">
          <div>
            <h3>Workspace members</h3>
            <p>4 members · 1 invitation pending</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m[2]}>
                  <td>
                    <div className="person-cell">
                      <Avatar initials={m[0]} color={m[5]} />
                      <span>
                        <strong>{m[1]}</strong>
                        <small>{m[2]}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <select
                      className="table-select"
                      defaultValue={m[3]}
                      disabled={viewer || m[3] === "Owner"}
                    >
                      <option>Owner</option>
                      <option>Staff</option>
                      <option>Viewer</option>
                    </select>
                  </td>
                  <td>
                    <Badge tone={m[4] === "Active" ? "green" : "amber"}>
                      {m[4]}
                    </Badge>
                  </td>
                  <td>{m[4] === "Active" ? "Today" : "—"}</td>
                  <td>
                    <button className="row-action" disabled={viewer}>
                      <Icon name="more" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <Modal
          title="Invite team member"
          icon="mail"
          onClose={() => setModal(false)}
        >
          <div className="modal-form">
            <Field label="Email address">
              <input type="email" placeholder="name@company.com" autoFocus />
            </Field>
            <Field label="Role">
              <select defaultValue="Staff">
                <option>Staff</option>
                <option>Viewer</option>
                <option>Owner</option>
              </select>
              <span className="field-hint">
                Staff can manage customers and invoices.
              </span>
            </Field>
          </div>
          <div className="modal-actions">
            <Button kind="secondary" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModal(false)
                notify("Invitation sent successfully.")
              }}
              icon="mail"
            >
              Send invitation
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
