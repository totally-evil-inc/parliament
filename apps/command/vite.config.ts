import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

const config = defineConfig({
  optimizeDeps: {
    exclude: [
      "@workspace/database",
      "@workspace/document",
      "@workspace/document-editor",
      "@workspace/logger",
      "@workspace/ui",
    ],
    include: [
      "recharts",
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@tanstack/react-router",
      "zod",
    ],
  },
  plugins: [
    nitro(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
