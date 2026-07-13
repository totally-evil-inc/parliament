import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { Toaster } from "@workspace/ui/components/sonner"

import appCss from "@workspace/ui/globals.css?url"
import katexCss from "katex/dist/katex.min.css?url"
import type { QueryClient } from "@tanstack/react-query"
import { ConfirmDialogProvider } from "@/components/confirm-dialog-provider"
import { ThemeProvider } from "@/components/theme-provider"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: katexCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext()

  return (
    <html lang="en" className="h-full overflow-hidden">
      <head>
        <HeadContent />
      </head>
      <body className="h-full overflow-hidden">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ThemeProvider>
              <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
            </ThemeProvider>
          </TooltipProvider>
          <Toaster />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
