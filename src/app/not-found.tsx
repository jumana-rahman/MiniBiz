import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { routes } from "@/lib/routes"

export default function NotFound() {
  return (
    <div className="route-state">
      <span className="route-state-icon">
        <FileQuestion size={24} />
      </span>
      <h2>Page not found</h2>
      <p>
        The page you are looking for does not exist or has moved. Check the
        address, or head back to your dashboard.
      </p>
      <div className="route-state-actions">
        <Link className="button primary" href={routes.dashboard}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
