import { describe, expect, test } from "bun:test"
import { app } from "./index"

describe("apps/gate Hono application", () => {
  test("GET /health returns ok status and port 4100", async () => {
    const res = await app.request("/health", {
      method: "GET",
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      status: string
      app: string
      port: number
    }
    expect(json).toEqual({
      status: "ok",
      app: "apps/gate",
      port: 4100,
    })
  })
})
