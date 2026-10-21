"use client"

import { useCallback, useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { ErrorBanner } from "@/components/error-banner"
import { Check, CreditCard, FileText, Users, UsersRound } from "lucide-react"
import { useShell } from "@/components/shell"
import { Button, Modal, PageIntro } from "@/components/ui"
import { PLAN_CATALOG, formatLimit, planLabel, type PlanKey } from "@/lib/plans"

type Usage = {
  used: number
  limit: number
}

type SubscriptionData = {
  company: { id: string; name: string; plan: string }
  usage: { customers: Usage; invoices: Usage; seats: Usage }
}

export default function SubscriptionPage() {
  const { notify, companyId, readOnly, role } = useShell()
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<PlanKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canChange = role === "OWNER" && !readOnly

  const load = useCallback(() => {
    if (!companyId) return
    setLoading(true)
    fetch(`/api/dashboard?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (d) {
          setData({ company: d.company, usage: d.usage })
        }
        setLoading(false)
      })
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  const currentPlan = (data?.company?.plan ?? "TRIAL") as PlanKey
  const currentMeta = PLAN_CATALOG.find((p) => p.key === currentPlan)

  const changePlan = async () => {
    if (!companyId || !target) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, plan: target }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.error ?? "Failed to change plan.")
        setSaving(false)
        return
      }
      setData({ company: payload.company, usage: payload.usage })
      setTarget(null)
      setSaving(false)
      notify(`Plan changed to ${planLabel(target)}.`)
    } catch {
      setError("Network error. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <PageIntro
        title="Subscription"
        text="Manage your plan, limits, and billing preferences."
      />
      <section className="card current-plan">
        <div>
          <span className="eyebrow">Current plan</span>
          <h3>{loading ? "—" : planLabel(currentPlan)}</h3>
          <p>{currentMeta?.description ?? "Your active workspace plan."}</p>
        </div>
        <div className="plan-price">
          <strong>{currentMeta?.price ?? "$0"}</strong>
          {currentMeta?.price !== "$0" && <span>/ month</span>}
          {canChange && (
            <Button kind="secondary" onClick={() => setTarget(currentPlan)}>
              Manage plan
            </Button>
          )}
        </div>
      </section>
      <section className="usage-section">
        <div className="section-heading">
          <h3>Current usage</h3>
          <p>
            Limits are enforced on the server for every create and update
            operation.
          </p>
        </div>
        <div className="usage-grid">
          <UsageCard
            label="Customers"
            usage={data?.usage.customers}
            icon={Users}
          />
          <UsageCard
            label="Invoices"
            usage={data?.usage.invoices}
            icon={FileText}
          />
          <UsageCard label="Team seats" usage={data?.usage.seats} icon={UsersRound} />
        </div>
      </section>
      <section className="plans-section">
        <div className="section-heading">
          <h3>Available plans</h3>
          <p>Choose a plan that works for your business.</p>
        </div>
        <div className="plans-grid">
          {PLAN_CATALOG.map((plan) => {
            const featured = plan.key === currentPlan
            return (
              <div
                className={`card plan-card ${featured ? "featured" : ""}`}
                key={plan.key}
              >
                {featured && <span className="current-tag">Current plan</span>}
                <h3>{plan.name}</h3>
                <div className="price">
                  <strong>{plan.price}</strong>
                  {plan.price !== "$0" && <span>/ month</span>}
                </div>
                <p>{plan.description}</p>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>
                      <span>
                        <Check  size={14} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  kind={featured ? "secondary" : "primary"}
                  disabled={featured || !canChange}
                  onClick={() => setTarget(plan.key)}
                >
                  {featured
                    ? "Current plan"
                    : canChange
                      ? `Switch to ${plan.name}`
                      : "Owner only"}
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      {target && (
        <Modal
          title="Change subscription plan"
          icon={CreditCard}
          onClose={() => {
            setTarget(null)
            setError("")
          }}
        >
          <p>
            Switch this workspace to the <strong>{planLabel(target)}</strong>{" "}
            plan? The new limits take effect immediately. Downgrading never
            deletes existing records — new operations that exceed the new limits
            are blocked.
          </p>
          {error && (
            <ErrorBanner title="Could not change plan">{error}</ErrorBanner>
          )}
          <div className="modal-note plan-note">
            <span>{planLabel(target)}</span>
            <span>
              <strong>
                {PLAN_CATALOG.find((p) => p.key === target)?.price} / month
              </strong>
              <br />
              <small>
                {PLAN_CATALOG.find((p) => p.key === target)?.features.join(
                  " · ",
                )}
              </small>
            </span>
          </div>
          <div className="modal-actions">
            <Button
              kind="secondary"
              onClick={() => {
                setTarget(null)
                setError("")
              }}
            >
              Cancel
            </Button>
            <Button onClick={changePlan} disabled={saving}>
              {saving ? "Updating..." : "Confirm change"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function UsageCard({
  label,
  usage,
  icon: IconComponent,
}: {
  label: string
  usage?: Usage
  icon: LucideIcon
}) {
  const used = usage?.used ?? 0
  const limit = usage?.limit ?? 0
  const percent =
    limit >= Number.MAX_SAFE_INTEGER / 2
      ? 0
      : Math.min(100, limit === 0 ? 0 : (used / limit) * 100)
  return (
    <div className="card usage-card">
      <div className="usage-head">
        <span className="stat-icon">
          <IconComponent />
        </span>
        <span>{label}</span>
      </div>
      <strong>{used}</strong>
      <small>of {formatLimit(limit)}</small>
      <div className="progress">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
