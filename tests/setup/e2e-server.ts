import { spawn, type ChildProcess } from "node:child_process"
import { createServer } from "node:net"
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const root = process.cwd()
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next")
const baseUrlFile = path.join(tmpdir(), "minibiz-e2e-url")

let server: ChildProcess | null = null

function newestMtime(dir: string): number {
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
        continue
      }
      newest = Math.max(newest, newestMtime(full))
    } else {
      newest = Math.max(newest, statSync(full).mtimeMs)
    }
  }
  return newest
}

function needsBuild(): boolean {
  const buildId = path.join(root, ".next", "BUILD_ID")
  if (!existsSync(buildId)) return true
  const built = statSync(buildId).mtimeMs
  const sources = Math.max(
    newestMtime(path.join(root, "src")),
    existsSync(path.join(root, "prisma"))
      ? newestMtime(path.join(root, "prisma"))
      : 0,
    statSync(path.join(root, "package.json")).mtimeMs,
    statSync(path.join(root, "next.config.ts")).mtimeMs,
  )
  return sources > built
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit", shell: false })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`))
    })
  })
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.on("error", reject)
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address()
      const port = typeof address === "object" && address ? address.port : 0
      srv.close(() => resolve(port))
    })
  })
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError = "no response"
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" })
      if (res.ok) return
      lastError = `HTTP ${res.status}`
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`Server did not become ready at ${url} (${lastError})`)
}

export async function setup(): Promise<void> {
  if (process.env.MINIBIZ_E2E !== "1") return

  if (needsBuild()) {
    console.log("\n[e2e] Source changed — running next build...\n")
    await run(process.execPath, [nextBin, "build"])
  }

  const port = await freePort()
  const base = `http://localhost:${port}`

  server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      MINIBIZ_E2E: "1",
      // The e2e server must advertise its own origin so Better Auth accepts
      // the session cookies we mint against it.
      BETTER_AUTH_URL: base,
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  server.stdout?.on("data", (d: Buffer) => process.stdout.write(`[e2e] ${d}`))
  server.stderr?.on("data", (d: Buffer) => process.stderr.write(`[e2e] ${d}`))

  await waitForServer(`${base}/login`, 90_000)

  process.env.MINIBIZ_BASE_URL = base
  writeFileSync(baseUrlFile, base)
  console.log(`\n[e2e] Server ready at ${base}\n`)
}

export async function teardown(): Promise<void> {
  if (!server) return
  const pid = server.pid
  server.kill()
  if (pid && process.platform === "win32") {
    // next start can leave child processes behind on Windows.
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" })
  }
  server = null
}
