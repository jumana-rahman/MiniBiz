"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Check, Eye } from "lucide-react"
import { ErrorBanner } from "@/components/error-banner"
import { Badge, BrandMark, Button, Field } from "./ui"

const routes = {
  dashboard: "/dashboard",
  login: "/login",
  register: "/register",
} as const

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      if (mode === "login") {
        const email = formData.get("email") as string
        const password = formData.get("password") as string
        const res = await authClient.signIn.email({ email, password })
        if (res.error) {
          setError(res.error.message || "Sign in failed")
        } else {
          router.push(routes.dashboard)
        }
      } else {
        const name = formData.get("name") as string
        const email = formData.get("email") as string
        const password = formData.get("password") as string
        const companyName = formData.get("company") as string
        const res = await authClient.signUp.email({ email, password, name })
        if (res.error) {
          setError(res.error.message || "Sign up failed")
        } else {
          if (!companyName) {
            setError("Company name is required")
            return
          }
          const reg = await fetch("/api/auth/register-company", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyName }),
          }).catch(() => null)
          if (!reg?.ok) {
            const data = await reg?.json().catch(() => null)
            setError(data?.error || "Could not create your company")
            return
          }
          router.push(routes.dashboard)
        }
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <BrandMark label="MiniBiz" />
          <Badge tone="green">Business, simplified</Badge>
        </div>
        <div className="auth-copy">
          <span className="eyebrow">Multi-tenant business manager</span>
          <h1>Run your business with clarity.</h1>
          <p>
            Customers, invoices, team access, and subscriptions — thoughtfully
            organized in one secure workspace.
          </p>
          <div className="auth-benefits">
            <span>
              <Check />
              Issue professional invoices in minutes
            </span>
            <span>
              <Check />
              Keep customer records in one place
            </span>
            <span>
              <Check />
              Give your team the right level of access
            </span>
          </div>
        </div>
        <div className="auth-quote">
          <p>
            “MiniBiz gives us exactly the structure we need without the usual
            software overhead.”
          </p>
          <span>MiniBiz — multi-tenant business manager</span>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <div className="mobile-auth-brand">
            <BrandMark label="MiniBiz" />
          </div>
          <h2>{mode === "login" ? "Welcome back" : "Create your company"}</h2>
          <p>
            {mode === "login"
              ? "Sign in to continue to your workspace."
              : "Start your 14-day trial. No credit card required."}
          </p>
          {error && (
            <ErrorBanner title="Authentication error">{error}</ErrorBanner>
          )}
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <Field label="Your name">
                  <input name="name" placeholder="Alex Morgan" />
                </Field>
                <Field label="Company name">
                  <input name="company" placeholder="Acme & Bloom" />
                </Field>
              </>
            )}
            <Field label="Work email">
              <input name="email" type="email" placeholder="you@company.com" />
            </Field>
            <Field label="Password">
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <Eye />
                </button>
              </div>
            </Field>
            {mode === "login" && (
              <div className="form-options">
                <label>
                  <input type="checkbox" defaultChecked />
                  Remember me
                </label>
              </div>
            )}
            <Button type="submit">
              {mode === "login" ? "Sign in" : "Create company"}
            </Button>
          </form>
          <p className="auth-switch">
            {mode === "login" ? "New to MiniBiz?" : "Already have an account?"}{" "}
            <button
              onClick={() =>
                router.push(mode === "login" ? routes.register : routes.login)
              }
            >
              {mode === "login" ? "Create a company" : "Sign in"}
            </button>
          </p>
          <p className="auth-terms">
            By continuing, you agree to the Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
