import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth-helpers"
import { AppShell } from "@/components/shell"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session?.user?.id) {
    redirect("/login")
  }
  return <AppShell>{children}</AppShell>
}
