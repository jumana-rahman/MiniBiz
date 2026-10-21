import "dotenv/config"
import { prisma } from "../src/lib/prisma"

const KEEP_COMPANIES = ["acme-bloom", "lumen-works"]
const KEEP_USERS = [
  "admin@minibiz.test",
  "owner@acmebloom.test",
  "staff@acmebloom.test",
  "viewer@acmebloom.test",
  "owner@lumenworks.test",
]

async function main() {
  const companies = await prisma.company.findMany({
    where: { slug: { notIn: KEEP_COMPANIES } },
    select: { id: true, name: true },
  })
  for (const company of companies) {
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({
        where: { invoice: { companyId: company.id } },
      }),
      prisma.invoice.deleteMany({ where: { companyId: company.id } }),
      prisma.customer.deleteMany({ where: { companyId: company.id } }),
      prisma.membership.deleteMany({ where: { companyId: company.id } }),
      prisma.company.delete({ where: { id: company.id } }),
    ])
  }

  const users = await prisma.user.findMany({
    where: { email: { notIn: KEEP_USERS } },
    select: { id: true, email: true },
  })
  for (const user of users) {
    await prisma.platformAdmin.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
  }

  console.log(
    `Removed ${companies.length} test companies and ${users.length} test users.`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
