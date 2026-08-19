import { describe, expect, it } from "bun:test"
import { renderToString } from "react-dom/server"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "./theme-toggle"

describe("ThemeToggle Component", () => {
  it("renders light mode toggle button in server render", () => {
    const html = renderToString(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    // With default light fallback on SSR, aria-label switches to dark mode
    expect(html).toContain("Switch to dark mode")
  })
})
