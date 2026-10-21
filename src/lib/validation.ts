import { z } from "zod"

/** Every write payload identifies the company it acts on. */
const companyIdField = z.string().trim().min(1, "companyId is required")

export const customerCreateSchema = z.object({
  companyId: companyIdField,
  name: z.string().trim().min(1, "Contact name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
})

export const customerUpdateSchema = z.object({
  companyId: companyIdField,
  name: z.string().trim().min(1, "Contact name is required").optional(),
  email: z.string().trim().email("Enter a valid email address").optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
})

const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "Item description is required").max(500),
  quantity: z
    .number()
    .finite()
    .positive("Quantity must be positive")
    .max(1_000_000),
  unitPrice: z
    .number()
    .finite()
    .nonnegative("Unit price cannot be negative")
    .max(1_000_000_000),
})

export const invoiceCreateSchema = z.object({
  companyId: companyIdField,
  customerId: z.string().trim().min(1, "customerId is required"),
  invoiceNumber: z
    .string()
    .trim()
    .min(1, "Invoice number is required")
    .max(50, "Invoice number must be 50 characters or fewer")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9\-_/#. ]*$/,
      "Invoice number contains invalid characters",
    ),
  invoiceDate: z.coerce.date().optional(),
  currency: z.string().max(10).optional(),
  notes: z.string().max(2000).optional(),
  items: z
    .array(invoiceLineItemSchema)
    .min(1, "At least one line item is required")
    .max(100),
  tax: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  discount: z.number().finite().nonnegative().max(1_000_000_000).optional(),
})

export const invoiceUpdateSchema = z.object({
  companyId: companyIdField,
  status: z.enum(["DRAFT", "ISSUED"]).optional(),
  notes: z.string().max(2000).optional(),
  invoiceDate: z.coerce.date().optional(),
  items: z
    .array(invoiceLineItemSchema)
    .min(1, "At least one line item is required")
    .max(100)
    .optional(),
  tax: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  discount: z.number().finite().nonnegative().max(1_000_000_000).optional(),
})

export const teamInviteSchema = z.object({
  companyId: companyIdField,
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum(["STAFF", "VIEWER"]),
})

export const teamRoleUpdateSchema = z.object({
  companyId: companyIdField,
  role: z.enum(["OWNER", "STAFF", "VIEWER"]),
})

export const planChangeSchema = z.object({
  companyId: companyIdField,
  plan: z.enum(["TRIAL", "BASIC", "PRO"]),
})

export const registerCompanySchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(100, "Company name must be 100 characters or fewer"),
})

/** The first validation message, so the client can show something useful. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input"
}

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>
export type TeamInviteInput = z.infer<typeof teamInviteSchema>
export type PlanChangeInput = z.infer<typeof planChangeSchema>
