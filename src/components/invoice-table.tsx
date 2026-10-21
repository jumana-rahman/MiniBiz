"use client"

import { useRouter } from "next/navigation"
import { Icon } from "./icon"
import { Badge } from "./ui"

type InvoiceRow = {
  id: string
  invoiceNumber?: string
  customer?: { name?: string } | null
  invoiceDate?: string
  createdAt?: string
  issuedAt?: string | null
  total?: number | string
  status: string
}

export function useGo() {
  const router = useRouter()
  return (screen: string) => {
    if (screen === "invoice-form") router.push("/invoices/new")
    else if (screen === "invoice-detail") router.push("/invoices")
    else if (screen === "customer-form") router.push("/customers/new")
    else if (screen === "customer-detail") router.push("/customers")
    else router.push("/dashboard")
  }
}

export function InvoiceTable({ data = [] as InvoiceRow[] }) {
  const router = useRouter()
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "1.5rem" }}>
                No invoices yet
              </td>
            </tr>
          ) : (
            data.map((i) => (
              <tr
                key={i.id}
                onClick={() => router.push(`/invoices/${i.id}`)}
                className="clickable"
              >
                <td>
                  <strong className="invoice-id">{i.invoiceNumber || i.id}</strong>
                </td>
                <td>{i.customer?.name || "—"}</td>
                <td>
                  {i.invoiceDate
                    ? new Date(i.invoiceDate).toLocaleDateString()
                    : i.createdAt
                      ? new Date(i.createdAt).toLocaleDateString()
                      : "—"}
                </td>
                <td>
                  <strong>
                    {typeof i.total === "number"
                      ? i.total.toLocaleString("en-US", { style: "currency", currency: "USD" })
                      : i.total || "$0.00"}
                  </strong>
                </td>
                <td>
                  <Badge tone={i.status === "ISSUED" ? "green" : "amber"}>
                    {i.status === "ISSUED" ? "Issued" : "Draft"}
                  </Badge>
                </td>
                <td>
                  <button className="row-action">
                    <Icon name="more" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
