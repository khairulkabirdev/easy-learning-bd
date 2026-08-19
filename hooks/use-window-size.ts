"use client"

import { useEffect, useState } from "react"

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (typeof window === "undefined") return

    const update = () =>
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })

    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return size
}
