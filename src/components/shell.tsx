"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { LucideIcon } from "lucide-react"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  LayoutGrid,
  LogOut,
  Menu,
  Users,
  UsersRound,
  X,
  Check,
} from "lucide-react"
import { Avatar, Button, EmptyState } from "./ui"
import { authClient } from "@/lib/auth-client"
import { formatLimit } from "@/lib/plans"
import { routes, type Screen } from "@/lib/routes"

const nav: {
  id: Screen
  label: string
  icon: LucideIcon
  ownerOnly?: boolean
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "customers", label: "Customers", icon: Users },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "team", label: "Team", icon: UsersRound, ownerOnly: true },
  { id: "subscription", label: "Subscription", icon: CreditCard },
]

type ShellContextValue = {
  // Demo-only preview of the Viewer interface. It never changes permissions.
  viewer: boolean
  notify: (message: string) => void
  companyId: string | null
  companyName: string | null
  role: string | null
  // The signed-in user's display name, used for greetings.
  userName: string | null
  // The signed-in user may create and edit records in this workspace.
  canWrite: boolean
  // The current screen must be read-only (Viewer role or preview mode).
  readOnly: boolean
  // A platform administrator without any company membership.
  platformOnly: boolean
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error("useShell must be used inside the app shell")
  return ctx
}

function PlatformNotice() {
  const router = useRouter()
  return (
    <div className="page">
      <EmptyState
        title="Platform administrator"
        text="This account has platform-level access only and is not attached to a company workspace. Company records stay inside each tenant, so you manage plans and usage from the Super Admin console."
        action={
          <Button onClick={() => router.push(routes.admin)}>
            Open the Super Admin console
          </Button>
        }
      />
    </div>
  )
}

function NoWorkspaceNotice() {
  return (
    <div className="page">
      <EmptyState
        title="No company workspace"
        text="Your account is not a member of any company yet, so there is nothing to show here. Ask a company owner for an invitation, or sign up again to start a new company."
      />
    </div>
  )
}

type CompanyInfo = {
  id: string
  name: string
  slug: string
  plan: string
  role: string
}

const roleLabel: Record<string, string> = {
  OWNER: "Owner",
  STAFF: "Staff",
  VIEWER: "Viewer",
}

