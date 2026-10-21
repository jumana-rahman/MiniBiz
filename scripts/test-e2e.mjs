import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const vitest = path.join(root, "node_modules", "vitest", "vitest.mjs")

const child = spawn(
  process.execPath,
  [vitest, "run", ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, MINIBIZ_E2E: "1" },
  },
)

child.on("exit", (code) => process.exit(code ?? 0))
