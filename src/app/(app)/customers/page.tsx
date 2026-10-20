"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { customerSlug, customers, routes, type Screen } from "@/components/data"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Avatar, Button, EmptyState, PageIntro } from "@/components/ui"

export default function CustomersPage() {
  const router = useRouter()
  const { viewer } = useShell()
  const [search, setSearch] = useState("")

  const go = (screen: Screen) => router.push(routes[screen])

  const data = useMemo(
    () =>
      customers.filter((c) =>
        `${c.name} ${c.email} ${c.company}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search],
  )

  return (
    <div className="page">
      <PageIntro
        title="Customers"
        text="Manage customer details and view their invoice history."
        actions={
          !viewer && (
            <Button icon="plus" onClick={() => go("customer-form")}>
              Add customer
            </Button>
          )
        }
      />
      <section className="card table-card">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
            />
          </div>
          <Button kind="secondary" icon="filter">
            Filters
          </Button>
        </div>
        {data.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Company</th>
                  <th>Invoices</th>
                  <th>Total value</th>
                  <th>Last activity</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr
                    key={c.email}
                    onClick={() =>
                      router.push(
                        `${routes.customers}/${customerSlug(c.name)}`,
                      )
                    }
                    className="clickable"
                  >
                    <td>
                      <div className="person-cell">
                        <Avatar initials={c.initials} color={c.color} />
                        <span>
                          <strong>{c.name}</strong>
                          <small>{c.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>{c.company}</td>
                    <td>{c.invoices}</td>
                    <td>
                      <strong>{c.value}</strong>
                    </td>
                    <td>May {12 + c.invoices}, 2025</td>
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
        ) : (
          <EmptyState
            title="No customers found"
            text="Try adjusting your search, or add a new customer."
            action={
              <Button kind="secondary" onClick={() => setSearch("")}>
                Clear search
              </Button>
            }
          />
        )}
        <div className="pagination">
          <span>Showing 1–6 of 48 customers</span>
          <div>
            <Button kind="secondary" disabled>
              Previous
            </Button>
            <Button kind="secondary">Next</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
