"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="route-state">
          <h2>MiniBiz could not start</h2>
          <p>
            An unexpected error stopped the application. Reload the page to try
            again.
          </p>
          {error.digest && (
            <small className="route-state-ref">{error.digest}</small>
          )}
          <div className="route-state-actions">
            <button className="button primary" onClick={() => reset()}>
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
