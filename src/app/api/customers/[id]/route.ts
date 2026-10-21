import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Role } from "@/generated/prisma/enums"

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  companyId: z.string().min(1),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("companyId")
  if (!companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const customer = await prisma.customer.findFirst({
    where: { id, companyId },
  })
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ customer })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const { companyId, ...data } = parsed.data
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (membership.role === Role.VIEWER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({ where: { id, companyId } })
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
      return NextResponse.json({ error: result.error }, {
        status: result.status,
      })
    }
    return NextResponse.json({ customer: result.customer })
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Customer already exists" }, {
        status: 409,
      })
    }
    console.error("customer update failed:", e)
    return NextResponse.json({ error: "Failed to update customer" }, {
      status: 500,
    })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("companyId")
  if (!companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (membership.role !== Role.OWNER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({ where: { id, companyId } })
      if (!existing) {
        return { status: 404 as const, error: "Not found" }
      }
      await tx.customer.delete({ where: { id } })
      return { status: 200 as const, ok: true }
    })
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, {
        status: result.status,
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete a customer that has invoices" },
        { status: 409 },
      )
    }
    console.error("customer delete failed:", e)
    return NextResponse.json({ error: "Failed to delete customer" }, {
      status: 500,
    })
  }
}
