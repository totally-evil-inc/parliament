import { createServerFn } from "@tanstack/react-start"
import { generateDocumentPdfBase64 } from "@workspace/document-pdf"
import { z } from "zod"

const exportPdfInputSchema = z.object({
  document: z.unknown(),
  appTheme: z.enum(["light", "dark"]).optional().default("light"),
})

export const exportDocumentPdfServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => exportPdfInputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: document draft validation handled in render models
      const doc = data.document as any
      const base64 = await generateDocumentPdfBase64({
        document: doc,
        appTheme: data.appTheme,
      })

      return {
        success: true as const,
        base64,
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to generate PDF on server"
      return {
        success: false as const,
        error: errorMsg,
      }
    }
  })
