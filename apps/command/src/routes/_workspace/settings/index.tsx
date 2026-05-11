import { createFileRoute } from "@tanstack/react-router"
import { GeneralSettings } from "@/features/workspace/settings/general-settings"

export const Route = createFileRoute("/_workspace/settings/")({
  component: GeneralSettings,
})
