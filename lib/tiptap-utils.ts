import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import type { Selection, Transaction } from "@tiptap/pm/state"
import type { Editor } from "@tiptap/react"
import type { NodeWithPos } from "@tiptap/core"

import { cn as baseCn } from "@/lib/utils"

export const cn = baseCn

export const MAX_FILE_SIZE = 5 * 1024 * 1024

export function parseShortcutKeys({
  shortcutKeys,
}: {
  shortcutKeys?: string
}): string[] {
  if (!shortcutKeys) return []

  return shortcutKeys.split("+").map((part) => {
    const key = part.trim().toLowerCase()
    if (key === "mod") return "Ctrl"
    if (key === "shift") return "Shift"
    if (key === "alt") return "Alt"
    if (key === "meta") return "Meta"
    return key.length === 1 ? key.toUpperCase() : key
  })
}

export function isValidPosition(pos: unknown): pos is number {
  return typeof pos === "number" && Number.isFinite(pos) && pos >= 0
}

export function isMarkInSchema(type: string, editor: Editor | null) {
  return Boolean(editor?.schema?.marks?.[type])
}

export function isNodeInSchema(type: string, editor: Editor | null) {
  return Boolean(editor?.schema?.nodes?.[type])
}

export function isExtensionAvailable(
  editor: Editor | null,
  name: string | string[]
) {
  const names = Array.isArray(name) ? name : [name]
  return Boolean(
    editor?.extensionManager.extensions.some((ext) => names.includes(ext.name))
  )
}

export function isNodeTypeSelected(
  editor: Editor | null,
  names: string[],
  includeParents = false
) {
  if (!editor) return false

  const selection = editor.state.selection
  let matched = false

  selection.ranges.forEach(({ $from, $to }) => {
    editor.state.doc.nodesBetween($from.pos, $to.pos, (node) => {
      if (names.includes(node.type.name)) {
        matched = true
        return false
      }
      return !matched
    })

    if (includeParents && !matched) {
      for (let depth = $from.depth; depth >= 0; depth -= 1) {
        if (names.includes($from.node(depth).type.name)) {
          matched = true
          break
        }
      }
    }
  })

  return matched
}

export function getSelectedBlockNodes(editor: Editor | null): NodeWithPos[] {
  if (!editor) return []

  const nodes: NodeWithPos[] = []
  const seen = new Set<number>()
  const { doc, selection } = editor.state

  doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (!node.isBlock || seen.has(pos)) return
    seen.add(pos)
    nodes.push({ node, pos })
  })

  if (nodes.length === 0) {
    const pos = selection.$anchor.before(selection.$anchor.depth)
    const node = selection.$anchor.node(selection.$anchor.depth)
    if (node?.isBlock && isValidPosition(pos)) {
      nodes.push({ node, pos })
    }
  }

  return nodes
}

export function selectionWithinConvertibleTypes(
  editor: Editor | null,
  names: string[]
) {
  const nodes = getSelectedBlockNodes(editor)
  return nodes.length > 0 && nodes.every(({ node }) => names.includes(node.type.name))
}

export function findNodePosition({
  editor,
  node,
}: {
  editor: Editor | null
  node: ProseMirrorNode | null | undefined
}): { node: ProseMirrorNode; pos: number } | null {
  if (!editor || !node) return null

  let found: { node: ProseMirrorNode; pos: number } | null = null
  editor.state.doc.descendants((current, pos) => {
    if (current === node) {
      found = { node: current, pos }
      return false
    }
    return true
  })
  return found
}

export function getSelectedNodesOfType(
  selection: Selection,
  types: string[]
): NodeWithPos[] {
  const nodes: NodeWithPos[] = []
  const seen = new Set<number>()

  selection.$from.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (types.includes(node.type.name) && !seen.has(pos)) {
      seen.add(pos)
      nodes.push({ node, pos })
    }
  })

  return nodes
}

export function updateNodesAttr(
  tr: Transaction,
  targets: NodeWithPos[],
  attr: string,
  value: unknown
) {
  targets.forEach(({ node, pos }) => {
    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      [attr]: value,
    })
  })
  return true
}

export function sanitizeUrl(url: string, base?: string) {
  try {
    const parsed = new URL(url, base || "http://localhost")
    if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return "#"
    }
    return parsed.toString()
  } catch {
    return "#"
  }
}

export function focusNextNode(editor: Editor | null) {
  if (!editor) return false
  return editor.commands.focus(editor.state.selection.to + 1)
}

export async function handleImageUpload(
  file: File,
  onProgress: (event: { progress: number }) => void,
  signal?: AbortSignal
) {
  onProgress({ progress: 5 })
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    signal?.addEventListener("abort", () => {
      reader.abort()
      reject(new Error("Image upload aborted"))
    })
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(reader.error ?? new Error("Image upload failed"))
    reader.readAsDataURL(file)
  })
  onProgress({ progress: 100 })
  return dataUrl
}