type UserInfo = {
  id: string
  name: string | null
  email: string
  image: string | null
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [viewer, setViewer] = useState(false)
  const [toast, setToast] = useState("")
  const [user, setUser] = useState<UserInfo | null>(null)
  const [companies, setCompanies] = useState<CompanyInfo[]>([])
  const [activeCompany, setActiveCompany] = useState<CompanyInfo | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [usage, setUsage] = useState<{
    customers: { used: number; limit: number }
    invoices: { used: number; limit: number }
  } | null>(null)

  const loadSession = useCallback(() => {
    fetch("/api/companies")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (data?.user) setUser(data.user)
        setIsPlatformAdmin(Boolean(data?.isPlatformAdmin))
        if (data?.companies?.length) {
          setCompanies(data.companies)
          // The server decides which workspace is active; the browser never
          // picks one on its own.
          setActiveCompany(
            data.companies.find(
              (c: CompanyInfo) => c.id === data.activeCompanyId,
            ) ?? data.companies[0],
          )
        }
        setSessionLoaded(true)
      })
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (!activeCompany?.id) return
    fetch(`/api/dashboard?companyId=${activeCompany.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (d?.usage) setUsage(d.usage)
      })
  }, [activeCompany?.id])

  const notify = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(""), 3200)
  }, [])

  /**
   * Switches the active workspace. The server validates the selection against
   * the user's own memberships and answers with the workspace and the role the
   * user holds there, so the interface can never show a role the server does
   * not grant.
   */
  const switchCompany = useCallback(
    async (companyId: string) => {
      try {
        const res = await fetch(
          `/api/companies?active=${encodeURIComponent(companyId)}`,
        )
        if (!res.ok) {
          notify("Could not switch workspace.")
          return
        }
        const data = await res.json().catch(() => null)
        if (!data?.companies?.length) {
          notify("Could not switch workspace.")
          return
        }
        setCompanies(data.companies)
        setActiveCompany(
          data.companies.find(
            (c: CompanyInfo) => c.id === data.activeCompanyId,
          ) ?? null,
        )
      } catch {
        notify("Could not switch workspace.")
      }
    },
    [notify],
  )

  const go = (screen: Screen) => {
    setSidebarOpen(false)
    router.push(routes[screen])
  }

  const isActive = (href: string) =>
    pathname ===
      href ||
    pathname.startsWith(`${href}/`)

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } catch {}
    router.push(routes.login)
  }

  const initials =
    (user?.name || user?.email || "U")
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U"

  // A platform administrator has no company membership, so there is no
  // workspace to scope. They are routed to the platform console instead of
  // the tenant screens (SRS §7.7 — platform access is separate).
  const platformOnly =
    isPlatformAdmin && !activeCompany && companies.length === 0
  const role = activeCompany?.role ?? null
  const canWrite = role === "OWNER" || role === "STAFF"
  // Default deny: until the membership is known nothing may be written.
  const readOnly = viewer || !canWrite

  const companyName =
    activeCompany?.name ?? (platformOnly ? "Platform console" : "Workspace")
  const planName = activeCompany?.plan ?? (platformOnly ? "PLATFORM" : "—")
  const isOwner = role === "OWNER"
  const visibleNav = platformOnly
    ? []
    : nav.filter((item) => !item.ownerOnly || isOwner)
  const userRole = platformOnly
    ? "Super Admin"
    : role === "OWNER"
      ? "Owner"
      : role === "STAFF"
        ? "Staff"
        : "Viewer"

  const pageTitle = platformOnly
    ? "Super Admin"
    : pathname === "/"
      ? "Dashboard"
      : pathname === "/dashboard"
        ? "Dashboard"
        : pathname === "/customers"
          ? "Customers"
          : pathname.startsWith("/customers/new")
            ? "Customer"
            : pathname.startsWith("/customers/")
              ? "Customer details"
              : pathname === "/invoices"
                ? "Invoices"
                : pathname.startsWith("/invoices/new")
                  ? "New invoice"
                  : pathname.startsWith("/invoices/")
                    ? "Invoice details"
                    : pathname === "/team"
                      ? "Team"
                      : pathname === "/subscription"
                        ? "Subscription"
                        : pathname === "/admin"
                          ? "Super Admin"
                          : "MiniBiz"

  // A platform administrator has no tenant workspace, so the tenant screens
  // could never load. Send them straight to the platform console.
  useEffect(() => {
    if (platformOnly && pathname !== routes.admin) {
      router.replace(routes.admin)
    }
  }, [platformOnly, pathname, router])

  return (
    <ShellContext.Provider
      value={{
        viewer,
        notify,
        companyId: activeCompany?.id ?? null,
        companyName: activeCompany?.name ?? null,
        role,
        userName: user?.name ?? user?.email ?? null,
        canWrite,
        readOnly,
        platformOnly,
      }}
    >
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
          <div className="brand">
            <span className="brand-mark">
              <span />
              <span />
              <span />
            </span>
            {!collapsed && <span>MiniBiz</span>}
            <button
              className="mobile-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X />
            </button>
          </div>
          <div className="workspace-card">
            <span className="workspace-logo">
              {platformOnly
                ? "MB"
                : (companyName.slice(0, 2) || "MB").toUpperCase()}
            </span>
            {!collapsed && (
              <>
                <span className="workspace-copy">
                  <strong>{companyName}</strong>
                  <small>
                    {platformOnly ? "Platform access" : `${planName} plan`}
                  </small>
                </span>
                <ChevronRight size={14} />
              </>
            )}
          </div>
          {!collapsed && companies.length > 1 && (
            <select
              className="company-switch"
              value={activeCompany?.id ?? ""}
              aria-label="Switch company"
              onChange={(e) => switchCompany(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {roleLabel[c.role] ?? c.role} ({c.plan})
                </option>
              ))}
            </select>
          )}
          <nav className="main-nav">
            {!collapsed && !platformOnly && (
              <span className="nav-label">Workspace</span>
            )}
            {visibleNav.map((item) => {
              const NavIcon = item.icon
              return (
                <Link
                  key={item.id}
                  href={routes[item.id]}
                  className={isActive(routes[item.id]) ? "active" : ""}
                  onClick={() => setSidebarOpen(false)}
                  title={item.label}
                >
                  <NavIcon />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
            {isPlatformAdmin && (
              <>
                {!collapsed && (
                  <span className="nav-label nav-label-spaced">Manage</span>
                )}
                <Link
                  href={routes.admin}
                  className={isActive(routes.admin) ? "active" : ""}
                  onClick={() => setSidebarOpen(false)}
                  title="Super Admin"
                >
                  <Building2 />
                  {!collapsed && <span>Super Admin</span>}
                </Link>
              </>
            )}
          </nav>
          <div className="sidebar-bottom">
            {!collapsed && usage && (
              <div className="usage-mini">
                <div>
                  <span>Invoices</span>
                  <strong>
                    {usage.invoices.used} / {formatLimit(usage.invoices.limit)}
                  </strong>
                </div>
                <div className="progress">
                  <span
                    style={{
                      width:
                        usage.invoices.limit >= Number.MAX_SAFE_INTEGER / 2
                          ? "8%"
                          : `${Math.min(100, (usage.invoices.used / usage.invoices.limit) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <button
              className="collapse-button sign-out"
              onClick={handleSignOut}
            >
              <LogOut />
              {!collapsed && <span>Sign out</span>}
            </button>
            <button
              className="collapse-button"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
              {!collapsed && <span>Collapse sidebar</span>}
            </button>
          </div>
        </aside>
        {sidebarOpen && (
          <div className="scrim" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="main-area">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="menu-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu />
              </button>
              <h1>{pageTitle}</h1>
            </div>
            <div className="topbar-actions">
              {!platformOnly && activeCompany?.role !== "VIEWER" && (
                <div className="role-toggle">
                  <span>Viewer preview</span>
                  <button
                    className={viewer ? "on" : ""}
                    onClick={() => setViewer(!viewer)}
                    aria-label="Toggle viewer preview"
                  >
                    <span />
                  </button>
                </div>
              )}
              <button className="user-menu">
                <Avatar initials={initials} color="dark" />
                <span>
                  <strong>{user?.name || user?.email || "User"}</strong>
                  <small>{viewer ? "Viewer" : userRole}</small>
                </span>
                <ChevronRight size={14} />
              </button>
            </div>
          </header>

          <main className="content">
            {viewer && (
              <div className="viewer-banner">
                <Eye />
                <span>
                  <strong>Viewer mode</strong> — actions and editing are
                  disabled.
                </span>
                <button onClick={() => setViewer(false)}>Exit preview</button>
              </div>
            )}
            {platformOnly && pathname !== routes.admin ? (
              <PlatformNotice />
            ) : sessionLoaded && !activeCompany ? (
              <NoWorkspaceNotice />
            ) : (
              children
            )}
          </main>
        </div>

        {toast && (
          <div className="toast">
            <span className="toast-check">
              <Check size={15} />
            </span>
            <span>{toast}</span>
            <button onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </ShellContext.Provider>
  )
}
