"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { Table } from "@tiptap/extension-table"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableRow } from "@tiptap/extension-table-row"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { FindAndReplace } from "@tiptap/extension-find-and-replace"
import { Selection } from "@tiptap/extensions"
import { CellSelection, TableMap, tableEditingKey } from "@tiptap/pm/tables"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/tiptap-ui-primitive/popover"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"
import {
  SearchAndReplace,
  SearchAndReplaceButton,
} from "@/components/tiptap-ui/search-and-replace"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"
import { TableColumnAfterIcon } from "@/components/tiptap-icons/table-column-after-icon"
import { TableColumnBeforeIcon } from "@/components/tiptap-icons/table-column-before-icon"
import { TableHeaderColumnIcon } from "@/components/tiptap-icons/table-header-column-icon"
import { TableHeaderRowIcon } from "@/components/tiptap-icons/table-header-row-icon"
import { TableIcon } from "@/components/tiptap-icons/table-icon"
import { TableMergeIcon } from "@/components/tiptap-icons/table-merge-icon"
import { TableRowAfterIcon } from "@/components/tiptap-icons/table-row-after-icon"
import { TableRowBeforeIcon } from "@/components/tiptap-icons/table-row-before-icon"
import { TableSplitIcon } from "@/components/tiptap-icons/table-split-icon"
import { TrashIcon } from "@/components/tiptap-icons/trash-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useWindowSize } from "@/hooks/use-window-size"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"

// --- Components ---
// --- Lib ---
import {
  getTableSelectionState,
  handleImageUpload,
  MAX_FILE_SIZE,
} from "@/lib/tiptap-utils"
import { cn } from "@/lib/utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

const SEARCH_AND_REPLACE_SCROLL_OPTIONS: ScrollIntoViewOptions = {
  block: "center",
}

const tableRangeMarkerPluginKey = new PluginKey("ttTableRangeMarkers")

export type EmbeddedSimpleEditorProps = {
  value: string
  onChange: (value: string) => void
  minHeight?: number
  className?: string
  placeholder?: string
}

const TABLE_PICKER_SIZE = 8

