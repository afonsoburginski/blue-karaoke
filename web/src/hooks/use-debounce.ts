import { useEffect, useState } from "react"
import { useDebounceFn, type DebounceOptions } from "@/hooks/use-debounce-fn"

export function useDebounce<T>(
  value: T,
  debounceMs?: number,
  options?: DebounceOptions
) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  const { run } = useDebounceFn(
    () => {
      setDebouncedValue(value)
    },
    debounceMs,
    options
  )

  useEffect(() => {
    run()
  }, [value, run])

  return debouncedValue
}

