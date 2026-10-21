"use client"

import { useEffect } from "react"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Route error:", error)
  }, [error])

  return (
    <div className="route-state">
      <span className="route-state-icon">
        <TriangleAlert size={24} />
      </span>
      <h2>Something went wrong</h2>
      <p>
        The page could not be loaded. Your data is safe — try again, and if the
        problem persists reload the workspace.
      </p>
      {error.digest && <small className="route-state-ref">{error.digest}</small>}
      <div className="route-state-actions">
        <Button kind="secondary" onClick={() => reset()}>
          Try again
        </Button>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    </div>
  )
}
