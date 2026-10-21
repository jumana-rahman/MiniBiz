import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/generated/prisma/enums"
import { customerUpdateSchema } from "@/lib/validation"
import { WRITE_ROLES, OWNER_ROLES } from "@/lib/permissions"
import { requireTenant } from "@/lib/tenant"
import {
  badRequest,
  conflict,
  errorResponse,
  forbidden,
  notFound,
  readJson,
  serverError,
  unauthorized,
} from "@/lib/http"

export async function GET(
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
    const membership = await requireTenant(session.user.id, companyId)

    const customer = await prisma.customer.findFirst({
      where: { id, companyId: membership.companyId },
    })
    if (!customer) {
      return notFound()
    }
    return NextResponse.json({ customer })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(
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
    const parsed = customerUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest()
    }
    const { companyId, ...data } = parsed.data
    const membership = await requireTenant(
      session.user.id,
      companyId,
      WRITE_ROLES,
    )
    const tenantId = membership.companyId

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.customer.findFirst({
          where: { id, companyId: tenantId },
        })
        if (!existing) {
          return { status: 404 as const, error: "Not found" }
        }
        const customer = await tx.customer.update({
          where: { id },
          data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.email !== undefined ? { email: data.email } : {}),
            ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
            ...(data.address !== undefined
              ? { address: data.address || null }
              : {}),
          },
        })
        return { status: 200 as const, customer }
      })
      if ("error" in result) {
        return notFound(result.error)
      }
      return NextResponse.json({ customer: result.customer })
    } catch (e: any) {
      if (e?.code === "P2002") {
        return conflict("Customer already exists")
      }
      console.error("customer update failed:", e)
      return serverError("Failed to update customer")
    }
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

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.customer.findFirst({
          where: { id, companyId: tenantId },
        })
        if (!existing) {
          return { status: 404 as const, error: "Not found" }
        }
        await tx.customer.delete({ where: { id } })
        return { status: 200 as const, ok: true }
      })
      if ("error" in result) {
        return notFound(result.error)
      }
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      if (e?.code === "P2003") {
        return conflict("Cannot delete a customer that has invoices")
      }
      console.error("customer delete failed:", e)
      return serverError("Failed to delete customer")
    }
  } catch (e) {
    return errorResponse(e)
  }
}
