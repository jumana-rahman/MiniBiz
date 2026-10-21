import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/subscription"
import { Role } from "@/generated/prisma/enums"

const inviteSchema = z.object({
  companyId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["STAFF", "VIEWER"]),
})

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
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

  const members = await prisma.membership.findMany({
    where: { companyId },
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
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const { companyId, email, role } = parsed.data

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
    include: { company: true },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (membership.role !== Role.OWNER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const invitee = await prisma.user.findUnique({ where: { email } })
  if (!invitee) {
    return NextResponse.json(
      { error: "No account with that email. They must register first." },
      { status: 404 },
    )
  }

  const existing = await prisma.membership.findUnique({
    where: { userId_companyId: { userId: invitee.id, companyId } },
  })
  if (existing) {
    return NextResponse.json({ error: "That user is already a member" }, {
      status: 409,
    })
  }

  const limits = getPlanLimits(membership.company.subscriptionPlan)
  const seatCount = await prisma.membership.count({
    where: { companyId, role: { in: [Role.STAFF, Role.VIEWER] } },
  })
  if (seatCount >= limits.seats) {
    return NextResponse.json(
      { error: "Plan seat limit reached. Upgrade your plan to add members." },
      { status: 403 },
    )
  }

  const created = await prisma.membership.create({
    data: { userId: invitee.id, companyId, role },
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
}
