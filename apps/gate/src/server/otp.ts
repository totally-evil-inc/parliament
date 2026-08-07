import { and, db, desc, eq, isNull, schema } from "@workspace/database"
import { logger } from "@workspace/logger"

export type SendOtpResult = {
  success: true
  message: string
}

export type VerifyOtpResult =
  | { success: true }
  | { success: false; reason: "invalid_or_expired" }

export function generateOtpCode(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  const code = (array[0] % 1000000).toString().padStart(6, "0")
  return code
}

export async function sendOtp(
  publicLinkId: string,
  email: string
): Promise<SendOtpResult> {
  const code = generateOtpCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

  const [row] = await db
    .insert(schema.publicLinkOtp)
    .values({
      publicLinkId,
      email,
      code,
      expiresAt,
    })
    .returning()

  logger.info(
    {
      event: "otp.sent",
      publicLinkId,
      email,
      otpId: row?.id,
      expiresAt: expiresAt.toISOString(),
      timestamp: new Date().toISOString(),
    },
    "OTP generated and stored for verification"
  )

  return {
    success: true,
    message: "OTP sent",
  }
}

export async function verifyOtp(
  publicLinkId: string,
  email: string,
  code: string
): Promise<VerifyOtpResult> {
  const now = new Date()

  const [row] = await db
    .select()
    .from(schema.publicLinkOtp)
    .where(
      and(
        eq(schema.publicLinkOtp.publicLinkId, publicLinkId),
        eq(schema.publicLinkOtp.email, email),
        eq(schema.publicLinkOtp.code, code),
        isNull(schema.publicLinkOtp.verifiedAt)
      )
    )
    .orderBy(desc(schema.publicLinkOtp.createdAt))
    .limit(1)

  if (!row) {
    logger.warn(
      {
        event: "otp.verify_failed",
        publicLinkId,
        email,
        reason: "code_not_found_or_already_verified",
        timestamp: now.toISOString(),
      },
      "OTP verification failed: code not found or already verified"
    )
    return { success: false, reason: "invalid_or_expired" }
  }

  if (row.expiresAt.getTime() <= now.getTime()) {
    logger.warn(
      {
        event: "otp.verify_failed",
        publicLinkId,
        email,
        reason: "code_expired",
        expiresAt: row.expiresAt.toISOString(),
        timestamp: now.toISOString(),
      },
      "OTP verification failed: code expired"
    )
    return { success: false, reason: "invalid_or_expired" }
  }

  await db
    .update(schema.publicLinkOtp)
    .set({
      verifiedAt: now,
    })
    .where(eq(schema.publicLinkOtp.id, row.id))

  logger.info(
    {
      event: "otp.verified",
      publicLinkId,
      email,
      otpId: row.id,
      timestamp: now.toISOString(),
    },
    "OTP verified successfully"
  )

  return { success: true }
}
