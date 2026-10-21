import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/generated/prisma/enums"

const updateSchema = z.object({
  companyId: z.string().min(1),
  role: z.enum(["OWNER", "STAFF", "VIEWER"]),
})

async function getOwnerMembership(userId: string, companyId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, companyId },
  })
  if (!membership) return null
  if (membership.role !== Role.OWNER) return null
  return membership
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const { companyId, role } = parsed.data

  const caller = await getOwnerMembership(session.user.id, companyId)
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const target = await prisma.membership.findUnique({ where: { id } })
  if (!target || target.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (target.role === Role.OWNER && role !== Role.OWNER) {
    const owners = await prisma.membership.count({
      where: { companyId, role: Role.OWNER },
    })
    if (owners <= 1) {
      return NextResponse.json(
        { error: "A company must keep at least one Owner" },
        { status: 409 },
      )
    }
  }

  if (target.role !== Role.OWNER && role === Role.OWNER) {
    const owners = await prisma.membership.count({
      where: { companyId, role: Role.OWNER },
    })
    if (owners >= 1) {
      return NextResponse.json(
        { error: "This plan allows only one Owner per company" },
        { status: 409 },
      )
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

  const caller = await getOwnerMembership(session.user.id, companyId)
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const target = await prisma.membership.findUnique({ where: { id } })
  if (!target || target.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (target.role === Role.OWNER) {
    const owners = await prisma.membership.count({
      where: { companyId, role: Role.OWNER },
    })
    if (owners <= 1) {
      return NextResponse.json(
        { error: "A company must keep at least one Owner" },
        { status: 409 },
      )
    }
  }

  await prisma.membership.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
