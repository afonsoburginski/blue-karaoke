import { useMemo } from "react"
import { useLatest } from "@/hooks/use-latest"
import { useUnmount } from "@/hooks/use-unmount"

export interface DebounceOptions {
  signal?: AbortSignal
  edges?: Array<"leading" | "trailing">
}

export function useDebounceFn<Fn extends (...args: any[]) => any>(
  fn: Fn,
  debounceMs?: number,
  options?: DebounceOptions
) {
  const fnRef = useLatest(fn)

  const debouncedFn = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let lastCallTime = 0
    const delay = debounceMs ?? 300
    const edges = options?.edges ?? ["trailing"]

    const cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const flush = () => {
      cancel()
      fnRef.current()
    }

    const debounced = (...args: Parameters<Fn>) => {
      const now = Date.now()
      const shouldCallLeading = edges.includes("leading") && now - lastCallTime >= delay
      const shouldCallTrailing = edges.includes("trailing")

      cancel()

      if (shouldCallLeading) {
        lastCallTime = now
        fnRef.current(...args)
      } else if (shouldCallTrailing) {
        timeoutId = setTimeout(() => {
          lastCallTime = Date.now()
          fnRef.current(...args)
          timeoutId = null
        }, delay)
      }
    }

    return {
      run: debounced,
      cancel,
      flush,
    }
  }, [debounceMs, options?.edges])

  useUnmount(() => {
    debouncedFn.cancel()
  })

  return debouncedFn
}

