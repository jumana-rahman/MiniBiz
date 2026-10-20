import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getPlanLimits } from "@/lib/subscription";
import { Role, InvoiceStatus } from "@/../src/generated/prisma/client";

const schema = z.object({
  companyId: z.string().min(1),
  customerId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  currency: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
  tax: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
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
  const invoices = await prisma.invoice.findMany({
    where: { companyId },
    include: { customer: true, invoiceItems: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invoices });
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
  const { companyId, customerId, invoiceNumber, currency, notes, items, tax, discount } = parsed.data;
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (membership.role === Role.VIEWER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
  if (!customer) {
    return NextResponse.json({ error: "Invalid customer" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const count = await prisma.invoice.count({ where: { companyId } });
  const limits = getPlanLimits(company.subscriptionPlan);
  if (count >= limits.invoices) {
    return NextResponse.json({ error: "Subscription limit exceeded" }, { status: 403 });
  }

  let subtotal = 0;
  const lineItems = items.map((item) => {
    const amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
    subtotal += amount;
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount,
    };
  });

  const taxVal = tax || 0;
  const discountVal = discount || 0;
  const total = Math.round((subtotal + taxVal - discountVal) * 100) / 100;

  try {
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        customerId,
        invoiceNumber,
        status: InvoiceStatus.DRAFT,
        subtotal,
        tax: taxVal,
        discount: discountVal,
        total,
        currency: currency || "USD",
        notes: notes || null,
        invoiceItems: {
          create: lineItems,
        },
      },
      include: { invoiceItems: true },
    });
    await prisma.company.update({
      where: { id: companyId },
      data: { invoicesCount: { increment: 1 } },
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Invoice number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
