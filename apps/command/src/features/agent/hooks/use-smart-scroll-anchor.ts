import { useCallback, useEffect, useRef, useState } from "react"

export interface SmartScrollAnchorOptions {
  /** Distance from the bottom in pixels to consider the viewport "pinned" to bottom. Default: 120 */
  bottomThreshold?: number
  /** Dependencies that indicate new streaming/message updates. */
  triggerDeps?: unknown[]
}

export interface SmartScrollAnchorReturn {
  viewportRef: React.RefObject<HTMLDivElement | null>
  bottomRef: React.RefObject<HTMLDivElement | null>
  showScrollBottom: boolean
  scrollToBottom: (smooth?: boolean) => void
  handleScroll: (e?: React.UIEvent<HTMLElement>) => void
  isAtBottomRef: React.RefObject<boolean>
}

/**
 * Smart scroll anchor hook:
 * - Detects whether the user is near the bottom (threshold ~120px).
 * - If user scrolls up, preserves their position without hijacking scroll during streaming updates.
 * - If user is near bottom, uses coalesced RAF / ResizeObserver updates to follow the stream smoothly.
 * - Avoids per-token smooth-scroll thrash by using instant 'auto' positioning for streaming, and 'smooth' only on intentional user jumps.
 * - Conforms to /vercel-react-best-practices (transient state in refs, observer cleanup, RAF coalescing).
 */
export function useSmartScrollAnchor(
  options: SmartScrollAnchorOptions = {}
): SmartScrollAnchorReturn {
  const { bottomThreshold = 120, triggerDeps = [] } = options

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const isAtBottomRef = useRef(true)
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  const observedContainerRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const scrollRafIdRef = useRef<number | null>(null)
  const scrollFollowRafIdRef = useRef<number | null>(null)

  const getScrollContainer = useCallback((): HTMLElement | null => {
    if (!viewportRef.current) return null
    const el = viewportRef.current
    if (el.scrollHeight > el.clientHeight) return el
    const innerViewport = el.querySelector?.(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null
    return innerViewport || el
  }, [])

  // Unified single follow-scroll scheduler: guarantees at most one scroll write per animation frame
  const scheduleFollowScroll = useCallback(() => {
    if (!isAtBottomRef.current) return
    if (scrollFollowRafIdRef.current !== null) return

    scrollFollowRafIdRef.current = requestAnimationFrame(() => {
      scrollFollowRafIdRef.current = null
      if (!isAtBottomRef.current) return

      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "auto", block: "end" })
      } else {
        const container = getScrollContainer()
        if (container) container.scrollTop = container.scrollHeight
      }
    })
  }, [getScrollContainer])

  const scrollToBottom = useCallback(
    (smooth = true) => {
      isAtBottomRef.current = true
      setShowScrollBottom(false)

      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "end",
        })
        return
      }

      const container = getScrollContainer()
      if (container) {
        if (smooth) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          })
        } else {
          container.scrollTop = container.scrollHeight
        }
      }
    },
    [getScrollContainer]
  )

  const handleScroll = useCallback(
    (e?: React.UIEvent<HTMLElement>) => {
      if (scrollRafIdRef.current !== null) return

      scrollRafIdRef.current = requestAnimationFrame(() => {
        scrollRafIdRef.current = null
        const container =
          (e?.target as HTMLElement) ||
          (e?.currentTarget as HTMLElement) ||
          getScrollContainer()
        if (!container) return

        const distanceToBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight
        const atBottom = distanceToBottom <= bottomThreshold

        isAtBottomRef.current = atBottom
        setShowScrollBottom((prev) => (prev !== !atBottom ? !atBottom : prev))
      })
    },
    [bottomThreshold, getScrollContainer]
  )

  // Stable attachment function: connects ResizeObserver once per container instance
  const ensureObserverAttached = useCallback(() => {
    const container = getScrollContainer()
    if (!container || typeof ResizeObserver === "undefined") return
    if (observedContainerRef.current === container && observerRef.current)
      return

    observerRef.current?.disconnect()

    const observer = new ResizeObserver(() => {
      scheduleFollowScroll()
    })

    observer.observe(container)
    const firstChild = container.firstElementChild
    if (firstChild) {
      observer.observe(firstChild)
      const feedChild = firstChild.firstElementChild
      if (feedChild) {
        observer.observe(feedChild)
      }
    }

    observerRef.current = observer
    observedContainerRef.current = container
  }, [getScrollContainer, scheduleFollowScroll])

  // Attach observer on mount or container change
  useEffect(() => {
    ensureObserverAttached()
  }, [ensureObserverAttached])

  // Follow trigger deps (e.g. streaming tokens) using the shared follow scheduler
  useEffect(() => {
    ensureObserverAttached()
    scheduleFollowScroll()
  }, [ensureObserverAttached, scheduleFollowScroll, ...triggerDeps])

  // Teardown observer and timers strictly on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
      observedContainerRef.current = null
      if (scrollRafIdRef.current !== null) {
        cancelAnimationFrame(scrollRafIdRef.current)
        scrollRafIdRef.current = null
      }
      if (scrollFollowRafIdRef.current !== null) {
        cancelAnimationFrame(scrollFollowRafIdRef.current)
        scrollFollowRafIdRef.current = null
      }
    }
  }, [])

  return {
    viewportRef,
    bottomRef,
    showScrollBottom,
    scrollToBottom,
    handleScroll,
    isAtBottomRef,
  }
}
