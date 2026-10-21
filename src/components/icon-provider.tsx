"use client"

import type { ReactNode } from "react"
import { LucideProvider } from "lucide-react"

export function IconProvider({ children }: { children: ReactNode }) {
  return (
    <LucideProvider size={18} strokeWidth={1.8}>
      {children}
    </LucideProvider>
  )
}
