import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/generated/prisma/enums"
import { teamRoleUpdateSchema } from "@/lib/validation"
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const { id } = await params
    const body = await readJson(req)
    const parsed = teamRoleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest()
    }
    const { companyId, role } = parsed.data

    // Only an Owner may change roles.
    const membership = await requireTenant(session.user.id, companyId, OWNER_ROLES)
    const tenantId = membership.companyId

    const target = await prisma.membership.findUnique({ where: { id } })
    if (!target || target.companyId !== tenantId) {
      return notFound()
    }

    if (target.role === Role.OWNER && role !== Role.OWNER) {
      const owners = await prisma.membership.count({
        where: { companyId: tenantId, role: Role.OWNER },
      })
      if (owners <= 1) {
        return conflict("A company must keep at least one Owner")
      }
    }

    if (target.role !== Role.OWNER && role === Role.OWNER) {
      const owners = await prisma.membership.count({
        where: { companyId: tenantId, role: Role.OWNER },
      })
      if (owners >= 1) {
        return conflict("This plan allows only one Owner per company")
      }
    }

    const updated = await prisma.membership.update({
      where: { id },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      membershipId: updated.id,
      userId: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get("companyId")
    const membership = await requireTenant(session.user.id, companyId, OWNER_ROLES)
    const tenantId = membership.companyId

    const target = await prisma.membership.findUnique({ where: { id } })
    if (!target || target.companyId !== tenantId) {
      return notFound()
    }

    if (target.role === Role.OWNER) {
      const owners = await prisma.membership.count({
        where: { companyId: tenantId, role: Role.OWNER },
      })
      if (owners <= 1) {
        return conflict("A company must keep at least one Owner")
      }
    }

    await prisma.membership.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
