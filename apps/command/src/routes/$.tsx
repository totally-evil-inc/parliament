import { createFileRoute } from "@tanstack/react-router"
import { DefaultNotFound } from "@/components/router-fallbacks"

export const Route = createFileRoute("/$")({
  component: DefaultNotFound,
})
