"use client"

import { useCurrentEditor, type Editor } from "@tiptap/react"

export function useTiptapEditor(providedEditor?: Editor | null) {
  const { editor: contextEditor } = useCurrentEditor()
  return {
    editor: providedEditor ?? contextEditor ?? null,
  }
}
