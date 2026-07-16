import { Hono } from "hono"
import { setCookie } from "hono/cookie"
import { createHash, randomBytes } from "crypto"
import { db, schema, eq, and } from "@workspace/database"
import { auth } from "../lib/auth"

export const inviteRouter = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
    logContext: Record<string, any>
  }
}>()

// Invite User
inviteRouter.post("/", async (c) => {
  const url = new URL(c.req.url)
  url.pathname = "/api/auth/organization/invite-member"
  const rewrittenReq = new Request(url.toString(), {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: await c.req.blob(),
  })
  return auth.handler(rewrittenReq)
})

// Accept Invite
inviteRouter.get("/accept", async (c) => {
  const { id, token } = c.req.query()
  const commandUrl = Bun.env.COMMAND_SERVER_URL ?? "http://localhost:3000"
  const loginUrl = new URL(`${commandUrl}/auth/sign-in`)

  const logContext = c.get("logContext")
  if (logContext && id) {
    logContext.invitation_id = id
  }

  if (!id || !token) {
    loginUrl.searchParams.set("error", "missing_invite_id_or_token")
    return c.redirect(loginUrl.toString())
  }

  try {
    const hashedToken = createHash("sha256").update(token).digest("hex")

    const verificationRecords = await db
      .select()
      .from(schema.verification)
      .where(
        and(
          eq(schema.verification.identifier, `invitation:${id}`),
          eq(schema.verification.value, hashedToken)
        )
      )

    const verificationRecord = verificationRecords[0]
    if (!verificationRecord || verificationRecord.expiresAt < new Date()) {
      loginUrl.searchParams.set("error", "invalid_or_expired_invitation")
      return c.redirect(loginUrl.toString())
    }

    const invitations = await db
      .select()
      .from(schema.invitation)
      .where(eq(schema.invitation.id, id))

    const inv = invitations[0]
    if (!inv || inv.status !== "pending") {
      loginUrl.searchParams.set("error", "invitation_not_found_or_already_accepted")
      return c.redirect(loginUrl.toString())
    }

    // Delete verification record (single-use)
    await db
      .delete(schema.verification)
      .where(eq(schema.verification.id, verificationRecord.id))

    // Find or create user
    const users = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, inv.email))

    let userRecord = users[0]
    if (!userRecord) {
      const [newUser] = await db
        .insert(schema.user)
        .values({
          name: inv.email.split("@")[0],
          email: inv.email,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
      userRecord = newUser
    }

    // Add to organization membership
    const existingMemberships = await db
      .select()
      .from(schema.member)
      .where(
        and(
          eq(schema.member.userId, userRecord.id),
          eq(schema.member.organizationId, inv.organizationId)
        )
      )

    if (!existingMemberships.length) {
      await db.insert(schema.member).values({
        organizationId: inv.organizationId,
        userId: userRecord.id,
        role: inv.role || "member",
        createdAt: new Date(),
      })
    }

    // Mark invitation accepted
    await db
      .update(schema.invitation)
      .set({ status: "accepted" })
      .where(eq(schema.invitation.id, id))

    // Create session in database
    const sessionToken = randomBytes(32).toString("hex")
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.insert(schema.session).values({
      token: sessionToken,
      userId: userRecord.id,
      expiresAt: sessionExpiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: c.req.header("x-forwarded-for") || null,
      userAgent: c.req.header("user-agent") || null,
    })

    const authCookieDomain = Bun.env.AUTH_COOKIE_DOMAIN
    setCookie(c, "better-auth.session_token", sessionToken, {
      httpOnly: true,
      secure: Bun.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      expires: sessionExpiresAt,
      ...(authCookieDomain ? { domain: authCookieDomain } : {}),
    })

    return c.redirect(`${commandUrl}/`)
  } catch (err: any) {
    loginUrl.searchParams.set("error", err.message)
    return c.redirect(loginUrl.toString())
  }
})
