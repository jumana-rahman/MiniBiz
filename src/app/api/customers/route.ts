import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getPlanLimits } from "@/lib/subscription";
import { Role } from "@/../src/generated/prisma/client";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  companyId: z.string().min(1),
});

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const customers = await prisma.customer.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { companyId, name, email, phone, address } = parsed.data;
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (membership.role === Role.VIEWER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const count = await prisma.customer.count({ where: { companyId } });
  const limits = getPlanLimits(company.subscriptionPlan);
  if (count >= limits.customers) {
    return NextResponse.json({ error: "Subscription limit exceeded" }, { status: 403 });
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        companyId,
        name,
        email,
        phone: phone || null,
        address: address || null,
      },
    });
    await prisma.company.update({
      where: { id: companyId },
      data: { customersCount: { increment: 1 } },
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Customer already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
