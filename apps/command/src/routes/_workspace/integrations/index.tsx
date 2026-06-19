import { createFileRoute } from "@tanstack/react-router"
import { IntegrationsPage } from "@/features/integrations/integrations-page"
import { useIntegrations } from "@/features/integrations/use-integrations"

export const Route = createFileRoute("/_workspace/integrations/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: integrations } = useIntegrations()

  return <IntegrationsPage integrations={integrations} />
}
