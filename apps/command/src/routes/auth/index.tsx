import { createFileRoute } from "@tanstack/react-router"
import { LoginShowcasePage } from "@/components/login"

export const Route = createFileRoute("/auth/")({
  component: LoginShowcasePage,
})
