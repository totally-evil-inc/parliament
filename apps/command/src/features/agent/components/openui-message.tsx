import React, {
  Component,
  lazy,
  type ReactNode,
  Suspense,
  useState,
} from "react"
import { library } from "../openui/library"
import { extractOpenUI } from "../openui/parser"

// Lazy-load the heavy OpenUI Lang compiler and React component renderer (bundle-dynamic-imports)
const LazyOpenUIRenderer = lazy(async () => {
  const mod = await import("@openuidev/react-lang")
  return { default: mod.Renderer }
})

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class OpenUIErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: undefined })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground text-xs">
            <p className="font-semibold text-foreground">
              Visualization Preview
            </p>
            <p className="mt-1">
              Unable to render visual components. Displaying data summary.
            </p>
          </div>
        )
      )
    }
    return this.props.children
  }
}

interface OpenUIMessageProps {
  content: string
  isStreaming?: boolean
}

export const OpenUIMessage: React.FC<OpenUIMessageProps> = ({
  content,
  isStreaming = false,
}) => {
  const [parseError, setParseError] = useState(false)
  if (!content) return null

  const isFenced = content.includes("```")
  const parsed = isFenced
    ? extractOpenUI(content)
    : {
        prose: "",
        program: content,
        hasOpenUI: true,
        isComplete: !isStreaming,
      }

  if (isFenced && !parsed.hasOpenUI && !isStreaming) return null
  if (!parsed.program) return null

  return (
    <div className="my-2 w-full overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xs">
      <OpenUIErrorBoundary>
        <Suspense
          fallback={
            <div className="flex h-20 w-full animate-pulse items-center justify-center rounded-lg bg-muted/20 text-muted-foreground text-xs">
              Loading visual components...
            </div>
          }
        >
          <LazyOpenUIRenderer
            library={library}
            response={parsed.program}
            isStreaming={isStreaming || !parsed.isComplete}
            onParseResult={(result: any) => {
              const hasFatalErrors =
                !isStreaming &&
                Array.isArray(result?.meta?.errors) &&
                result.meta.errors.length > 0 &&
                !result.root
              setParseError(hasFatalErrors)
            }}
          />
        </Suspense>
      </OpenUIErrorBoundary>
      {parseError ? (
        <p className="mt-2 text-destructive text-xs">
          This result could not be displayed. Try again.
        </p>
      ) : null}
    </div>
  )
}
