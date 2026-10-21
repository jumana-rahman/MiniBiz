import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { registerCompanySchema, firstIssue } from "@/lib/validation"
import { badRequest, readJson, serverError, unauthorized } from "@/lib/http"

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "company"
  )
}

function isUniqueViolation(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  )
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return unauthorized()
  }

  const raw = await readJson(req)
  const parsed = registerCompanySchema.safeParse(raw)
  if (!parsed.success) {
    return badRequest(firstIssue(parsed.error))
  }

  const { companyName } = parsed.data
  const base = slugify(companyName)
  const userId = session.user.id

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug =
      attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`
    try {
      const company = await prisma.$transaction(async (tx) => {
        const created = await tx.company.create({
          data: {
            name: companyName,
            slug,
            subscriptionPlan: "TRIAL",
          },
        })
        await tx.membership.create({
          data: {
            userId,
            companyId: created.id,
            role: "OWNER",
          },
        })
        return created
      })
      return NextResponse.json({ ok: true, companyId: company.id })
    } catch (err) {
      if (isUniqueViolation(err) && attempt < 4) {
        continue
      }
      console.error("register-company failed:", err)
      return serverError("Could not create your company. Please try again.")
    }
  }

  return serverError("Could not create your company. Please try again.")
}
