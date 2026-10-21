import { existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const baseUrlFile = path.join(tmpdir(), "minibiz-e2e-url")

/**
 * Resolves the base URL of the server under test.
 * `MINIBIZ_BASE_URL` is set by the e2e global setup; the temp file is the
 * fallback for workers that were forked before the setup wrote the env var.
 */
export function baseUrl(): string {
  const fromEnv = process.env.MINIBIZ_BASE_URL
  if (fromEnv) return fromEnv
  if (existsSync(baseUrlFile)) {
    const value = readFileSync(baseUrlFile, "utf8").trim()
    if (value) return value
  }
  return "http://localhost:3000"
}

export type Jar = {
  header: () => string
  absorb: (res: Response) => void
}

export function makeJar(): Jar {
  const jar = new Map<string, string>()
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb(res) {
      const raw = res.headers.getSetCookie?.() ?? []
      for (const cookie of raw) {
        const [pair] = cookie.split(";")
        const idx = pair.indexOf("=")
        if (idx > 0) {
          jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
        }
      }
    },
  }
}

export type CallOptions = {
  method?: string
  body?: unknown
  /** Sends the string verbatim, so malformed JSON can be tested. */
  rawBody?: string
}

export type CallResult = {
  status: number
  json: any
  text: string
}

export async function call(
  jar: Jar,
  path: string,
  options: CallOptions = {},
): Promise<CallResult> {
  const base = baseUrl()
  const res = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Origin: base,
      ...(options.body || options.rawBody
        ? { "Content-Type": "application/json" }
        : {}),
      ...(jar.header() ? { Cookie: jar.header() } : {}),
    },
    body:
      options.rawBody ?? (options.body ? JSON.stringify(options.body) : undefined),
    redirect: "manual",
  })
  jar.absorb(res)
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: res.status, json, text }
}

/**
 * Registers a brand new user and creates their first company.
 * Returns the new company id.
 */
export async function signUp(
  jar: Jar,
  name: string,
  email: string,
  password: string,
  companyName: string,
): Promise<string> {
  const res = await call(jar, "/api/auth/sign-up/email", {
    method: "POST",
    body: { name, email, password },
  })
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`sign-up failed for ${email}: ${res.status} ${res.text}`)
  }
  const company = await call(jar, "/api/auth/register-company", {
    method: "POST",
    body: { companyName },
  })
  if (!company.json?.companyId) {
    throw new Error(
      `register-company failed for ${email}: ${company.status} ${company.text}`,
    )
  }
  return company.json.companyId as string
}

/** Signs an existing user in and returns a session jar. */
export async function signIn(
  email: string,
  password: string,
): Promise<Jar> {
  const jar = makeJar()
  const res = await call(jar, "/api/auth/sign-in/email", {
    method: "POST",
    body: { email, password },
  })
  if (res.status !== 200) {
    throw new Error(`sign-in failed for ${email}: ${res.status} ${res.text}`)
  }
  return jar
}
