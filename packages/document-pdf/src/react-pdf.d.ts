import type React from "react"

declare module "@react-pdf/renderer" {
  interface DocumentProps {
    children?: React.ReactNode
    key?: React.Key
  }
  interface PageProps {
    children?: React.ReactNode
    key?: React.Key
  }
  interface ViewProps {
    children?: React.ReactNode
    key?: React.Key
  }
  interface TextProps {
    children?: React.ReactNode
    key?: React.Key
  }
  interface LinkProps {
    children?: React.ReactNode
    key?: React.Key
  }
  interface ImageProps {
    children?: React.ReactNode
    key?: React.Key
  }
}
