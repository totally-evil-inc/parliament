"use client";

import { Moon, Sun } from "@hugeicons/core-free-icons";
import { Button } from "@workspace/ui/components/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "@/components/theme-provider";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolved, toggleLightDark } = useTheme();
  const isDark = resolved === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleLightDark}
    >
      {isDark ? <HugeiconsIcon icon={Sun} /> : <HugeiconsIcon icon={Moon} />}
    </Button>
  );
}
