import { LoaderCircle } from "lucide-react"

export default function AppLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <LoaderCircle size={22} className="spin" />
      <span>Loading workspace...</span>
    </div>
  )
}
