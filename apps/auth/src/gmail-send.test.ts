import { describe, expect, it } from "bun:test"
import { app } from "./index"
import {
  buildRfc2822RawMessage,
  validatePdfAttachment,
} from "./lib/gmail/send-service"

describe("Gmail Direct Send & Draft Backend", () => {
  it("builds RFC 2822 raw message without attachment as multipart/alternative", () => {
    const raw = buildRfc2822RawMessage({
      to: "client@example.com",
      subject: "Proposal Document",
      htmlText: "<h1>Hello Client</h1>",
      replyTo: "proposal-123@reply.parliament.app",
    })

    expect(raw).toBeDefined()
    expect(typeof raw).toBe("string")
    expect(raw.includes("+")).toBe(false)
    expect(raw.includes("/")).toBe(false)

    // Decode base64url back to verify MIME structure
    const decoded = Buffer.from(
      raw.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8")

    expect(decoded).toContain("Content-Type: multipart/alternative")
    expect(decoded).toContain("To: client@example.com")
    expect(decoded).toContain("Subject: Proposal Document")
    expect(decoded).toContain("Reply-To: proposal-123@reply.parliament.app")
    expect(decoded).not.toContain("multipart/mixed")
  })

  describe("validatePdfAttachment", () => {
    const validPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF")
    const validPdfBase64 = validPdfBuffer.toString("base64")

    it("validates and formats a valid PDF attachment", () => {
      const result = validatePdfAttachment({
        filename: "Proposal Document (Final).pdf",
        mimeType: "application/pdf",
        content: validPdfBase64,
      })

      expect(result.filename).toBe("Proposal_Document_Final_.pdf")
      expect(result.wrappedContent).toBeDefined()
    })

    it("ensures .pdf extension if missing", () => {
      const result = validatePdfAttachment({
        filename: "invoice-october",
        mimeType: "application/pdf",
        content: validPdfBase64,
      })

      expect(result.filename).toBe("invoice-october.pdf")
    })

    it("throws error for non-pdf mimeType", () => {
      expect(() =>
        validatePdfAttachment({
          filename: "test.pdf",
          // biome-ignore lint/suspicious/noExplicitAny: test bad input
          mimeType: "text/plain" as any,
          content: validPdfBase64,
        })
      ).toThrow("Invalid attachment MIME type")
    })

    it("throws error when payload is missing %PDF- signature", () => {
      const invalidContent = Buffer.from("NOT A PDF DOCUMENT").toString(
        "base64"
      )
      expect(() =>
        validatePdfAttachment({
          filename: "fake.pdf",
          mimeType: "application/pdf",
          content: invalidContent,
        })
      ).toThrow("%PDF-")
    })

    it("throws error for empty content", () => {
      expect(() =>
        validatePdfAttachment({
          filename: "empty.pdf",
          mimeType: "application/pdf",
          content: "   ",
        })
      ).toThrow("Attachment content is empty")
    })
  })

  describe("buildRfc2822RawMessage with PDF attachment", () => {
    const validPdfBuffer = Buffer.from(
      "%PDF-1.4 " + "x".repeat(200) + "\n%%EOF"
    )
    const validPdfBase64 = validPdfBuffer.toString("base64")

    it("constructs nested multipart/mixed and multipart/alternative with wrapped base64 lines", () => {
      const raw = buildRfc2822RawMessage({
        to: "client@example.com",
        subject: "Your Finalized Proposal",
        htmlText: "<p>Please find attached your proposal.</p>",
        attachment: {
          filename: "North_Proposal.pdf",
          mimeType: "application/pdf",
          content: validPdfBase64,
        },
      })

      expect(raw).toBeDefined()
      const decoded = Buffer.from(
        raw.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf-8")

      expect(decoded).toContain("Content-Type: multipart/mixed; boundary=")
      expect(decoded).toContain(
        "Content-Type: multipart/alternative; boundary="
      )
      expect(decoded).toContain(
        'Content-Type: application/pdf; name="North_Proposal.pdf"'
      )
      expect(decoded).toContain(
        'Content-Disposition: attachment; filename="North_Proposal.pdf"'
      )
      expect(decoded).toContain("Content-Transfer-Encoding: base64")

      // Verify line wrapping (no lines in base64 attachment block exceed 76 characters)
      const lines = decoded.split("\r\n")
      const attachmentSectionStart = lines.findIndex((l) =>
        l.includes('Content-Disposition: attachment; filename="North_Proposal.pdf"')
      )
      expect(attachmentSectionStart).toBeGreaterThan(-1)

      const attachmentBodyLines = lines.slice(attachmentSectionStart + 3, -1)
      for (const line of attachmentBodyLines) {
        if (!line.startsWith("--")) {
          expect(line.length).toBeLessThanOrEqual(76)
        }
      }
    })
  })

  it("returns 401 when sending without authentication session", async () => {
    const res = await app.request("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "client@example.com",
        subject: "Test",
        htmlText: "<p>Test</p>",
      }),
    })

    expect(res.status).toBe(401)
  })

  it("returns 401 when creating draft without authentication session", async () => {
    const res = await app.request("/api/gmail/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "client@example.com",
        subject: "Draft Test",
        htmlText: "<p>Draft Content</p>",
      }),
    })

    expect(res.status).toBe(401)
  })
})
