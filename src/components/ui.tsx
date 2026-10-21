"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { FileText, TrendingUp, X } from "lucide-react"

export function Button({
  children,
  kind = "primary",
  icon: IconComponent,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode
  kind?: "primary" | "secondary" | "ghost" | "danger"
  icon?: LucideIcon
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
}) {
  return (
    <button
      className={`button ${kind}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {IconComponent && <IconComponent size={16} />}
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "green" | "amber" | "blue" | "neutral"
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  )
}

export function Avatar({
  initials,
  color = "sage",
}: {
  initials: string
  color?: string
}) {
  return <span className={`avatar ${color}`}>{initials}</span>
}

export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FileText size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

export function PageIntro({
  eyebrow,
  title,
  text,
  actions,
}: {
  eyebrow?: string
  title: string
  text: string
  actions?: ReactNode
}) {
  return (
    <div className="page-intro">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Stat({
  label,
  value,
  note,
  icon: IconComponent,
  positive,
}: {
  label: string
  value: string
  note: string
  icon: LucideIcon
  positive?: boolean
}) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <IconComponent />
        </span>
      </div>
      <strong>{value}</strong>
      <small className={positive ? "positive" : ""}>
        {positive && <TrendingUp size={13} />}
        {note}
      </small>
    </div>
  )
}

export function Modal({
  title,
  icon: IconComponent,
  onClose,
  children,
}: {
  title: string
  icon: LucideIcon
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <span className="modal-icon">
            <IconComponent />
          </span>
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Close dialog">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function BrandMark({ label }: { label?: string }) {
  return (
    <div className="brand">
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      {label && <span>{label}</span>}
    </div>
  )
}
