import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/plans"
import { readPage, totalPages } from "@/lib/pagination"
import { customerCreateSchema } from "@/lib/validation"
import { WRITE_ROLES } from "@/lib/permissions"
import { requireTenant } from "@/lib/tenant"
import {
  badRequest,
  conflict,
  errorResponse,
  forbidden,
  readJson,
  serverError,
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
    const membership = await requireTenant(session.user.id, companyId)
    const tenantId = membership.companyId

    const { page, pageSize } = readPage(searchParams)
    const q = searchParams.get("q")?.trim()
    const where = {
      companyId: tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ])
    return NextResponse.json({
      customers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: totalPages(total, pageSize),
      },
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
    const parsed = customerCreateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest()
    }
    const { companyId, name, email, phone, address } = parsed.data

    // The tenant is resolved from the caller's membership, never from the
    // body, and a Viewer may not write.
    const membership = await requireTenant(
      session.user.id,
      companyId,
      WRITE_ROLES,
    )
    const tenantId = membership.companyId

    const company = await prisma.company.findUnique({ where: { id: tenantId } })
    if (!company) {
      return forbidden()
    }
    const count = await prisma.customer.count({
      where: { companyId: tenantId },
    })
    const limits = getPlanLimits(company.subscriptionPlan)
    if (count >= limits.customers) {
      return forbidden("Subscription limit exceeded")
    }

    try {
      const customer = await prisma.customer.create({
        data: {
          companyId: tenantId,
          name,
          email,
          phone: phone || null,
          address: address || null,
        },
      })
      return NextResponse.json({ customer }, { status: 201 })
    } catch (e: any) {
      if (e.code === "P2002") {
        return conflict("Customer already exists")
      }
      return serverError("Failed to create customer")
    }
  } catch (e) {
    return errorResponse(e)
  }
}
