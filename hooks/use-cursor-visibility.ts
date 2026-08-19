"use client"

import { useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"

type CursorRect = { x: number; y: number }

export function useCursorVisibility({
  editor,
}: {
  editor: Editor | null
  overlayHeight?: number
}): CursorRect {
  const [rect, setRect] = useState<CursorRect>({ x: 0, y: 0 })

  useEffect(() => {
    if (!editor || typeof window === "undefined") return

    const update = () => {
      try {
        const coords = editor.view.coordsAtPos(editor.state.selection.from)
        setRect({ x: coords.left, y: coords.top })
      } catch {
        setRect({ x: 0, y: window.innerHeight })
      }
    }

    update()
    editor.on("selectionUpdate", update)
    window.addEventListener("resize", update)
    return () => {
      editor.off("selectionUpdate", update)
      window.removeEventListener("resize", update)
    }
  }, [editor])

  return rect
}
