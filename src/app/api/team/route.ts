import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/plans"
import { Role } from "@/generated/prisma/enums"
import { teamInviteSchema } from "@/lib/validation"
import { requireTenant } from "@/lib/tenant"
import { OWNER_ROLES } from "@/lib/permissions"
import {
  badRequest,
  conflict,
  errorResponse,
  forbidden,
  notFound,
  readJson,
  unauthorized,
} from "@/lib/http"

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get("companyId")
    // SRS 3.1 / 3.2 / 3.3 — team membership is an Owner-only area.
    const membership = await requireTenant(session.user.id, companyId, OWNER_ROLES)

    const members = await prisma.membership.findMany({
      where: { companyId: membership.companyId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    })

    return NextResponse.json({
      members: members.map((m) => ({
        membershipId: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        createdAt: m.createdAt,
      })),
      viewerRole: membership.role,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const body = await readJson(req)
    const parsed = teamInviteSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest()
    }
    const { companyId, email, role } = parsed.data

    const membership = await requireTenant(session.user.id, companyId, OWNER_ROLES)
    const tenantId = membership.companyId

    const invitee = await prisma.user.findUnique({ where: { email } })
    if (!invitee) {
      return notFound("No account with that email. They must register first.")
    }

    const existing = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: invitee.id, companyId: tenantId } },
    })
    if (existing) {
      return conflict("That user is already a member")
    }

    const company = await prisma.company.findUnique({ where: { id: tenantId } })
    if (!company) {
      return forbidden()
    }
    const limits = getPlanLimits(company.subscriptionPlan)
    const seatCount = await prisma.membership.count({
      where: { companyId: tenantId, role: { in: [Role.STAFF, Role.VIEWER] } },
    })
    if (seatCount >= limits.seats) {
      return forbidden(
        "Plan seat limit reached. Upgrade your plan to add members.",
      )
    }

    const created = await prisma.membership.create({
      data: { userId: invitee.id, companyId: tenantId, role },
    })

    return NextResponse.json(
      {
        membershipId: created.id,
        userId: invitee.id,
        name: invitee.name,
        email: invitee.email,
        role: created.role,
      },
      { status: 201 },
    )
  } catch (e) {
    return errorResponse(e)
  }
}
