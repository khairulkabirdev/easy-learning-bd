"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

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
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"

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
        background: "var(--tt-toolbar-bg-color, #ffffff)",
        backgroundColor: "var(--tt-toolbar-bg-color, #ffffff)",
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
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().addRowBefore().run())}
        >
          <TableRowBeforeIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Add row after"
          tooltip="Add row after"
          disabled={!can.addRowAfter()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().addRowAfter().run())}
        >
          <TableRowAfterIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Delete row"
          tooltip="Delete row"
          disabled={!can.deleteRow()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().deleteRow().run())}
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
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().addColumnBefore().run())}
        >
          <TableColumnBeforeIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Add column after"
          tooltip="Add column after"
          disabled={!can.addColumnAfter()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().addColumnAfter().run())}
        >
          <TableColumnAfterIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Delete column"
          tooltip="Delete column"
          disabled={!can.deleteColumn()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().deleteColumn().run())}
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
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().mergeCells().run())}
        >
          <TableMergeIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Split cell"
          tooltip="Split cell"
          disabled={!can.splitCell()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().splitCell().run())}
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
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().toggleHeaderRow().run())}
        >
          <TableHeaderRowIcon className="tiptap-button-icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Toggle header column"
          tooltip="Toggle header column"
          disabled={!can.toggleHeaderColumn()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().toggleHeaderColumn().run())}
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
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAction(() => editor.chain().focus().deleteTable().run())}
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
        <ThemeToggle />
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
  const searchAndReplaceButtonRef = useRef<HTMLButtonElement>(null)
  const [tableToolbarState, setTableToolbarState] = useState<TableToolbarState>({
    visible: false,
    top: 0,
    left: 0,
    placement: "top",
  })

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

    const updateTableToolbar = () => {
      const wrapper = wrapperRef.current
      const toolbar = tableToolbarRef.current

      if (!wrapper || !toolbar || !editor.isEditable) {
        setTableToolbarState((current) =>
          current.visible ? { ...current, visible: false } : current
        )
        return
      }

      const tableState = getTableSelectionState(editor)

      if (!tableState.isInsideTable || tableState.tablePos == null) {
        setTableToolbarState((current) =>
          current.visible ? { ...current, visible: false } : current
        )
        return
      }

      const rootSelection =
        editor.view.root instanceof Document
          ? editor.view.root.getSelection()
          : window.getSelection()
      const anchorElement =
        rootSelection?.anchorNode instanceof HTMLElement
          ? rootSelection.anchorNode
          : rootSelection?.anchorNode?.parentElement ?? null
      const selectedCell = anchorElement?.closest("td, th")
      const selectedTableFromCell = selectedCell?.closest("table")
      const selectedTableFromRange = editor.view.dom.querySelector(
        "td.selectedCell, th.selectedCell"
      )?.closest("table")
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

        <div className="simple-editor-content" style={{ minHeight }}>
          <EditorContent editor={editor} role="presentation" />
        </div>
      </EditorContext.Provider>
    </div>
  )
}
