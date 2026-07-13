"use client"

import { Button } from "@workspace/ui/components/button"
import { IconBrightnessIncrease, IconCloudMoon } from "nucleo-glass"
import { useTheme } from "@/components/theme-provider"

type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolved, toggleLightDark } = useTheme()
  const isDark = resolved === "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleLightDark}
    >
      {isDark ? <IconBrightnessIncrease /> : <IconCloudMoon />}
    </Button>
  )
}
