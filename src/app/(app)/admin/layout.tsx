import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getSession, isPlatformAdmin } from "@/lib/auth-helpers"

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getSession()
  if (!session?.user?.id) {
    redirect("/login")
  }
  const admin = await isPlatformAdmin(session.user.id)
  if (!admin) {
    redirect("/dashboard")
  }
  return <>{children}</>
}
