"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Avatar, Button, EmptyState, PageIntro } from "@/components/ui"
import { routes } from "@/lib/routes"

type CustomerRow = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
}

export default function CustomersPage() {
  const router = useRouter()
  const { viewer, companyId } = useShell()
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!companyId) return
    fetch(`/api/customers?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (data?.customers) setCustomers(data.customers)
        setLoading(false)
      })
  }, [companyId])

  const filtered = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${c.name || ""} ${c.email || ""}`.toLowerCase().includes(q)
  })

  return (
    <div className="page">
      <PageIntro
        title="Customers"
        text="Manage customer details and view their invoice history."
        actions={
          !viewer && (
            <Button icon="plus" onClick={() => router.push(routes.customerNew)}>
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
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <EmptyState title="Loading..." text="Fetching customers." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No customers yet"
            text="Add your first customer to start creating invoices."
            action={
              !viewer && (
                <Button
                  icon="plus"
                  onClick={() => router.push(routes.customerNew)}
                >
                  Add customer
                </Button>
              )
            }
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="clickable"
                    onClick={() => router.push(`/customers/${c.id}`)}
                  >
                    <td>
                      <div className="person-cell">
                        <Avatar
                          initials={(c.name || "C")
                            .split(" ")
                            .filter(Boolean)
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                          color="sage"
                        />
                        <span>
                          <strong>{c.name}</strong>
                        </span>
                      </div>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.phone || "—"}</td>
                    <td>
                      <button
                        className="row-action"
                        aria-label={`Open ${c.name}`}
                      >
                        <Icon name="more" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>
            Showing {filtered.length} of {customers.length} customers
          </span>
        </div>
      </section>
    </div>
  )
}