function TableInsertPopover({
  onInsert,
  isActive,
}: {
  onInsert: (rows: number, cols: number) => void
  isActive: boolean
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(1)
  const [cols, setCols] = useState(1)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          data-active-state={isActive ? "on" : "off"}
          aria-label="Insert table"
          tooltip="Insert table"
        >
          <TableIcon className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="simple-editor-table-picker"
      >
        <div
          className="simple-editor-table-picker-grid"
          onMouseLeave={() => {
            setRows(1)
            setCols(1)
          }}
        >
          {Array.from({ length: TABLE_PICKER_SIZE * TABLE_PICKER_SIZE }).map(
            (_, index) => {
              const cellRow = Math.floor(index / TABLE_PICKER_SIZE) + 1
              const cellCol = (index % TABLE_PICKER_SIZE) + 1
              const selected = cellRow <= rows && cellCol <= cols

              return (
                <button
                  key={`${cellRow}-${cellCol}`}
                  type="button"
                  className={cn(
                    "simple-editor-table-picker-cell",
                    selected && "simple-editor-table-picker-cell-selected"
                  )}
                  onMouseEnter={() => {
                    setRows(cellRow)
                    setCols(cellCol)
                  }}
                  onFocus={() => {
                    setRows(cellRow)
                    setCols(cellCol)
                  }}
                  onClick={() => {
                    setOpen(false)
                    triggerRef.current?.blur()
                    onInsert(cellRow, cellCol)
                  }}
                  aria-label={`Insert ${cellRow} by ${cellCol} table`}
                />
              )
            }
          )}
        </div>
        <div className="simple-editor-table-picker-footer">
          <span className="simple-editor-table-picker-size">
            {rows} x {cols}
          </span>
          <span className="simple-editor-table-picker-label">Insert table</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}

type TableToolbarState = {
  visible: boolean
  top: number
  left: number
  placement: "top" | "bottom"
}

type TableSelectionOverlayState = {
  visible: boolean
  top: number
  left: number
  width: number
  height: number
  handleTop: number
  handleLeft: number
}

function TableFloatingToolbar({
  editor,
  state,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>
  state: TableToolbarState
}) {
  const can = editor.can()

  const handleAction =
    (command: () => boolean) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      command()
    }

  return (
    <Toolbar
      variant="floating"
      className="simple-editor-table-toolbar"
      data-placement={state.placement}
      data-visible={state.visible ? "true" : "false"}
      style={{
        top: state.top,
        left: state.left,
        opacity: 1,
      }}
    >
      <ToolbarGroup>
        <Button
          type="button"
          variant="ghost"
          aria-label="Add row before"
          tooltip="Add row before"
          disabled={!can.addRowBefore()}
          onMouseDown={handleAction(() => editor.commands.addRowBefore())}
        >
          <TableRowBeforeIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Add row after"
          tooltip="Add row after"
          disabled={!can.addRowAfter()}
          onMouseDown={handleAction(() => editor.commands.addRowAfter())}
        >
          <TableRowAfterIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Delete row"
          tooltip="Delete row"
          disabled={!can.deleteRow()}
          onMouseDown={handleAction(() => editor.commands.deleteRow())}
        >
          <TrashIcon className="tiptap-button-icon" />
        </Button>
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <Button
          type="button"
          variant="ghost"
          aria-label="Add column before"
          tooltip="Add column before"
          disabled={!can.addColumnBefore()}
          onMouseDown={handleAction(() => editor.commands.addColumnBefore())}
        >
          <TableColumnBeforeIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Add column after"
          tooltip="Add column after"
          disabled={!can.addColumnAfter()}
          onMouseDown={handleAction(() => editor.commands.addColumnAfter())}
        >
          <TableColumnAfterIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Delete column"
          tooltip="Delete column"
          disabled={!can.deleteColumn()}
          onMouseDown={handleAction(() => editor.commands.deleteColumn())}
        >
          <TrashIcon className="tiptap-button-icon" />
        </Button>
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <Button
          type="button"
          variant="ghost"
          aria-label="Merge cells"
          tooltip="Merge cells"
          disabled={!can.mergeCells()}
          onMouseDown={handleAction(() => editor.commands.mergeCells())}
        >
          <TableMergeIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Split cell"
          tooltip="Split cell"
          disabled={!can.splitCell()}
          onMouseDown={handleAction(() => editor.commands.splitCell())}
        >
          <TableSplitIcon className="tiptap-button-icon" />
        </Button>
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <Button
          type="button"
          variant="ghost"
          aria-label="Toggle header row"
          tooltip="Toggle header row"
          disabled={!can.toggleHeaderRow()}
          onMouseDown={handleAction(() => editor.commands.toggleHeaderRow())}
        >
          <TableHeaderRowIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Toggle header column"
          tooltip="Toggle header column"
          disabled={!can.toggleHeaderColumn()}
          onMouseDown={handleAction(() => editor.commands.toggleHeaderColumn())}
        >
          <TableHeaderColumnIcon className="tiptap-button-icon" />
        </Button>
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <Button
          type="button"
          variant="ghost"
          aria-label="Delete table"
          tooltip="Delete table"
          disabled={!can.deleteTable()}
          onMouseDown={handleAction(() => editor.commands.deleteTable())}
        >
          <TrashIcon className="tiptap-button-icon" />
        </Button>
      </ToolbarGroup>
    </Toolbar>
  )
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  onSearchAndReplaceClick,
  isSearchAndReplaceOpen,
  searchAndReplaceButtonRef,
  isMobile,
  onInsertTable,
  isTableActive,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  onSearchAndReplaceClick: () => void
  isSearchAndReplaceOpen: boolean
  searchAndReplaceButtonRef: React.RefObject<HTMLButtonElement | null>
  isMobile: boolean
  onInsertTable: (rows: number, cols: number) => void
  isTableActive: boolean
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu
          modal={false}
          types={["bulletList", "orderedList", "taskList"]}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
        <TableInsertPopover onInsert={onInsertTable} isActive={isTableActive} />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <SearchAndReplaceButton
          ref={searchAndReplaceButtonRef}
          aria-expanded={isSearchAndReplaceOpen}
          data-active-state={isSearchAndReplaceOpen ? "on" : "off"}
          onClick={onSearchAndReplaceClick}
        />
      </ToolbarGroup>
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export function SimpleEditor({
  value,
  onChange,
  minHeight = 320,
  className,
  placeholder = "Write here...",
}: EmbeddedSimpleEditorProps) {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const [isSearchAndReplaceOpen, setIsSearchAndReplaceOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tableToolbarRef = useRef<HTMLDivElement>(null)
  const updateTableToolbarRef = useRef<(() => void) | null>(null)
  const searchAndReplaceButtonRef = useRef<HTMLButtonElement>(null)
  const suppressNextTableClickRef = useRef(false)
  const pendingTableSelectionRef = useRef<{
    anchorPos: number | null
    headPos: number | null
  }>({
    anchorPos: null,
    headPos: null,
  })
  const tableDragSelectionRef = useRef<{
    active: boolean
    anchorPos: number | null
    headPos: number | null
    table: HTMLTableElement | null
    anchorCell: HTMLElement | null
    startedOnContent: boolean
  }>({
    active: false,
    anchorPos: null,
    headPos: null,
    table: null,
    anchorCell: null,
    startedOnContent: false,
  })
  const [tableToolbarState, setTableToolbarState] = useState<TableToolbarState>({
    visible: false,
    top: 0,
    left: 0,
    placement: "top",
  })
  const [tableSelectionOverlay, setTableSelectionOverlay] =
    useState<TableSelectionOverlayState>({
      visible: false,
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      handleTop: 0,
      handleLeft: 0,
    })

  const clearSelectedCellMarkers = useCallback(() => {
    return
  }, [])

  const applySelectedCellMarkers = useCallback((selectedCells: HTMLElement[]) => {
    return
  }, [clearSelectedCellMarkers])

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        enableClickSelection: true,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      FindAndReplace.configure({
        searchDebounceMs: 500,
        injectCSS: false,
      }),
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: (file, onProgress, abortSignal) =>
          handleImageUpload(file, onProgress ?? (() => {}), abortSignal),
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return

    const markerPlugin = new Plugin({
      key: tableRangeMarkerPluginKey,
      props: {
        decorations(state) {
          const tableState = getTableSelectionState(editor)

          if (!tableState.isInsideTable || tableState.tablePos == null) {
            return null
          }

          const tableNode = state.doc.nodeAt(tableState.tablePos)
          if (!tableNode) {
            return null
          }

          const tableStart = tableState.tablePos + 1
          let rect:
            | { left: number; right: number; top: number; bottom: number }
            | null = null

          if (state.selection instanceof CellSelection) {
            rect = TableMap.get(tableNode).rectBetween(
              state.selection.$anchorCell.pos - tableStart,
              state.selection.$headCell.pos - tableStart
            )
          } else if (tableState.cellPos != null) {
            rect = TableMap.get(tableNode).findCell(tableState.cellPos - tableStart)
          }

          if (!rect) {
            return null
          }

          const map = TableMap.get(tableNode)
          const cells = map.cellsInRect(rect)
          if (cells.length === 0) {
            return null
          }

          const handleRelativePos = cells
            .filter((relativePos) => {
              const cellRect = map.findCell(relativePos)
              return cellRect.top === rect.top && cellRect.right === rect.right
            })
            .at(-1)

          const decorations = cells.map((relativePos) => {
            const cellRect = map.findCell(relativePos)
            const cellNode = tableNode.nodeAt(relativePos)
            if (!cellNode) return null

            const attrs: Record<string, string> = {}
            if (cellRect.left === rect?.left) attrs["data-tt-range-left"] = "true"
            if (cellRect.right === rect?.right) attrs["data-tt-range-right"] = "true"
            if (cellRect.top === rect?.top) attrs["data-tt-range-top"] = "true"
            if (cellRect.bottom === rect?.bottom) attrs["data-tt-range-bottom"] = "true"
            if (handleRelativePos != null && relativePos === handleRelativePos) {
              attrs["data-tt-cell-handle"] = "true"
            }

            return Decoration.node(
              tableStart + relativePos,
              tableStart + relativePos + cellNode.nodeSize,
              attrs
            )
          }).filter((decoration): decoration is Decoration => decoration != null)

          return decorations.length > 0
            ? DecorationSet.create(state.doc, decorations)
            : null
        },
      },
    })

    editor.registerPlugin(markerPlugin)

    return () => {
      editor.unregisterPlugin(tableRangeMarkerPluginKey)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false })
    }
  }, [editor, value])

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  const openSearchAndReplace = useCallback(() => {
    setMobileView("main")
    setIsSearchAndReplaceOpen(true)
  }, [])

  const closeSearchAndReplace = useCallback(() => {
    setIsSearchAndReplaceOpen(false)
    searchAndReplaceButtonRef.current?.focus()
  }, [])

  const toggleSearchAndReplace = useCallback(() => {
    if (isSearchAndReplaceOpen) {
      closeSearchAndReplace()
      return
    }

    openSearchAndReplace()
  }, [closeSearchAndReplace, isSearchAndReplaceOpen, openSearchAndReplace])

  const handleInsertTable = useCallback((rows: number, cols: number) => {
    if (!editor || !editor.isEditable) return
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run()
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const wrapper = wrapperRef.current
    if (!wrapper) return

    const resetTableDragSelection = () => {
      wrapper.removeAttribute("data-tt-table-dragging")
      tableDragSelectionRef.current = {
        active: false,
        anchorPos: null,
        headPos: null,
        table: null,
        anchorCell: null,
        startedOnContent: false,
      }
    }

    const getCellPosFromElement = (element: HTMLElement | null) => {
      if (!element) return null

      const cellElement = element.closest<HTMLElement>("td, th")
      if (!cellElement) return null

      const viewDesc = (cellElement as HTMLElement & {
        pmViewDesc?: { posBefore?: number }
      }).pmViewDesc

      if (typeof viewDesc?.posBefore === "number") {
        return viewDesc.posBefore
      }

      try {
        const domPos = editor.view.posAtDOM(cellElement, 0)
        const $pos = editor.state.doc.resolve(domPos)

        for (let depth = $pos.depth; depth > 0; depth -= 1) {
          const node = $pos.node(depth)
          if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
            return $pos.before(depth)
          }
        }
      } catch {
        return null
      }

      return null
    }

    const getCellPosFromPoint = (clientX: number, clientY: number) => {
      const pointTarget = document.elementFromPoint(clientX, clientY)
      const fromElement =
        pointTarget instanceof HTMLElement
          ? getCellPosFromElement(pointTarget)
          : null

      if (fromElement != null) {
        return fromElement
      }

      const coords = editor.view.posAtCoords({ left: clientX, top: clientY })
      if (!coords) return null

      try {
        const $pos = editor.state.doc.resolve(coords.pos)

        for (let depth = $pos.depth; depth > 0; depth -= 1) {
          const node = $pos.node(depth)
          if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
            return $pos.before(depth)
          }
        }
      } catch {
        return null
      }

      return null
    }

    const applyCellSelection = (anchorPos: number, headPos: number) => {
      const { state, view } = editor
      const $anchor = state.doc.resolve(anchorPos)
      const $head = state.doc.resolve(headPos)
      const selection = new CellSelection($anchor, $head)
      const transaction = state.tr
        .setSelection(selection)
        .setMeta(tableEditingKey, anchorPos)

      view.dispatch(transaction)
    }

    const finalizeCellSelection = (anchorPos: number, headPos: number) => {
      const selection = new CellSelection(
        editor.state.doc.resolve(anchorPos),
        editor.state.doc.resolve(headPos)
      )

      editor.view.dispatch(
        editor.state.tr
          .setSelection(selection)
          .setMeta(tableEditingKey, anchorPos)
      )
      requestAnimationFrame(() => {
        setTimeout(() => {
          const selectedCells = Array.from(
            wrapperRef.current?.querySelectorAll<HTMLElement>(
              "td.selectedCell, th.selectedCell"
            ) ?? []
          )
          applySelectedCellMarkers(selectedCells)
          updateTableToolbarRef.current?.()
        }, 40)
      })
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey) {
        resetTableDragSelection()
        return
      }

      const target = event.target instanceof HTMLElement ? event.target : null
      const cell = target?.closest<HTMLElement>("td, th")
      const table = cell?.closest<HTMLTableElement>("table")

      if (!cell || !table || !wrapper.contains(cell)) {
        if (tableEditingKey.getState(editor.state) != null) {
          editor.view.dispatch(editor.state.tr.setMeta(tableEditingKey, -1))
        }
        resetTableDragSelection()
        return
      }

      const anchorPos =
        getCellPosFromElement(cell) ??
        getCellPosFromPoint(event.clientX, event.clientY)

      if (anchorPos == null) {
        resetTableDragSelection()
        return
      }

      const startedOnContent =
        target != null &&
        target !== cell &&
        (target.textContent?.trim().length ?? 0) > 0

      tableDragSelectionRef.current = {
        active: false,
        anchorPos,
        headPos: anchorPos,
        table,
        anchorCell: cell,
        startedOnContent,
      }
      if (startedOnContent) {
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
      setTableToolbarState((current) =>
        current.visible ? { ...current, visible: false } : current
      )
    }

    const handleMouseMove = (event: MouseEvent) => {
      const dragState = tableDragSelectionRef.current
      if (dragState.anchorPos == null || !(event.buttons & 1)) {
        return
      }

      const pointTarget = document.elementFromPoint(event.clientX, event.clientY)
      const hoveredCell =
        pointTarget instanceof HTMLElement
          ? pointTarget.closest<HTMLElement>("td, th")
          : null

      if (!hoveredCell || hoveredCell.closest("table") !== dragState.table) {
        return
      }

      const headPos =
        getCellPosFromElement(hoveredCell) ??
        getCellPosFromPoint(event.clientX, event.clientY)

      if (headPos == null) return

      if (!dragState.active) {
        if (hoveredCell === dragState.anchorCell && headPos === dragState.anchorPos) {
          return
        }

        dragState.active = true
        wrapper.setAttribute("data-tt-table-dragging", "true")
        editor.view.focus()
      }

      dragState.headPos = headPos
      event.preventDefault()
      event.stopPropagation()
      applyCellSelection(dragState.anchorPos, headPos)
    }

    const handleDragEnd = () => {
      const dragState = tableDragSelectionRef.current
      if (!dragState.active) return

      const { anchorPos, headPos } = dragState
      resetTableDragSelection()
      if (anchorPos != null && headPos != null) {
        pendingTableSelectionRef.current = { anchorPos, headPos }
        suppressNextTableClickRef.current = anchorPos !== headPos
        setTimeout(() => {
          const pending = pendingTableSelectionRef.current
          if (pending.anchorPos == null || pending.headPos == null) {
            return
          }
          finalizeCellSelection(pending.anchorPos, pending.headPos)
        }, 120)
        return
      }

      editor.view.dispatch(editor.state.tr.setMeta(tableEditingKey, -1))
      requestAnimationFrame(() => {
        updateTableToolbarRef.current?.()
      })
    }

    const handleClickCapture = (event: MouseEvent) => {
      if (!suppressNextTableClickRef.current) return

      const target = event.target instanceof HTMLElement ? event.target : null
      if (!target?.closest("table")) {
        suppressNextTableClickRef.current = false
        return
      }

      event.preventDefault()
      event.stopPropagation()
      const pending = pendingTableSelectionRef.current
      if (pending.anchorPos != null && pending.headPos != null) {
        finalizeCellSelection(pending.anchorPos, pending.headPos)
      }
      suppressNextTableClickRef.current = false
      pendingTableSelectionRef.current = { anchorPos: null, headPos: null }
    }

    wrapper.addEventListener("mousedown", handleMouseDown, true)
    wrapper.addEventListener("click", handleClickCapture, true)
    window.addEventListener("mousemove", handleMouseMove, true)
    window.addEventListener("mouseup", handleDragEnd, true)
    window.addEventListener("dragend", handleDragEnd, true)

    return () => {
      wrapper.removeEventListener("mousedown", handleMouseDown, true)
      wrapper.removeEventListener("click", handleClickCapture, true)
      window.removeEventListener("mousemove", handleMouseMove, true)
      window.removeEventListener("mouseup", handleDragEnd, true)
      window.removeEventListener("dragend", handleDragEnd, true)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const updateTableToolbar = () => {
      updateTableToolbarRef.current = updateTableToolbar
      const wrapper = wrapperRef.current
      const toolbar = tableToolbarRef.current
      if (!wrapper || !toolbar || !editor.isEditable) {
        clearSelectedCellMarkers()
        setTableSelectionOverlay((current) =>
          current.visible ? { ...current, visible: false } : current
        )
        setTableToolbarState((current) =>
          current.visible ? { ...current, visible: false } : current
        )
        return
      }

      const tableState = getTableSelectionState(editor)

      if (tableDragSelectionRef.current.active) {
        clearSelectedCellMarkers()
        setTableSelectionOverlay((current) =>
          current.visible ? { ...current, visible: false } : current
        )
        setTableToolbarState((current) =>
          current.visible ? { ...current, visible: false } : current
        )
        return
      }

      if (!tableState.isInsideTable || tableState.tablePos == null) {
        clearSelectedCellMarkers()
        setTableSelectionOverlay((current) =>
          current.visible ? { ...current, visible: false } : current
        )
        setTableToolbarState((current) =>
          current.visible ? { ...current, visible: false } : current
        )
        return
      }

      const rootSelection =
        editor.view.root instanceof Document
          ? editor.view.root.getSelection()
          : window.getSelection()
      const cellNode = tableState.cellPos != null
        ? editor.view.nodeDOM(tableState.cellPos)
        : null
      const anchorElement =
        cellNode instanceof HTMLElement
          ? cellNode
          : rootSelection?.anchorNode instanceof HTMLElement
            ? rootSelection.anchorNode
            : rootSelection?.anchorNode?.parentElement ?? null
      const activeCell =
        anchorElement?.closest<HTMLElement>("td, th") ??
        (cellNode instanceof HTMLElement
          ? cellNode.closest<HTMLElement>("td, th")
          : null)
      const selectedDomCells = Array.from(
        wrapper.querySelectorAll<HTMLElement>("td.selectedCell, th.selectedCell")
      )

      const selectedCells =
        selectedDomCells.length > 0
          ? selectedDomCells
          : activeCell
            ? [activeCell]
            : []

      applySelectedCellMarkers(selectedCells)
      if (selectedCells.length > 0) {
        const rects = selectedCells.map((cell) => cell.getBoundingClientRect())
        const minLeft = Math.min(...rects.map((rect) => rect.left))
        const maxRight = Math.max(...rects.map((rect) => rect.right))
        const minTop = Math.min(...rects.map((rect) => rect.top))
        const maxBottom = Math.max(...rects.map((rect) => rect.bottom))

        setTableSelectionOverlay({
          visible: true,
          top: minTop - wrapper.getBoundingClientRect().top,
          left: minLeft - wrapper.getBoundingClientRect().left,
          width: maxRight - minLeft,
          height: maxBottom - minTop,
          handleTop: minTop - wrapper.getBoundingClientRect().top + (maxBottom - minTop) / 2,
          handleLeft: maxRight - wrapper.getBoundingClientRect().left,
        })
      } else {
        setTableSelectionOverlay((current) =>
          current.visible ? { ...current, visible: false } : current
        )
      }
      const selectedTableFromCell = activeCell?.closest("table")
      const selectedTableFromRange = selectedCells[0]?.closest("table")
      const tableNode = editor.view.nodeDOM(tableState.tablePos)
      const tableElement =
        selectedTableFromCell ??
        selectedTableFromRange ??
        (tableNode instanceof HTMLElement
          ? tableNode.matches("table")
            ? tableNode
            : tableNode.querySelector("table")
          : null)

      if (!tableElement) {
        setTableToolbarState((current) =>
          current.visible ? { ...current, visible: false } : current
        )
        return
      }

      const viewportHeight = window.innerHeight
      const wrapperRect = wrapper.getBoundingClientRect()
      const tableRect = tableElement.getBoundingClientRect()
      const toolbarRect = toolbar.getBoundingClientRect()
      const toolbarHeight = toolbarRect.height || 38
      const toolbarWidth = toolbarRect.width || 406
      const fixedToolbarHeight =
        toolbarRef.current?.getBoundingClientRect().height || 44
      const gap = 10
      const topBoundary = fixedToolbarHeight + gap
      const spaceAbove = tableRect.top - wrapperRect.top - fixedToolbarHeight
      const spaceBelow = viewportHeight - tableRect.bottom
      const canShowAbove = spaceAbove >= toolbarHeight + gap
      const canShowBelow = spaceBelow >= toolbarHeight + gap
      const placement: TableToolbarState["placement"] =
        canShowAbove || !canShowBelow ? "top" : "bottom"
      const rawTop =
        placement === "top"
          ? tableRect.top - wrapperRect.top - toolbarHeight - gap
          : tableRect.bottom - wrapperRect.top + gap
      const top = Math.min(
        Math.max(topBoundary, rawTop),
        Math.max(gap, wrapperRect.height - toolbarHeight - gap)
      )

      const centeredLeft =
        tableRect.left -
        wrapperRect.left +
        tableRect.width / 2 -
        toolbarWidth / 2
      const left = Math.min(
        Math.max(gap, centeredLeft),
        Math.max(gap, wrapperRect.width - toolbarWidth - gap)
      )

      setTableToolbarState({
        visible: true,
        top,
        left,
        placement,
      })
    }

    updateTableToolbar()

    editor.on("selectionUpdate", updateTableToolbar)
    editor.on("transaction", updateTableToolbar)
    window.addEventListener("resize", updateTableToolbar)
    window.addEventListener("scroll", updateTableToolbar, true)

    return () => {
      editor.off("selectionUpdate", updateTableToolbar)
      editor.off("transaction", updateTableToolbar)
      window.removeEventListener("resize", updateTableToolbar)
      window.removeEventListener("scroll", updateTableToolbar, true)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const wrapper = wrapperRef.current
    if (!wrapper) return

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null

    const syncSelectedCellMarkers = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        const selectedCells = Array.from(
          wrapper.querySelectorAll<HTMLElement>("td.selectedCell, th.selectedCell")
        )

        if (selectedCells.length > 0) {
          applySelectedCellMarkers(selectedCells)
          updateTableToolbarRef.current?.()
        }
      }, 0)
    }

    intervalId = setInterval(() => {
      const selectedCells = Array.from(
        wrapper.querySelectorAll<HTMLElement>("td.selectedCell, th.selectedCell")
      )

      if (selectedCells.length > 0) {
        applySelectedCellMarkers(selectedCells)
      }
    }, 75)

    const observer = new MutationObserver((mutations) => {
      if (
        mutations.some((mutation) => {
          const target = mutation.target
          return (
            target instanceof HTMLElement &&
            (target.matches("td, th") ||
              target.closest("td, th") !== null ||
              target.matches("table"))
          )
        })
      ) {
        syncSelectedCellMarkers()
      }
    })

    observer.observe(wrapper, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
    })

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (intervalId) {
        clearInterval(intervalId)
      }
      observer.disconnect()
    }
  }, [applySelectedCellMarkers, editor])

  return (
    <div ref={wrapperRef} className={cn("simple-editor-wrapper", className)}>
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              onSearchAndReplaceClick={toggleSearchAndReplace}
              isSearchAndReplaceOpen={isSearchAndReplaceOpen}
              searchAndReplaceButtonRef={searchAndReplaceButtonRef}
              isMobile={isMobile}
              onInsertTable={handleInsertTable}
              isTableActive={getTableSelectionState(editor).isInsideTable}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <SearchAndReplace
          className="simple-editor-search-and-replace"
          open={isSearchAndReplaceOpen}
          onOpen={openSearchAndReplace}
          onClose={closeSearchAndReplace}
          scrollIntoViewOptions={SEARCH_AND_REPLACE_SCROLL_OPTIONS}
        />

        <div ref={tableToolbarRef}>
          {editor ? (
            <TableFloatingToolbar editor={editor} state={tableToolbarState} />
          ) : null}
        </div>

        <div
          className="simple-editor-table-selection-overlay"
          data-visible={tableSelectionOverlay.visible ? "true" : "false"}
          style={{
            top: tableSelectionOverlay.top,
            left: tableSelectionOverlay.left,
            width: tableSelectionOverlay.width,
            height: tableSelectionOverlay.height,
          }}
        />
        <div
          className="simple-editor-table-selection-handle"
          data-visible={tableSelectionOverlay.visible ? "true" : "false"}
          style={{
            top: tableSelectionOverlay.handleTop,
            left: tableSelectionOverlay.handleLeft,
          }}
        />

        <div className="simple-editor-content" style={{ minHeight }}>
          <EditorContent editor={editor} role="presentation" />
        </div>
      </EditorContext.Provider>
    </div>
  )
}
