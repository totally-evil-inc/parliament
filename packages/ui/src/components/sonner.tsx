"use client"

import { useTheme } from "next-themes"
import {
  IconBan,
  IconCircleCheck,
  IconCircleInfo,
  IconLoader,
  IconTriangleWarning,
} from "nucleo-glass"
import { Toaster as Sonner, type ToasterProps, toast } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <IconCircleCheck className="size-4" />,
        info: <IconCircleInfo className="size-4" />,
        warning: <IconTriangleWarning className="size-4" />,
        error: <IconBan className="size-4" />,
        loading: <IconLoader className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
