import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1),
  plan: z.enum(["TRIAL", "BASIC", "PRO"]),
});

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = await prisma.platformAdmin.findUnique({ where: { userId: session.user.id } });
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companies = await prisma.company.findMany({
    include: { memberships: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ companies });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = await prisma.platformAdmin.findUnique({ where: { userId: session.user.id } });
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { companyId, plan } = parsed.data;
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { subscriptionPlan: plan },
  });
  return NextResponse.json({ company });
}
