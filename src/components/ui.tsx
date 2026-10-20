import type { ReactNode } from "react"
import { Icon, type IconName } from "./icon"

export function Button({
  children,
  kind = "primary",
  icon,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode
  kind?: "primary" | "secondary" | "ghost" | "danger"
  icon?: IconName
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
      {icon && <Icon name={icon} size={16} />}
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
        <Icon name="file" size={24} />
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
  icon,
  positive,
}: {
  label: string
  value: string
  note: string
  icon: IconName
  positive?: boolean
}) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon name={icon} />
        </span>
      </div>
      <strong>{value}</strong>
      <small className={positive ? "positive" : ""}>
        {positive && <Icon name="trend" size={13} />}
        {note}
      </small>
    </div>
  )
}

export function Modal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string
  icon: IconName
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
            <Icon name={icon} />
          </span>
          <h3>{title}</h3>
          <button onClick={onClose}>
            <Icon name="close" />
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
