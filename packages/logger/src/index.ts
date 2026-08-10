import pino from "pino"

const isProduction = process.env.NODE_ENV === "production"

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() }
    },
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        },
      }),
})

export type Logger = typeof logger

export interface WideEventEnvelope {
  event: string
  durationMs?: number
  organizationId?: string
  userId?: string
  entityId?: string
  outcome: "success" | "failure" | "error"
  metadata?: Record<string, unknown>
  error?: {
    code: string
    message: string
    stack?: string
  }
}

export function logWideEvent(envelope: WideEventEnvelope) {
  logger.info(
    {
      type: "wide_event",
      timestamp: new Date().toISOString(),
      ...envelope,
    },
    `Wide Event: ${envelope.event}`
  )
}
