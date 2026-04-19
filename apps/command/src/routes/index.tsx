import { HugeiconsIcon } from "@hugeicons/react";
import { SunIcon, MoonIcon } from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Swap, SwapOff, SwapOn } from "@workspace/ui/components/swap";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/")({ component: App })

function App() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2">Button</Button>

          <Swap
            animation="rotate"
            swapped={theme === "dark"}
            onSwappedChange={(dark) => setTheme(dark ? "dark" : "light")}
            className="size-12 rounded-lg border bg-muted/50"
          >
            <SwapOn>
              <HugeiconsIcon icon={SunIcon} className="size-5" />
            </SwapOn>
            <SwapOff>
              <HugeiconsIcon icon={MoonIcon} className="size-5" />
            </SwapOff>
          </Swap>
        </div>
      </div>
    </div>
  )
}
