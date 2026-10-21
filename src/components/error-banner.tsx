"use client"

import type { ReactNode } from "react"
import { TriangleAlert } from "lucide-react"

/**
 * Shared inline error panel (SRS §10.3 — validation and error feedback).
 * Every form and panel in the app uses this one component so the styling and
 * the wording stay consistent.
 */
export function ErrorBanner({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="error-banner" role="alert">
      <TriangleAlert size={16} />
      <span>
        <strong>{title}</strong>
        {children && <small>{children}</small>}
      </span>
      {action}
    </div>
  )
}
