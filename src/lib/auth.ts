import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "@/lib/prisma" // your prisma client instance

// The end-to-end suite registers a dozen accounts in a few seconds, which
// trips Better Auth's sign-up rate limit. Production keeps the default
// limits; only the throwaway e2e server disables them.
const rateLimit =
  process.env.MINIBIZ_E2E === "1" ? { enabled: false } : undefined

export const auth = betterAuth({
  baseUrl: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "sqlite", "postgres", etc.
  }),
  emailAndPassword: {
    enabled: true,
  },
  // "Remember me" on the sign-in form controls the session cookie. A
  // remembered session persists for 30 days and refreshes once a day; an
  // unremembered one is a browser-session cookie that expires in 7 days.
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit,
})

