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
import { Avatar } from "./ui"
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
  viewer: boolean
  setViewer: (value: boolean) => void
  notify: (message: string) => void
  companyId: string | null
  companyName: string | null
  role: string | null
  plan: string | null
  isPlatformAdmin: boolean
  refresh: () => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error("useShell must be used inside the app shell")
  return ctx
}

type CompanyInfo = {
  id: string
  name: string
  slug: string
  plan: string
  role: string
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
          setActiveCompany((current) => {
            const match = data.companies.find(
              (c: CompanyInfo) =>
                c.id ===
                current?.id,
            )
            return (
              match ??
              data.companies[0]
            )
          })
        }
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

  const companyName = activeCompany?.name || "Workspace"
  const planName = activeCompany?.plan || "TRIAL"
  const isOwner = activeCompany?.role === "OWNER"
  const visibleNav = nav.filter((item) => !item.ownerOnly || isOwner)
  const userRole =
    activeCompany?.role === "OWNER"
      ? "Owner"
      : activeCompany?.role === "STAFF"
        ? "Staff"
        : "Viewer"

  return (
    <ShellContext.Provider
      value={{
        viewer,
        setViewer,
        notify,
        companyId: activeCompany?.id ?? null,
        companyName: activeCompany?.name ?? null,
        role: activeCompany?.role ?? null,
        plan: planName,
        isPlatformAdmin,
        refresh: loadSession,
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
              {(companyName.slice(0, 2) || "MB").toUpperCase()}
            </span>
            {!collapsed && (
              <>
                <span className="workspace-copy">
                  <strong>{companyName}</strong>
                  <small>{planName} plan</small>
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
              onChange={(e) => {
                const next = companies.find((c) => c.id === e.target.value)
                if (next) setActiveCompany(next)
              }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <nav className="main-nav">
            {!collapsed && <span className="nav-label">Workspace</span>}
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
              <h1>
                {pathname === "/"
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
                                      : "MiniBiz"}
              </h1>
            </div>
            <div className="topbar-actions">
              {activeCompany?.role !== "VIEWER" && (
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
            {children}
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
