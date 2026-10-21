"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"

export type CustomerOption = {
  id: string
  name: string
  email: string
  address: string | null
}

export function CustomerPicker({
  companyId,
  value,
  onChange,
  disabled = false,
}: {
  companyId: string | null
  value: CustomerOption | null
  onChange: (customer: CustomerOption | null) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<CustomerOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open || !companyId) return
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ companyId, pageSize: "8" })
      if (query.trim()) params.set("q", query.trim())
      fetch(`/api/customers?${params}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
        .then((d) => {
          if (cancelled) return
          setOptions(d?.customers ?? [])
          setActive(0)
          setLoading(false)
        })
        .catch(() => {
          if (cancelled) return
          setOptions([])
          setLoading(false)
        })
    }, 180)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [companyId, query, open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  const select = (customer: CustomerOption) => {
    onChange(customer)
    setQuery("")
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false)
      return
    }
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const picked = options[active]
      if (picked) select(picked)
    }
  }

  return (
    <div className="picker" ref={boxRef}>
      <div className="picker-control">
        <Search size={14} className="picker-icon" />
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={
            value ? value.name : "Search customers by name or email..."
          }
          value={open ? query : ""}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        {loading && <Loader2 size={14} className="picker-spinner" />}
        {value && !loading && (
          <button
            type="button"
            className="picker-clear"
            aria-label="Clear customer"
            disabled={disabled}
            onClick={() => {
              onChange(null)
              setQuery("")
              setOpen(true)
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <ul className="picker-list" id={listId} role="listbox">
          {options.length === 0 && !loading && (
            <li className="picker-empty">
              {query.trim()
                ? "No customers match that search."
                : "No customers yet."}
            </li>
          )}
          {options.map((customer, index) => (
            <li key={customer.id}>
              <button
                type="button"
                role="option"
                aria-selected={customer.id === value?.id}
                className={`picker-option ${index === active ? "active" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => select(customer)}
              >
                <span className="picker-option-name">{customer.name}</span>
                <span className="picker-option-email">{customer.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
