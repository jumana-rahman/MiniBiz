import type { IconName } from "./icon"

export const routes = {
  dashboard: "/dashboard",
  customers: "/customers",
  "customer-detail": "/customers/northstar-coffee",
  "customer-form": "/customers/new",
  invoices: "/invoices",
  "invoice-detail": "/invoices/INV-0248",
  "invoice-form": "/invoices/new",
  team: "/team",
  subscription: "/subscription",
  admin: "/admin",
  login: "/login",
  register: "/register",
} as const

export type Screen = keyof typeof routes

export const nav: { id: Screen; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "customers", label: "Customers", icon: "users" },
  { id: "invoices", label: "Invoices", icon: "file" },
  { id: "team", label: "Team", icon: "team" },
  { id: "subscription", label: "Subscription", icon: "card" },
]

export const invoices = [
  {
    id: "INV-0248",
    customer: "Northstar Coffee",
    date: "May 24, 2025",
    due: "Jun 7, 2025",
    amount: "$4,280.00",
    status: "Issued",
  },
  {
    id: "INV-0247",
    customer: "Brightline Studio",
    date: "May 22, 2025",
    due: "Jun 5, 2025",
    amount: "$1,840.00",
    status: "Issued",
  },
  {
    id: "INV-0246",
    customer: "Harbor & Co.",
    date: "May 20, 2025",
    due: "—",
    amount: "$3,120.00",
    status: "Draft",
  },
  {
    id: "INV-0245",
    customer: "Fieldwork Labs",
    date: "May 17, 2025",
    due: "May 31, 2025",
    amount: "$980.00",
    status: "Issued",
  },
  {
    id: "INV-0244",
    customer: "Solis Architecture",
    date: "May 14, 2025",
    due: "—",
    amount: "$6,450.00",
    status: "Draft",
  },
]

export const customers = [
  {
    initials: "NC",
    name: "Northstar Coffee",
    email: "hello@northstar.co",
    company: "Northstar Coffee Ltd.",
    invoices: 8,
    value: "$18,620",
    color: "sage",
  },
  {
    initials: "BS",
    name: "Brightline Studio",
    email: "accounts@brightline.design",
    company: "Brightline Studio",
    invoices: 5,
    value: "$12,840",
    color: "blue",
  },
  {
    initials: "HC",
    name: "Harbor & Co.",
    email: "finance@harborco.com",
    company: "Harbor & Co. LLC",
    invoices: 12,
    value: "$31,290",
    color: "amber",
  },
  {
    initials: "FL",
    name: "Fieldwork Labs",
    email: "mara@fieldworklabs.io",
    company: "Fieldwork Labs Inc.",
    invoices: 3,
    value: "$7,480",
    color: "purple",
  },
  {
    initials: "SA",
    name: "Solis Architecture",
    email: "office@solisarch.com",
    company: "Solis Architecture",
    invoices: 6,
    value: "$22,150",
    color: "rose",
  },
  {
    initials: "BK",
    name: "Brook & Kin",
    email: "payables@brookandkin.com",
    company: "Brook & Kin",
    invoices: 2,
    value: "$4,900",
    color: "blue",
  },
]

export function customerSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function routeTitle(pathname: string): string {
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard"
  if (pathname === "/customers") return "Customers"
  if (pathname.startsWith("/customers/new")) return "Customer"
  if (pathname.startsWith("/customers/")) return "Customer details"
  if (pathname === "/invoices") return "Invoices"
  if (pathname.startsWith("/invoices/new")) return "New invoice"
  if (pathname.startsWith("/invoices/")) return "Invoice INV-0248"
  if (pathname === "/team") return "Team"
  if (pathname === "/subscription") return "Subscription"
  if (pathname === "/admin") return "Super Admin"
  return "MiniBiz"
}
