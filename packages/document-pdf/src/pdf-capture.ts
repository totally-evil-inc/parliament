import { pdf } from "@react-pdf/renderer"
import type { DocumentTemplate } from "@workspace/document/presentation"
import type {
  InvoiceRenderModel,
  ProposalRenderModel,
} from "@workspace/document/render"
import * as React from "react"
import {
  type DocumentHtmlModel,
  renderDocumentHtmlDocument,
} from "./document-html"
import { DocumentPdfDocument } from "./document-pdf-document"

const KNOWN_CHROME_PATHS = [
  typeof process !== "undefined" ? process.env?.CHROME_BIN : undefined,
  typeof process !== "undefined"
    ? process.env?.PUPPETEER_EXECUTABLE_PATH
    : undefined,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean) as string[]

let cachedChromeExecutable: string | null | undefined

export function findChromeExecutable(): string | null {
  if (typeof window !== "undefined") {
    return null
  }

  if (cachedChromeExecutable !== undefined) {
    return cachedChromeExecutable
  }

  try {
    const fs = require("node:fs")
    for (const candidate of KNOWN_CHROME_PATHS) {
      try {
        if (fs.existsSync(candidate)) {
          cachedChromeExecutable = candidate
          return candidate
        }
      } catch {
        // Continue searching
      }
    }
  } catch {
    // fs not available
  }

  cachedChromeExecutable = null
  return null
}

export type ContinuousPdfOptions = {
  model: DocumentHtmlModel
  template: DocumentTemplate
  title?: string
  fallbackToReactPdf?: boolean
  exactMeasurement?: boolean
}

export const MIN_HEIGHT_PX = 200
export const MAX_HEIGHT_PX = 50000

/**
 * Calculates a continuous height estimation for a given model.
 */
export function estimateDocumentHeight(model: DocumentHtmlModel): number {
  let height = 180
  for (const block of model.blocks) {
    switch (block.type) {
      case "partyHeader":
        height += 480
        break
      case "cover":
        height += block.variant === "minimal" ? 420 : 640
        break
      case "pricing": {
        const itemsCount = model.pricing?.items?.length || 1
        height += 320 + itemsCount * 85 + 200
        break
      }
      case "section":
        height += 280 + (block.lead ? 80 : 0)
        break
      case "columns":
        height +=
          160 +
          Math.ceil((block.items?.length || 1) / (block.columns || 2)) * 180
        break
      case "imageText":
        height += 440
        break
      case "imageCards":
        height +=
          140 +
          Math.ceil((block.items?.length || 1) / (block.columns || 2)) * 260
        break
      case "metrics":
        height +=
          140 +
          Math.ceil((block.items?.length || 1) / (block.columns || 3)) * 180
        break
      case "team":
        height +=
          140 +
          Math.ceil((block.items?.length || 1) / (block.columns || 3)) * 240
        break
      case "testimonials":
        height += 140 + (block.items?.length || 1) * 160
        break
      case "gallery":
        height +=
          120 +
          Math.ceil((block.images?.length || 1) / (block.columns || 2)) * 260
        break
      case "faq":
        height += 120 + (block.items?.length || 1) * 110
        break
      case "signature":
        height += 280
        break
      case "timeline":
        height += 260
        break
      case "richText":
        height += 240
        break
      default:
        height += 200
    }
    height += 32
  }
  const total = Math.ceil(height * 1.1) + 60
  return Math.max(MIN_HEIGHT_PX, Math.min(total, MAX_HEIGHT_PX))
}

const FAST_CHROME_FLAGS = [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-extensions",
  "--disable-default-apps",
  "--disable-translate",
  "--metrics-recording-only",
  "--mute-audio",
  "--hide-scrollbars",
  "--run-all-compositor-stages-before-draw",
  "--print-to-pdf-no-header",
]

/**
 * Generates a continuous, tall PDF matching the exact rendered content height.
 */
