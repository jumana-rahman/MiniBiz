"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
import { useShell } from "@/components/shell"
import { Avatar, Button, EmptyState, PageIntro } from "@/components/ui"
import { Pagination, type PaginationState } from "@/components/pagination"
import { routes } from "@/lib/routes"

type CustomerRow = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
}

const emptyPagination: PaginationState = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
}

export default function CustomersPage() {
  const router = useRouter()
  const { viewer, companyId } = useShell()
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [pagination, setPagination] = useState(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    const params = new URLSearchParams({ companyId, page: String(page) })
    if (query) params.set("q", query)
    fetch(`/api/customers?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (data?.customers) setCustomers(data.customers)
        if (data?.pagination) setPagination(data.pagination)
        setLoading(false)
      })
  }, [companyId, page, query])

  // Debounce the search box so every keystroke does not hit the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="page">
      <PageIntro
        title="Customers"
        text="Manage customer details and view their invoice history."
        actions={
          !viewer && (
            <Button icon={Plus} onClick={() => router.push(routes.customerNew)}>
              Add customer
            </Button>
          )
        }
      />
      <section className="card table-card">
        <div className="toolbar">
          <div className="search">
            <Search />
            <input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <EmptyState title="Loading..." text="Fetching customers." />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers yet"
            text="Add your first customer to start creating invoices."
            action={
              !viewer && (
                <Button
                  icon={Plus}
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
                  <th>Invoice history</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="clickable"
                    onClick={() => router.push(routes.customerDetail(c.id))}
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
                      <span className="muted">View invoices</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          state={pagination}
          onPage={setPage}
          label="customers"
        />
      </section>
    </div>
  )
}
