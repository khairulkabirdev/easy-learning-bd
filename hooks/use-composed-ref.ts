"use client"

import { useCallback } from "react"

export function useComposedRef<T>(...refs: Array<React.Ref<T> | undefined>) {
  return useCallback(
    (node: T | null) => {
      for (const ref of refs) {
        if (!ref) continue
        if (typeof ref === "function") {
          ref(node)
        } else {
          ;(ref as React.MutableRefObject<T | null>).current = node
        }
      }
    },
    [refs]
  )
}
