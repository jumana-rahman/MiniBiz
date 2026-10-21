"use client"

import { useCallback, useEffect, useState } from "react"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Modal,
  PageIntro,
} from "@/components/ui"

type Member = {
  membershipId: string
  userId: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

const roleLabel: Record<string, string> = {
  OWNER: "Owner",
  STAFF: "Staff",
  VIEWER: "Viewer",
}

export default function TeamPage() {
  const { notify, companyId, viewer, role } = useShell()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("STAFF")
  const [inviteError, setInviteError] = useState("")
  const [inviting, setInviting] = useState(false)

  const isOwner = role === "OWNER"
  const canManage = isOwner && !viewer

  const load = useCallback(() => {
    if (!companyId) return
    setLoading(true)
    fetch(`/api/team?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        setMembers(d?.members ?? [])
        setLoading(false)
      })
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  const invite = async () => {
    if (!companyId) return
    setInviteError("")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setInviteError("Enter a valid email address.")
      return
    }
    setInviting(true)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          email: email.trim(),
          role: inviteRole,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setInviteError(data?.error ?? "Failed to add member.")
        setInviting(false)
        return
      }
      setModal(false)
      setEmail("")
      setInviting(false)
      notify("Member added to the workspace.")
      load()
    } catch {
      setInviteError("Network error. Please try again.")
      setInviting(false)
    }
  }

  const changeRole = async (membershipId: string, nextRole: string) => {
    if (!companyId) return
    const res = await fetch(
      `/api/team/${membershipId}?companyId=${companyId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, role: nextRole }),
      },
    )
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      notify(data?.error ?? "Failed to update role.")
      return
    }
    notify("Role updated.")
    load()
  }

  const remove = async (membershipId: string) => {
    if (!companyId) return
    if (!window.confirm("Remove this member from the workspace?")) return
    const res = await fetch(
      `/api/team/${membershipId}?companyId=${companyId}`,
      {
        method: "DELETE",
      },
    )
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      notify(data?.error ?? "Failed to remove member.")
      return
    }
    notify("Member removed.")
    load()
  }

  return (
    <div className="page">
      <PageIntro
        title="Team"
        text="Manage who can access your company workspace."
        actions={
          canManage && (
            <Button icon="plus" onClick={() => setModal(true)}>
              Add member
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
            <p>
              {loading
                ? "Loading members..."
                : `${members.length} member${members.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        {loading ? (
          <EmptyState title="Loading..." text="Fetching workspace members." />
        ) : members.length === 0 ? (
          <EmptyState
            title="No members yet"
            text="Add staff and viewers so they can work in this workspace."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.membershipId}>
                    <td>
                      <div className="person-cell">
                        <Avatar
                          initials={(m.name || m.email)
                            .split(/[\s@]+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join("")}
                          color={m.role === "OWNER" ? "dark" : "sage"}
                        />
                        <span>
                          <strong>{m.name || m.email}</strong>
                          <small>{m.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <select
                        className="table-select"
                        value={m.role}
                        disabled={!canManage || m.role === "OWNER"}
                        onChange={(e) =>
                          changeRole(m.membershipId, e.target.value)
                        }
                      >
                        <option value="OWNER">Owner</option>
                        <option value="STAFF">Staff</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </td>
                    <td>
                      <Badge tone="green">{roleLabel[m.role] ?? m.role}</Badge>
                    </td>
                    <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td>
                      {canManage && m.role !== "OWNER" && (
                        <button
                          className="row-action"
                          aria-label={`Remove ${m.email}`}
                          onClick={() => remove(m.membershipId)}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <Modal
          title="Add team member"
          icon="mail"
          onClose={() => {
            setModal(false)
            setInviteError("")
          }}
        >
          <div className="modal-form">
            {inviteError && (
              <div className="error-banner">
                <Icon name="alert" size={16} />
                <span>
                  <strong>Could not add member</strong>
                  <small>{inviteError}</small>
                </span>
              </div>
            )}
            <Field label="Email address">
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                autoFocus
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Role">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="STAFF">Staff</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <span className="field-hint">
                Staff can manage customers and invoices. The person must already
                have a MiniBiz account.
              </span>
            </Field>
          </div>
          <div className="modal-actions">
            <Button
              kind="secondary"
              onClick={() => {
                setModal(false)
                setInviteError("")
              }}
            >
              Cancel
            </Button>
            <Button onClick={invite} disabled={inviting} icon="mail">
              {inviting ? "Adding..." : "Add member"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
