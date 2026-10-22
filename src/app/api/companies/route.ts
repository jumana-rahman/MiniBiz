import { NextResponse } from "next/server"
import { cookies, headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveWorkspace } from "@/lib/workspace"

/**
 * Cookie that remembers which workspace the user selected.
 *
 * It is httpOnly, so the browser never reads or writes it, and it only ever
 * holds a company id: the server re-checks the membership on every request
 * before the value is used.
 */
const WORKSPACE_COOKIE = "minibiz_workspace"

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const requestedParam = searchParams.get("active")?.trim()
  // An empty parameter means "no selection", not "the empty company".
  const requested = requestedParam ? requestedParam : null
  const remembered = (await cookies()).get(WORKSPACE_COOKIE)?.value

  // The active workspace is resolved from the caller's own memberships. A
  // company the user does not belong to can never be activated.
  const { active, workspaces } = await resolveWorkspace(
    session.user.id,
    requested ?? remembered,
  )

  if (requested && active?.id !== requested) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const platformAdmin = await prisma.platformAdmin.findUnique({
    where: { userId: session.user.id },
  })

  const response = NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
    isPlatformAdmin: Boolean(platformAdmin),
    activeCompanyId: active?.id ?? null,
    activeRole: active?.role ?? null,
    companies: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      plan: w.plan,
      role: w.role,
    })),
  })

  // Only a validated selection is remembered. An unknown id is rejected above
  // and never reaches the cookie.
  if (requested && active?.id === requested) {
    response.cookies.set(WORKSPACE_COOKIE, requested, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  return response
}
