import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const vitest = path.join(root, "node_modules", "vitest", "vitest.mjs")

console.log(
  "\n[e2e] MiniBiz end-to-end suite\n" +
    "[e2e] A production server is started automatically on a free port.\n" +
    "[e2e] Run `npm run seed` first if the database is empty.\n",
)

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
