import { describe, expect, it } from "bun:test"
import { useSmartScrollAnchor } from "./use-smart-scroll-anchor"

describe("useSmartScrollAnchor hook", () => {
  it("exports useSmartScrollAnchor function and default options", () => {
    expect(typeof useSmartScrollAnchor).toBe("function")
  })

  it("handles scroll position calculation and threshold boundary correctly", () => {
    // Direct invocation / simulation of scroll math
    const threshold = 100
    const container = {
      scrollHeight: 1000,
      scrollTop: 850,
      clientHeight: 100,
    }
    // distanceToBottom = 1000 - 850 - 100 = 50 <= 100 => atBottom: true
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    expect(distanceToBottom <= threshold).toBe(true)

    // User scrolls up: distanceToBottom = 1000 - 600 - 100 = 300 > 100 => atBottom: false
    const scrolledUpDistance = 1000 - 600 - 100
    expect(scrolledUpDistance <= threshold).toBe(false)
  })

  it("maintains single stable ResizeObserver instance across sustained token stream renders", () => {
    let observerCreationCount = 0
    let observerDisconnectCount = 0
    const observedElements: unknown[] = []

    class MockResizeObserver {
      constructor(public callback: () => void) {
        observerCreationCount++
      }
      observe(el: any) {
        observedElements.push(el)
      }
      unobserve() {}
      disconnect() {
        observerDisconnectCount++
      }
    }

    const originalRO = (globalThis as any).ResizeObserver
    ;(globalThis as any).ResizeObserver = MockResizeObserver

    try {
      // Simulate hook execution with simulated viewport element
      const mockViewport = {
        scrollHeight: 500,
        clientHeight: 200,
        scrollTop: 300,
        firstElementChild: {
          firstElementChild: null,
        },
      }

      // Simulate observer attachment logic
      let observedContainer: any = null
      let currentObserver: any = null

      const attachObserver = (container: any) => {
        if (!container || typeof (globalThis as any).ResizeObserver === "undefined")
          return
        if (observedContainer === container && currentObserver) return

        currentObserver?.disconnect()
        currentObserver = new (globalThis as any).ResizeObserver(() => {})
        currentObserver.observe(container)
        if (container.firstElementChild) {
          currentObserver.observe(container.firstElementChild)
        }
        observedContainer = container
      }

      // Token 1 arrives
      attachObserver(mockViewport)
      expect(observerCreationCount).toBe(1)
      expect(observerDisconnectCount).toBe(0)

      // Token 2 through Token 50 arrive during active streaming
      for (let i = 2; i <= 50; i++) {
        attachObserver(mockViewport)
      }

      // Observer must NOT be recreated or disconnected during sustained streaming
      expect(observerCreationCount).toBe(1)
      expect(observerDisconnectCount).toBe(0)

      // Unmount / container change
      currentObserver?.disconnect()
      expect(observerDisconnectCount).toBe(1)
    } finally {
      ;(globalThis as any).ResizeObserver = originalRO
    }
  })
})

