"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { Icon } from "./icon"
import { nav, routeTitle, routes, type Screen } from "./data"
import { Avatar } from "./ui"

type ShellContextValue = {
  viewer: boolean
  setViewer: (value: boolean) => void
  notify: (message: string) => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error("useShell must be used inside the app shell")
  return ctx
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [viewer, setViewer] = useState(false)
  const [toast, setToast] = useState("")

  const notify = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(""), 3200)
  }, [])

  const go = (screen: Screen) => {
    setSidebarOpen(false)
    router.push(routes[screen])
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <ShellContext.Provider value={{ viewer, setViewer, notify }}>
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
              <Icon name="close" />
            </button>
          </div>
          <div className="workspace-card">
            <span className="workspace-logo">AB</span>
            {!collapsed && (
              <>
                <span className="workspace-copy">
                  <strong>Acme & Bloom</strong>
                  <small>Pro plan</small>
                </span>
                <Icon name="chevron" size={14} />
              </>
            )}
          </div>
          <nav className="main-nav">
            {!collapsed && <span className="nav-label">Workspace</span>}
            {nav.map((item) => (
              <Link
                key={item.id}
                href={routes[item.id]}
                className={isActive(routes[item.id]) ? "active" : ""}
                onClick={() => setSidebarOpen(false)}
                title={item.label}
              >
                <Icon name={item.icon} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
            {!collapsed && (
              <span className="nav-label nav-label-spaced">Manage</span>
            )}
            <button onClick={() => notify("Settings are up to date.")}>
              <Icon name="settings" />
              {!collapsed && <span>Settings</span>}
            </button>
            <Link
              href={routes.admin}
              className={isActive(routes.admin) ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon name="building" />
              {!collapsed && <span>Super Admin</span>}
            </Link>
          </nav>
          <div className="sidebar-bottom">
            {!collapsed && (
              <div className="usage-mini">
                <div>
                  <span>Monthly invoices</span>
                  <strong>18 / 50</strong>
                </div>
                <div className="progress">
                  <span style={{ width: "36%" }} />
                </div>
                <small>Resets June 1</small>
              </div>
            )}
            <button
              className="collapse-button sign-out"
              onClick={() => go("login")}
            >
              <Icon name="arrow" />
              {!collapsed && <span>Sign out</span>}
            </button>
            <button
              className="collapse-button"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Icon name={collapsed ? "chevron" : "arrow"} />
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
                <Icon name="menu" />
              </button>
              <h1>{routeTitle(pathname)}</h1>
            </div>
            <div className="topbar-actions">
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
              <button className="icon-button has-dot" aria-label="Notifications">
                <Icon name="bell" />
              </button>
              <button className="user-menu">
                <Avatar initials="AM" color="dark" />
                <span>
                  <strong>Alex Morgan</strong>
                  <small>{viewer ? "Viewer" : "Owner"}</small>
                </span>
                <Icon name="chevron" size={14} />
              </button>
            </div>
          </header>

          <main className="content">
            {viewer && (
              <div className="viewer-banner">
                <Icon name="eye" />
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
              <Icon name="check" size={15} />
            </span>
            <span>{toast}</span>
            <button onClick={() => setToast("")}>
              <Icon name="close" size={15} />
            </button>
          </div>
        )}
      </div>
    </ShellContext.Provider>
  )
}
