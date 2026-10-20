"use client"

import { useRouter } from "next/navigation"
import { invoices, routes, type Screen } from "./data"
import { Icon } from "./icon"
import { Badge } from "./ui"

export function InvoiceTable({ data }: { data: typeof invoices }) {
  const router = useRouter()
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Issue date</th>
            <th>Due date</th>
            <th>Amount</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.map((i) => (
            <tr
              key={i.id}
              onClick={() =>
                router.push(
                  i.status === "Issued"
                    ? `${routes.invoices}/${i.id}`
                    : routes["invoice-form"],
                )
              }
              className="clickable"
            >
              <td>
                <strong className="invoice-id">{i.id}</strong>
              </td>
              <td>{i.customer}</td>
              <td>{i.date}</td>
              <td>{i.due}</td>
              <td>
                <strong>{i.amount}</strong>
              </td>
              <td>
                <Badge tone={i.status === "Issued" ? "green" : "amber"}>
                  {i.status}
                </Badge>
              </td>
              <td>
                <button className="row-action">
                  <Icon name="more" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function useGo() {
  const router = useRouter()
  return (screen: Screen) => router.push(routes[screen])
}
