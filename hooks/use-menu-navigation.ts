"use client"

import { useEffect, useState } from "react"

type Orientation = "horizontal" | "vertical" | "both"

export function useMenuNavigation<T>({
  containerRef,
  items,
  orientation,
  onSelect,
  autoSelectFirstItem = false,
}: {
  containerRef: React.RefObject<HTMLElement | null>
  items: T[]
  orientation: Orientation
  onSelect: (item: T) => boolean | void
  autoSelectFirstItem?: boolean
  loopOnTab?: boolean
}) {
  const [selectedIndex, setSelectedIndex] = useState(
    autoSelectFirstItem && items.length > 0 ? 0 : -1
  )

  useEffect(() => {
    if (items.length === 0) {
      setSelectedIndex(-1)
      return
    }

    setSelectedIndex((current) => {
      if (current >= 0 && current < items.length) return current
      return autoSelectFirstItem ? 0 : -1
    })
  }, [autoSelectFirstItem, items.length])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const move = (delta: number) => {
      setSelectedIndex((current) => {
        const next = current < 0 ? 0 : (current + delta + items.length) % items.length
        return next
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!items.length) return

      const isHorizontal =
        orientation === "horizontal" || orientation === "both"
      const isVertical = orientation === "vertical" || orientation === "both"

      if ((event.key === "ArrowRight" && isHorizontal) || (event.key === "ArrowDown" && isVertical)) {
        event.preventDefault()
        move(1)
        return
      }

      if ((event.key === "ArrowLeft" && isHorizontal) || (event.key === "ArrowUp" && isVertical)) {
        event.preventDefault()
        move(-1)
        return
      }

      if ((event.key === "Enter" || event.key === " ") && selectedIndex >= 0) {
        event.preventDefault()
        onSelect(items[selectedIndex]!)
      }
    }

    element.addEventListener("keydown", onKeyDown)
    return () => element.removeEventListener("keydown", onKeyDown)
  }, [containerRef, items, onSelect, orientation, selectedIndex])

  return { selectedIndex, setSelectedIndex }
}
