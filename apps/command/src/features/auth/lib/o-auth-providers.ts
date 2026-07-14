import type { ComponentProps, ElementType } from "react"
import { AppleIcon, GoogleIcon } from "../components/social-icons"

export const SUPPORTED_OAUTH_PROVIDERS = ["google", "apple"] as const
export type SupportedOAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number]

export const SUPPORTED_OAUTH_PROVIDER_DETAILS: Record<
  SupportedOAuthProvider,
  { name: string; Icon: ElementType<ComponentProps<"svg">> }
> = {
  google: { name: "Google", Icon: GoogleIcon },
  apple: { name: "Apple", Icon: AppleIcon },
}
