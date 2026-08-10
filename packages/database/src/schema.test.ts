import { describe, expect, it } from "bun:test"
import { getTableColumns, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/pg-core"
import {
  invoiceAcceptance,
  organization,
  proposalAcceptance,
  publicLinkOtp,
} from "./index"
import * as schema from "./schema"

describe("Milestone 1 schema extensions", () => {
  it("exports new and modified schema tables from schema index and package root", () => {
    expect(schema.proposalAcceptance).toBeDefined()
    expect(schema.invoiceAcceptance).toBeDefined()
    expect(schema.organization).toBeDefined()
    expect(schema.publicLinkOtp).toBeDefined()

    expect(proposalAcceptance).toBeDefined()
    expect(invoiceAcceptance).toBeDefined()
    expect(organization).toBeDefined()
    expect(publicLinkOtp).toBeDefined()
  })

  it("has correct table names", () => {
    expect(getTableName(proposalAcceptance)).toBe("proposal_acceptance")
    expect(getTableName(invoiceAcceptance)).toBe("invoice_acceptance")
    expect(getTableName(organization)).toBe("organization")
    expect(getTableName(publicLinkOtp)).toBe("public_link_otp")
  })

  it("defines updated columns, nullability, and defaults for proposalAcceptance", () => {
    const columns = getTableColumns(proposalAcceptance)

    // Column names
    expect(columns.id.name).toBe("id")
    expect(columns.proposalSnapshotId.name).toBe("proposal_snapshot_id")
    expect(columns.publicLinkId.name).toBe("public_link_id")
    expect(columns.signerName.name).toBe("signer_name")
    expect(columns.signerEmail.name).toBe("signer_email")
    expect(columns.signatureText.name).toBe("signature_text")
    expect(columns.signatureImage.name).toBe("signature_image")
    expect(columns.otpVerified.name).toBe("otp_verified")
    expect(columns.agreedTerms.name).toBe("agreed_terms")
    expect(columns.acceptedAt.name).toBe("accepted_at")
    expect(columns.ipAddress.name).toBe("ip_address")
    expect(columns.userAgent.name).toBe("user_agent")

    // Column nullability
    expect(columns.id.notNull).toBe(true)
    expect(columns.proposalSnapshotId.notNull).toBe(true)
    expect(columns.publicLinkId.notNull).toBe(true)
    expect(columns.signerName.notNull).toBe(true)
    expect(columns.signerEmail.notNull).toBe(true)
    expect(columns.signatureText.notNull).toBe(false)
    expect(columns.signatureImage.notNull).toBe(false)
    expect(columns.otpVerified.notNull).toBe(true)
    expect(columns.agreedTerms.notNull).toBe(true)
    expect(columns.acceptedAt.notNull).toBe(true)
    expect(columns.ipAddress.notNull).toBe(false)
    expect(columns.userAgent.notNull).toBe(false)

    // Column defaults
    expect(columns.id.hasDefault).toBe(true)
    expect(columns.proposalSnapshotId.hasDefault).toBe(false)
    expect(columns.publicLinkId.hasDefault).toBe(false)
    expect(columns.signerName.hasDefault).toBe(false)
    expect(columns.signerEmail.hasDefault).toBe(false)
    expect(columns.signatureText.hasDefault).toBe(false)
    expect(columns.signatureImage.hasDefault).toBe(false)
    expect(columns.otpVerified.hasDefault).toBe(true)
    expect(columns.otpVerified.default).toBe(false)
    expect(columns.agreedTerms.hasDefault).toBe(false)
    expect(columns.acceptedAt.hasDefault).toBe(true)
    expect(columns.ipAddress.hasDefault).toBe(false)
    expect(columns.userAgent.hasDefault).toBe(false)
  })

  it("defines valid columns, nullability, and defaults for invoiceAcceptance", () => {
    const columns = getTableColumns(invoiceAcceptance)

    // Column names
    expect(columns.id.name).toBe("id")
    expect(columns.invoiceSnapshotId.name).toBe("invoice_snapshot_id")
    expect(columns.publicLinkId.name).toBe("public_link_id")
    expect(columns.signerName.name).toBe("signer_name")
    expect(columns.signerEmail.name).toBe("signer_email")
    expect(columns.signatureText.name).toBe("signature_text")
    expect(columns.signatureImage.name).toBe("signature_image")
    expect(columns.otpVerified.name).toBe("otp_verified")
    expect(columns.agreedTerms.name).toBe("agreed_terms")
    expect(columns.acceptedAt.name).toBe("accepted_at")
    expect(columns.ipAddress.name).toBe("ip_address")
    expect(columns.userAgent.name).toBe("user_agent")

    // Column nullability
    expect(columns.id.notNull).toBe(true)
    expect(columns.invoiceSnapshotId.notNull).toBe(true)
    expect(columns.publicLinkId.notNull).toBe(true)
    expect(columns.signerName.notNull).toBe(true)
    expect(columns.signerEmail.notNull).toBe(true)
    expect(columns.signatureText.notNull).toBe(false)
    expect(columns.signatureImage.notNull).toBe(false)
    expect(columns.otpVerified.notNull).toBe(true)
    expect(columns.agreedTerms.notNull).toBe(true)
    expect(columns.acceptedAt.notNull).toBe(true)
    expect(columns.ipAddress.notNull).toBe(false)
    expect(columns.userAgent.notNull).toBe(false)

    // Column defaults
    expect(columns.id.hasDefault).toBe(true)
    expect(columns.invoiceSnapshotId.hasDefault).toBe(false)
    expect(columns.publicLinkId.hasDefault).toBe(false)
    expect(columns.signerName.hasDefault).toBe(false)
    expect(columns.signerEmail.hasDefault).toBe(false)
    expect(columns.signatureText.hasDefault).toBe(false)
    expect(columns.signatureImage.hasDefault).toBe(false)
    expect(columns.otpVerified.hasDefault).toBe(true)
    expect(columns.otpVerified.default).toBe(false)
    expect(columns.agreedTerms.hasDefault).toBe(false)
    expect(columns.acceptedAt.hasDefault).toBe(true)
    expect(columns.ipAddress.hasDefault).toBe(false)
    expect(columns.userAgent.hasDefault).toBe(false)
  })

  it("defines updated columns, nullability, and defaults for organization table", () => {
    const columns = getTableColumns(organization)

    // Column names
    expect(columns.id.name).toBe("id")
    expect(columns.name.name).toBe("name")
    expect(columns.slug.name).toBe("slug")
    expect(columns.logo.name).toBe("logo")
    expect(columns.createdAt.name).toBe("created_at")
    expect(columns.metadata.name).toBe("metadata")
    expect(columns.paymentLinkUrl.name).toBe("payment_link_url")

    // Column nullability
    expect(columns.id.notNull).toBe(true)
    expect(columns.name.notNull).toBe(true)
    expect(columns.slug.notNull).toBe(true)
    expect(columns.logo.notNull).toBe(false)
    expect(columns.createdAt.notNull).toBe(true)
    expect(columns.metadata.notNull).toBe(false)
    expect(columns.paymentLinkUrl.notNull).toBe(false)

    // Column defaults & constraints
    expect(columns.id.hasDefault).toBe(true)
    expect(columns.slug.isUnique).toBe(true)
  })

  it("defines valid columns, nullability, and defaults for publicLinkOtp table", () => {
    const columns = getTableColumns(publicLinkOtp)

    // Column names
    expect(columns.id.name).toBe("id")
    expect(columns.publicLinkId.name).toBe("public_link_id")
    expect(columns.email.name).toBe("email")
    expect(columns.code.name).toBe("code")
    expect(columns.expiresAt.name).toBe("expires_at")
    expect(columns.verifiedAt.name).toBe("verified_at")
    expect(columns.createdAt.name).toBe("created_at")

    // Column nullability
    expect(columns.id.notNull).toBe(true)
    expect(columns.publicLinkId.notNull).toBe(true)
    expect(columns.email.notNull).toBe(true)
    expect(columns.code.notNull).toBe(true)
    expect(columns.expiresAt.notNull).toBe(true)
    expect(columns.verifiedAt.notNull).toBe(false)
    expect(columns.createdAt.notNull).toBe(true)

    // Column defaults
    expect(columns.id.hasDefault).toBe(true)
    expect(columns.createdAt.hasDefault).toBe(true)
    expect(columns.publicLinkId.hasDefault).toBe(false)
    expect(columns.email.hasDefault).toBe(false)
    expect(columns.code.hasDefault).toBe(false)
    expect(columns.expiresAt.hasDefault).toBe(false)
  })

  it("verifies foreign key metadata for proposalAcceptance and invoiceAcceptance", () => {
    const proposalConfig = getTableConfig(proposalAcceptance)
    const proposalFks = proposalConfig.foreignKeys.map((fk) => {
      const ref = fk.reference()
      return {
        localCol: ref.columns[0].name,
        foreignTable: getTableName(ref.foreignTable),
        foreignCol: ref.foreignColumns[0].name,
      }
    })

    expect(proposalFks).toHaveLength(2)
    expect(proposalFks).toContainEqual({
      localCol: "proposal_snapshot_id",
      foreignTable: "proposal_snapshot",
      foreignCol: "id",
    })
    expect(proposalFks).toContainEqual({
      localCol: "public_link_id",
      foreignTable: "proposal_public_link",
      foreignCol: "id",
    })

    const invoiceConfig = getTableConfig(invoiceAcceptance)
    const invoiceFks = invoiceConfig.foreignKeys.map((fk) => {
      const ref = fk.reference()
      return {
        localCol: ref.columns[0].name,
        foreignTable: getTableName(ref.foreignTable),
        foreignCol: ref.foreignColumns[0].name,
      }
    })

    expect(invoiceFks).toHaveLength(3)
    expect(invoiceFks).toContainEqual({
      localCol: "invoice_snapshot_id",
      foreignTable: "invoice_snapshot",
      foreignCol: "id",
    })
    expect(invoiceFks).toContainEqual({
      localCol: "public_link_id",
      foreignTable: "invoice_public_link",
      foreignCol: "id",
    })
    expect(invoiceFks).toContainEqual({
      localCol: "organization_id",
      foreignTable: "organization",
      foreignCol: "id",
    })
  })

  it("verifies index metadata for milestone 1 tables", () => {
    const proposalConfig = getTableConfig(proposalAcceptance)
    const proposalIndexes = proposalConfig.indexes.map((idx) => idx.config.name)
    expect(proposalIndexes).toContain("proposal_acceptance_snapshot_id_idx")
    expect(proposalIndexes).toContain("proposal_acceptance_public_link_id_idx")

    const invoiceConfig = getTableConfig(invoiceAcceptance)
    const invoiceIndexes = invoiceConfig.indexes.map((idx) => idx.config.name)
    expect(invoiceIndexes).toContain("invoice_acceptance_snapshot_id_idx")
    expect(invoiceIndexes).toContain("invoice_acceptance_public_link_id_idx")

    const otpConfig = getTableConfig(publicLinkOtp)
    const otpIndexes = otpConfig.indexes.map((idx) => idx.config.name)
    expect(otpIndexes).toContain("public_link_otp_public_link_id_idx")
    expect(otpIndexes).toContain("public_link_otp_email_idx")
  })
})
