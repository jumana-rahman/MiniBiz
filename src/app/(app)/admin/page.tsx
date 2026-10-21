"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, CreditCard, Search, TrendingUp, TriangleAlert } from "lucide-react"
import { ErrorBanner } from "@/components/error-banner"
import { useShell } from "@/components/shell"
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Modal,
  PageIntro,
  Stat,
} from "@/components/ui"
import {
  Pagination,
  type PaginationState,
} from "@/components/pagination"
import { PLAN_CATALOG, formatLimit, type PlanKey } from "@/lib/plans"

const PAGE_SIZE = 20

type AdminCompany = {
  id: string
  name: string
  slug: string
  plan: string
  createdAt: string
  ownerName: string
  ownerEmail: string
  memberCount: number
  customersUsed: number
  customersLimit: number
  invoicesUsed: number
  invoicesLimit: number
  atLimit: boolean
  status: string
}

type AdminStats = {
  totalCompanies: number
  trialCompanies: number
  payingCompanies: number
  limitWarnings: number
  totalCustomers: number
  totalInvoices: number
}

export default function AdminPage() {
  const { notify } = useShell()
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<AdminCompany | null>(null)
  const [nextPlan, setNextPlan] = useState<PlanKey>("BASIC")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [restricted, setRestricted] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin")
      .then(async (r) => {
        if (r.status === 403) throw new Error("FORBIDDEN")
        if (!r.ok) throw new Error("LOAD_FAILED")
        return r.json()
      })
      .then((d) => {
        if (d) {
          setCompanies(d.companies ?? [])
          if (d.stats) setStats(d.stats)
        }
        setError("")
        setLoading(false)
      })
      .catch((err) => {
        if (err instanceof Error && err.message === "FORBIDDEN") {
          setRestricted(true)
        } else {
          setError("Could not load the platform console. Please try again.")
        }
        setCompanies([])
        setStats(null)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return companies.filter((c) => {
      const matchesPlan = planFilter === "ALL" || c.plan === planFilter
      if (!matchesPlan) return false
      if (!q) return true
      return `${c.name} ${c.ownerName} ${c.ownerEmail}`
        .toLowerCase()
        .includes(q)
    })
  }, [companies, search, planFilter])

  const pagination = useMemo<PaginationState>(() => {
    const total = filtered.length
    return {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    }
  }, [filtered.length, page])

  const visible = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

  useEffect(() => {
    setPage(1)
  }, [search, planFilter])

  const openChange = (company: AdminCompany) => {
    setTarget(company)
    setNextPlan(company.plan as PlanKey ?? "BASIC")
    setError("")
  }

  const changePlan = async () => {
    if (!target) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: target.id, plan: nextPlan }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? "Failed to change plan.")
        setSaving(false)
        return
      }
      setTarget(null)
      setSaving(false)
      notify("Subscription plan updated.")
      load()
    } catch {
      setError("Network error. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div className="page admin-page">
      <div className="admin-banner">
        <div>
          <span className="admin-mark">
            <Building2 />
          </span>
          <div>
            <span className="eyebrow">Platform console</span>
            <h2>Super Admin</h2>
          </div>
        </div>
        <Badge tone="blue">Separate workspace</Badge>
      </div>
      {restricted ? (
        <section className="card">
          <EmptyState
            title="Super Admin access required"
            text="This area is reserved for platform administrators. Your account does not have platform-level privileges, and the console data is not available to you."
          />
        </section>
      ) : (
        <>
          <PageIntro
            title="Company overview"
            text="Monitor company accounts, subscription plans, and platform usage."
          />
          {error && (
            <ErrorBanner title="Could not load the console">
              {error}
            </ErrorBanner>
          )}
      <div className="stats-grid admin-stats">
        <Stat
          label="Total companies"
          value={String(stats?.totalCompanies ?? 0)}
          note={`${stats?.payingCompanies ?? 0} on a paid plan`}
          icon={Building2}
        />
        <Stat
          label="Active trials"
          value={String(stats?.trialCompanies ?? 0)}
          note="Companies on the Trial plan"
          icon={TrendingUp}
        />
        <Stat
          label="Platform usage"
          value={String(stats?.totalInvoices ?? 0)}
          note={`${stats?.totalCustomers ?? 0} customers across all companies`}
          icon={CreditCard}
        />
        <Stat
          label="Limit warnings"
          value={String(stats?.limitWarnings ?? 0)}
          note="Require attention"
          icon={TriangleAlert}
        />
      </div>
      <section className="card table-card">
        <div className="toolbar">
          <div className="search">
            <Search />
            <input
              placeholder="Search company or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="table-select"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="ALL">All plans</option>
            {PLAN_CATALOG.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <EmptyState
            title="Loading..."
            text="Fetching registered companies."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No companies found"
            text="Adjust the search or plan filter to see more results."
          />
        ) : (
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
                {visible.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      <div className="person-cell">
                        <Avatar
                          initials={(c.name.slice(0, 2) || "CO").toUpperCase()}
                          color={i % 2 ? "blue" : "sage"}
                        />
                        <span>
                          <strong>{c.name}</strong>
                          <small>{c.ownerEmail}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge
                        tone={
                          c.plan === "PRO"
                            ? "green"
                            : c.plan === "TRIAL"
                              ? "blue"
                              : "neutral"
                        }
                      >
                        {c.plan}
                      </Badge>
                    </td>
                    <td>
                      {c.customersUsed} / {formatLimit(c.customersLimit)}
                    </td>
                    <td>
                      <div className="usage-cell">
                        <strong>
                          {c.invoicesUsed} / {formatLimit(c.invoicesLimit)}
                        </strong>
                        <div className="progress">
                          <span
                            className={c.atLimit ? "danger-progress" : ""}
                            style={{
                              width: `${
                                c.invoicesLimit >= Number.MAX_SAFE_INTEGER / 2
                                  ? 4
                                  : Math.min(
                                      100,
                                      c.invoicesLimit === 0
                                        ? 0
                                        : (c.invoicesUsed / c.invoicesLimit) *
                                            100,
                                    )
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={c.atLimit ? "amber" : "green"}>
                        {c.atLimit
                          ? "Limit reached"
                          : c.status === "TRIAL"
                            ? "Trial"
                            : "Active"}
                      </Badge>
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Button kind="ghost" onClick={() => openChange(c)}>
                        Change plan
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          state={pagination}
          onPage={setPage}
          label="companies"
        />
      </section>
        </>
      )}

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
            Switch <strong>{target.name}</strong> to the{" "}
            <strong>
              {PLAN_CATALOG.find((p) => p.key === nextPlan)?.name}
            </strong>{" "}
            plan? The new limits take effect immediately for that company.
          </p>
          {error && (
            <ErrorBanner title="Could not change plan">{error}</ErrorBanner>
          )}
          <div className="modal-form">
            <select
              className="table-select"
              value={nextPlan}
              onChange={(e) => setNextPlan(e.target.value as PlanKey)}
            >
              {PLAN_CATALOG.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name} — {p.features.join(", ")}
                </option>
              ))}
            </select>
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
