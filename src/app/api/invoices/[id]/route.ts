import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Role, InvoiceStatus } from "@/../src/generated/prisma/client";

const updateSchema = z.object({
  companyId: z.string().min(1),
  status: z.enum(["DRAFT", "ISSUED"]).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).optional(),
  tax: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
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
  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: { customer: true, invoiceItems: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ invoice });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { companyId, status, notes, items, tax, discount } = parsed.data;
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (membership.role === Role.VIEWER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.invoice.findFirst({ where: { id, companyId }, include: { invoiceItems: true } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === InvoiceStatus.ISSUED) {
    return NextResponse.json({ error: "Invoice is locked" }, { status: 403 });
  }

  if (status === InvoiceStatus.ISSUED) {
    const now = new Date();
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.ISSUED,
        issuedAt: now,
        lockedAt: now,
        notes: notes !== undefined ? notes : existing.notes,
      },
      include: { invoiceItems: true },
    });
    return NextResponse.json({ invoice });
  }

  if (items && items.length > 0) {
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    let subtotal = 0;
    const lineItems = items.map((item) => {
      const amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
      subtotal += amount;
      return {
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount,
      };
    });
    const taxVal = tax !== undefined ? tax : existing.tax.toNumber();
    const discountVal = discount !== undefined ? discount : existing.discount.toNumber();
    const total = Math.round((subtotal + taxVal - discountVal) * 100) / 100;
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        subtotal,
        tax: taxVal,
        discount: discountVal,
        total,
        notes: notes !== undefined ? notes : existing.notes,
        invoiceItems: { create: lineItems },
      },
      include: { invoiceItems: true },
    });
    return NextResponse.json({ invoice });
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      notes: notes !== undefined ? notes : existing.notes,
      tax: tax !== undefined ? tax : existing.tax,
      discount: discount !== undefined ? discount : existing.discount,
    },
    include: { invoiceItems: true },
  });
  return NextResponse.json({ invoice });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
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
  if (membership.role !== Role.OWNER && membership.role !== Role.STAFF) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.invoice.findFirst({ where: { id, companyId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === InvoiceStatus.ISSUED) {
    return NextResponse.json({ error: "Invoice is locked" }, { status: 403 });
  }

  await prisma.invoice.delete({ where: { id } });
  await prisma.company.update({
    where: { id: companyId },
    data: { invoicesCount: { decrement: 1 } },
  });
  return NextResponse.json({ ok: true });
}
