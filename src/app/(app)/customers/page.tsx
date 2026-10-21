"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/icon"
import { useShell } from "@/components/shell"
import { Avatar, Button, EmptyState, PageIntro } from "@/components/ui"

export default function CustomersPage() {
  const router = useRouter()
  const { viewer, companyId } = useShell()
  const [customers, setCustomers] = useState<any[]>([])
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

  const filtered = customers.filter((c: any) => {
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
            <Button icon="plus" onClick={() => router.push("/customers/new")}>
              Add customer
            </Button>
          )
        }
      />
      <div className="panel">
        <div className="panel-header">
          <div className="search-field">
            <Icon name="search" />
            <input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <EmptyState
            title="Loading..."
            text="Fetching customers."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No customers yet"
            text="Add your first customer to start creating invoices."
            action={
              !viewer && (
                <Button icon="plus" onClick={() => router.push("/customers/new")}>
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
                {filtered.map((c: any) => (
                  <tr
                    key={c.id}
                    className="clickable"
                    onClick={() => router.push(`/customers/${c.id}`)}
                  >
                    <td>
                      <div className="customer-cell">
                        <Avatar
                          initials={(c.name || "C")
                            .split(" ")
                            .map((p: string) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                          color="sage"
                        />
                        <div>
                          <strong>{c.name}</strong>
                        </div>
                      </div>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.phone || "—"}</td>
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
        )}
      </div>
    </div>
  )
}
