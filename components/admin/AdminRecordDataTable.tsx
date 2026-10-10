"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminTableSearchInput } from "@/components/admin/AdminTableSearchInput";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type AdminRecordDataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T, originalIndex: number) => ReactNode;
  sortValue?: (row: T) => string | number | Date | null | undefined;
  headerClassName?: string;
  cellClassName?: string;
};

type SortState = {
  columnId: string;
  direction: "asc" | "desc";
} | null;

type IndexedRow<T> = {
  row: T;
  originalIndex: number;
};

type Props<T extends { id: string }> = {
  rows: T[];
  columns: AdminRecordDataTableColumn<T>[];
  searchValue: (row: T) => string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  defaultSort?: SortState;
  className?: string;
  showRowNumber?: boolean;
  rowNumberHeader?: string;
};

function compareValues(a: unknown, b: unknown) {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function buildVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis-start");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("ellipsis-end");
  pages.push(totalPages);

  return pages;
}

export function AdminRecordDataTable<T extends { id: string }>({
  rows,
  columns,
  searchValue,
  searchPlaceholder = "Search records...",
  emptyMessage = "No records found.",
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  defaultSort = null,
  className,
  showRowNumber = true,
  rowNumberHeader = "#",
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<SortState>(defaultSort);

  const indexedRows = useMemo<IndexedRow<T>[]>(
    () => rows.map((row, originalIndex) => ({ row, originalIndex })),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matches = normalizedQuery
      ? indexedRows.filter(({ row }) => searchValue(row).toLocaleLowerCase().includes(normalizedQuery))
      : indexedRows;

    if (!sort) return matches;
    const column = columns.find((item) => item.id === sort.columnId);
    if (!column?.sortValue) return matches;

    return [...matches].sort((left, right) => {
      const result = compareValues(column.sortValue?.(left.row), column.sortValue?.(right.row));
      if (result === 0) return left.originalIndex - right.originalIndex;
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, indexedRows, query, searchValue, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const pagedRows = filteredRows.slice(startIndex, startIndex + pageSize);
  const firstShown = filteredRows.length === 0 ? 0 : startIndex + 1;
  const lastShown = Math.min(startIndex + pageSize, filteredRows.length);
  const visiblePages = buildVisiblePages(safeCurrentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize, rows]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function toggleSort(column: AdminRecordDataTableColumn<T>) {
    if (!column.sortValue) return;
    setSort((current) => {
      if (!current || current.columnId !== column.id) {
        return { columnId: column.id, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { columnId: column.id, direction: "desc" };
      }
      return null;
    });
    setCurrentPage(1);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminTableSearchInput
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
          ariaLabel="Search records"
          className="sm:max-w-sm"
        />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">Rows per page</span>
          <NativeSelect
            value={String(pageSize)}
            onChange={(event) => setPageSize(Number(event.target.value))}
            size="sm"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <NativeSelectOption key={size} value={String(size)}>
                {size}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {showRowNumber ? (
                <TableHead className="w-14 text-center">{rowNumberHeader}</TableHead>
              ) : null}
              {columns.map((column) => {
                const activeSort = sort?.columnId === column.id ? sort.direction : null;
                return (
                  <TableHead key={column.id} className={column.headerClassName}>
                    {column.sortValue ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 px-2"
                        onClick={() => toggleSort(column)}
                      >
                        {column.header}
                        {activeSort === "asc" ? (
                          <ArrowUp className="size-3.5" />
                        ) : activeSort === "desc" ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (showRowNumber ? 1 : 0)}
                  className="h-28 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map(({ row, originalIndex }, pageIndex) => (
                <TableRow key={row.id}>
                  {showRowNumber ? (
                    <TableCell className="w-14 text-center font-medium tabular-nums text-muted-foreground">
                      {startIndex + pageIndex + 1}
                    </TableCell>
                  ) : null}
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.cellClassName}>
                      {column.cell(row, originalIndex)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {firstShown}-{lastShown} of {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}
          {query.trim() ? ` (${rows.length} total)` : ""}.
        </p>

        {totalPages > 1 ? (
          <Pagination className="mx-0 w-auto justify-start sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={safeCurrentPage === 1}
                  className={safeCurrentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                />
              </PaginationItem>

              {visiblePages.map((page) =>
                typeof page === "number" ? (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === safeCurrentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={safeCurrentPage === totalPages}
                  className={safeCurrentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </div>
    </div>
  );
}
