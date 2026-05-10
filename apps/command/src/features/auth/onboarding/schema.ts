import { z } from "zod"

export const organizationSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required"),
  organizationSlug: z
    .string()
    .trim()
    .min(1, "Organization slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens"
    ),
})

export const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
})

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})