export async function captureContinuousPdf({
  model,
  template,
  title,
  fallbackToReactPdf = true,
  exactMeasurement = false,
}: ContinuousPdfOptions): Promise<Buffer> {
  // If running in browser, delegate directly to React-PDF fallback
  if (typeof window !== "undefined") {
    return generateReactPdfBufferFallback({ model, template })
  }

  const chromePath = findChromeExecutable()

  if (!chromePath) {
    if (fallbackToReactPdf) {
      // biome-ignore lint/suspicious/noConsole: fallback notification is intended
      console.warn(
        `[document-pdf] Headless Chrome executable not found for model ${model.id}; falling back to React-PDF renderer`
      )
      return generateReactPdfBufferFallback({ model, template })
    }
    throw new Error(
      "Headless Chrome executable was not found on the host system to capture continuous PDF."
    )
  }

  const fs = await import("node:fs")
  const os = await import("node:os")
  const path = await import("node:path")

  const rawHtml = renderDocumentHtmlDocument({
    model,
    template,
    title,
  })

  const tempDir = os.tmpdir()
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const measureHtmlPath = path.join(tempDir, `doc_measure_${runId}.html`)
  const printHtmlPath = path.join(tempDir, `doc_print_${runId}.html`)
  const outPdfPath = path.join(tempDir, `doc_out_${runId}.pdf`)

  try {
    let measuredHeight = estimateDocumentHeight(model)

    if (exactMeasurement) {
      const measureHtml = rawHtml.replace(
        "</body>",
        `<script>
          (async function() {
            try {
              if (document.fonts) await document.fonts.ready;
              const images = Array.from(document.images);
              await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));
            } catch (e) {}
            const el = document.querySelector(".document-print-canvas") || document.documentElement;
            const h = Math.ceil(Math.max(
              el.scrollHeight || 0,
              el.getBoundingClientRect().height || 0,
              document.body.scrollHeight || 0,
              document.documentElement.scrollHeight || 0
            ));
            console.error("MEASURED_HEIGHT:" + h);
          })();
        </script></body>`
      )

      fs.writeFileSync(measureHtmlPath, measureHtml, "utf-8")

      if (typeof Bun !== "undefined") {
        const measureProc = Bun.spawn(
          [
            chromePath,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--enable-logging=stderr",
            "--dump-dom",
            measureHtmlPath,
          ],
          {
            stdout: "pipe",
            stderr: "pipe",
          }
        )

        const measureStderr = await new Response(measureProc.stderr).text()
        await measureProc.exited

        const match = measureStderr.match(/MEASURED_HEIGHT:(\d+)/)
        if (match?.[1]) {
          const parsed = Number.parseInt(match[1], 10)
          if (!Number.isNaN(parsed) && parsed > 0) {
            measuredHeight = parsed
          }
        }
      }
    }

    // Bound measured height safely
    measuredHeight = Math.max(
      MIN_HEIGHT_PX,
      Math.min(measuredHeight, MAX_HEIGHT_PX)
    )

    // Render single continuous PDF page matching exact height
    const printHtml = rawHtml.replace(
      "@page {\n      size: 210mm auto;\n      margin: 0;\n    }",
      `@page {\n      size: 210mm ${measuredHeight}px;\n      margin: 0;\n    }`
    )

    fs.writeFileSync(printHtmlPath, printHtml, "utf-8")

    if (typeof Bun !== "undefined") {
      const printProc = Bun.spawn(
        [
          chromePath,
          ...FAST_CHROME_FLAGS,
          `--print-to-pdf=${outPdfPath}`,
          printHtmlPath,
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
        }
      )

      await printProc.exited
    }

    if (fs.existsSync(outPdfPath)) {
      return fs.readFileSync(outPdfPath)
    }

    throw new Error("Headless Chrome did not emit output PDF file.")
  } catch (err: unknown) {
    // biome-ignore lint/suspicious/noConsole: fallback notification is intended
    console.warn(
      `[document-pdf] Continuous PDF headless Chrome capture failed for model ${model.id}:`,
      err
    )

    if (fallbackToReactPdf) {
      return generateReactPdfBufferFallback({ model, template })
    }
    throw err
  } finally {
    try {
      if (fs.existsSync(measureHtmlPath)) fs.unlinkSync(measureHtmlPath)
    } catch {}
    try {
      if (fs.existsSync(printHtmlPath)) fs.unlinkSync(printHtmlPath)
    } catch {}
    try {
      if (fs.existsSync(outPdfPath)) fs.unlinkSync(outPdfPath)
    } catch {}
  }
}

/**
 * Generates a standard PDF Blob using React-PDF across both browser and server.
 */
export async function generateReactPdfBlob({
  model,
  template,
}: {
  model: ProposalRenderModel | InvoiceRenderModel
  template: DocumentTemplate
}): Promise<Blob> {
  const element = React.createElement(DocumentPdfDocument, {
    model,
    template,
  })
  // biome-ignore lint/suspicious/noExplicitAny: react-pdf accepts JSX Document element
  const pdfInstance = pdf(element as any)
  return await pdfInstance.toBlob()
}

/**
 * Fallback generator using React-PDF when headless Chrome is not available.
 */
export async function generateReactPdfBufferFallback({
  model,
  template,
}: {
  model: ProposalRenderModel | InvoiceRenderModel
  template: DocumentTemplate
}): Promise<Buffer> {
  const blob = await generateReactPdfBlob({ model, template })
  const arrayBuffer = await blob.arrayBuffer()
  if (typeof Buffer !== "undefined") {
    return Buffer.from(arrayBuffer)
  }
  // biome-ignore lint/suspicious/noExplicitAny: browser buffer fallback
  return new Uint8Array(arrayBuffer) as any
}
