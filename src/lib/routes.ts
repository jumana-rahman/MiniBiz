export const routes = {
  dashboard: "/dashboard",
  customers: "/customers",
  customerNew: "/customers/new",
  customerDetail: (id: string) => `/customers/${id}`,
  invoices: "/invoices",
  invoiceNew: "/invoices/new",
  invoiceDetail: (id: string) => `/invoices/${id}`,
  team: "/team",
  subscription: "/subscription",
  admin: "/admin",
  login: "/login",
  register: "/register",
} as const

/** Screens that can be addressed by a static path. */
export type Screen =
  | "dashboard"
  | "customers"
  | "invoices"
  | "team"
  | "subscription"
  | "admin"
  | "login"
  | "register"
