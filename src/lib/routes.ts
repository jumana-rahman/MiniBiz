export const routes = {
  dashboard: "/dashboard",
  customers: "/customers",
  customerNew: "/customers/new",
  customerDetail: "/customers",
  invoices: "/invoices",
  invoiceNew: "/invoices/new",
  invoiceDetail: "/invoices",
  team: "/team",
  subscription: "/subscription",
  admin: "/admin",
  login: "/login",
  register: "/register",
} as const

export type Screen = keyof typeof routes
