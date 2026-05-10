import { z } from "zod"

export const workspaceSchema = z.object({
  workspace: z.string().trim().min(1, "Workspace name is required"),
})

export const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
})
