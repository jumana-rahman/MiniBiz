import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const companyName = body.companyName?.trim();
  if (!companyName) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .concat("-" + Math.random().toString(36).slice(2, 6));

  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug,
      subscriptionPlan: "TRIAL",
    },
  });

  await prisma.membership.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      role: "OWNER",
    },
  });

  return NextResponse.json({ ok: true, companyId: company.id });
}
