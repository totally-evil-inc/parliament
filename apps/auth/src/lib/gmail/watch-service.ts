import { db, eq } from "@workspace/database"
import {
  emailThreadActivity,
  gmailWatchSubscription,
} from "@workspace/database/schema"
import { logger } from "@workspace/logger"
import { getValidGoogleAccessToken } from "./client"

export interface RegisterWatchOptions {
  userId: string
  userEmail: string
  topicName?: string
}

export interface WatchResponse {
  historyId: string
  expiration: string
}

/**
 * Registers a real-time Google Cloud Pub/Sub watch on the user's Gmail mailbox using gmail.metadata
 */
export async function registerGmailWatch(
  options: RegisterWatchOptions
): Promise<WatchResponse> {
  const accessToken = await getValidGoogleAccessToken(options.userId)
  const topicName =
    options.topicName ||
    process.env.GMAIL_PUBSUB_TOPIC ||
    "projects/parliament-app/topics/gmail-events"

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/watch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName,
        labelIds: ["INBOX"],
        labelFilterBehavior: "INCLUDE",
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    logger.error(
      { status: res.status, errText, userId: options.userId },
      "Failed to register Gmail watch"
    )
    throw new Error(`Gmail watch error: ${res.statusText}`)
  }

  const data = (await res.json()) as WatchResponse
  const expDate = new Date(Number.parseInt(data.expiration, 10))

  // Persist or update subscription in database
  const existing = await db
    .select()
    .from(gmailWatchSubscription)
    .where(eq(gmailWatchSubscription.userId, options.userId))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(gmailWatchSubscription)
      .set({
        historyId: data.historyId,
        expiration: expDate,
        topicName,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(gmailWatchSubscription.id, existing[0].id))
  } else {
    await db.insert(gmailWatchSubscription).values({
      userId: options.userId,
      userEmail: options.userEmail,
      historyId: data.historyId,
      expiration: expDate,
      topicName,
      status: "active",
    })
  }

  logger.info(
    { userId: options.userId, historyId: data.historyId, expiration: expDate },
    "Successfully registered Gmail watch subscription"
  )

  return data
}

/**
 * Decodes and processes a Google Cloud Pub/Sub push notification payload (metadata only)
 */
export async function processPubSubNotification(pubSubBody: {
  message?: {
    data?: string
    messageId?: string
    publishTime?: string
  }
}) {
  if (!pubSubBody?.message?.data) {
    logger.warn({ pubSubBody }, "Empty Pub/Sub notification payload received")
    return { processed: false, reason: "Missing message.data" }
  }

  const decodedString = Buffer.from(pubSubBody.message.data, "base64").toString(
    "utf-8"
  )
  let eventData: { emailAddress?: string; historyId?: string }

  try {
    eventData = JSON.parse(decodedString)
  } catch (err) {
    logger.error(
      { err, decodedString },
      "Failed to parse Pub/Sub notification JSON"
    )
    return { processed: false, reason: "Invalid JSON payload" }
  }

  const { emailAddress, historyId } = eventData
  if (!emailAddress || !historyId) {
    logger.warn(
      { eventData },
      "Incomplete Pub/Sub push notification event data"
    )
    return { processed: false, reason: "Missing emailAddress or historyId" }
  }

  // Find active watch subscription for email address
  const subs = await db
    .select()
    .from(gmailWatchSubscription)
    .where(eq(gmailWatchSubscription.userEmail, emailAddress))
    .limit(1)

  if (subs.length === 0) {
    logger.info(
      { emailAddress, historyId },
      "Received Pub/Sub notification for unmapped user email"
    )
    return { processed: false, reason: "User email subscription not found" }
  }

  const subscription = subs[0]

  // Record metadata activity event without reading email body
  await db.insert(emailThreadActivity).values({
    userId: subscription.userId,
    threadId: `thread_${historyId}`,
    messageId: pubSubBody.message.messageId,
    fromEmail: emailAddress,
    subject: "Metadata Push Notification",
    activityType: "inbound_event",
    status: "processed",
    metadata: {
      historyId,
      publishTime: pubSubBody.message.publishTime,
    },
  })

  // Update subscription historyId marker
  await db
    .update(gmailWatchSubscription)
    .set({
      historyId,
      updatedAt: new Date(),
    })
    .where(eq(gmailWatchSubscription.id, subscription.id))

  logger.info(
    { userId: subscription.userId, emailAddress, historyId },
    "Successfully processed Gmail metadata Pub/Sub notification"
  )

  return { processed: true, userId: subscription.userId, historyId }
}
