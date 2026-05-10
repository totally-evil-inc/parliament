import { z } from "zod"

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
})
