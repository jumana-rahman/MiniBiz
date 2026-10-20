"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { routes } from "./data"
import { Icon } from "./icon"
import { Badge, BrandMark, Button, Field } from "./ui"

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const router = useRouter()
  const [error, setError] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!error) router.push(routes.dashboard)
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
              <Icon name="check" />
              Issue professional invoices in minutes
            </span>
            <span>
              <Icon name="check" />
              Keep customer records in one place
            </span>
            <span>
              <Icon name="check" />
              Give your team the right level of access
            </span>
          </div>
        </div>
        <div className="auth-quote">
          <p>
            “MiniBiz gives us exactly the structure we need without the usual
            software overhead.”
          </p>
          <span>Alex Morgan · Acme &amp; Bloom</span>
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
            <div className="error-banner">
              <Icon name="alert" />
              <span>
                <strong>We couldn’t sign you in.</strong>
                <small>Check your email and password, then try again.</small>
              </span>
            </div>
          )}
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <Field label="Your name">
                  <input placeholder="Alex Morgan" />
                </Field>
                <Field label="Company name">
                  <input placeholder="Acme & Bloom" />
                </Field>
              </>
            )}
            <Field label="Work email">
              <input
                type="email"
                defaultValue={mode === "login" ? "alex@acmebloom.com" : ""}
                placeholder="you@company.com"
              />
            </Field>
            <Field label="Password">
              <div className="password-field">
                <input
                  type="password"
                  defaultValue={mode === "login" ? "password123" : ""}
                  placeholder="At least 8 characters"
                />
                <button type="button">
                  <Icon name="eye" />
                </button>
              </div>
            </Field>
            {mode === "login" && (
              <div className="form-options">
                <label>
                  <input type="checkbox" defaultChecked />
                  Remember me
                </label>
                <button type="button">Forgot password?</button>
              </div>
            )}
            <Button type="submit">
              {mode === "login" ? "Sign in" : "Create company"}
            </Button>
            {mode === "login" && (
              <button
                type="button"
                className="demo-error-link"
                onClick={() => setError(!error)}
              >
                Preview error state
              </button>
            )}
          </form>
          <p className="auth-switch">
            {mode === "login" ? "New to MiniBiz?" : "Already have an account?"}{" "}
            <button
              onClick={() =>
                router.push(
                  mode === "login" ? routes.register : routes.login,
                )
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
