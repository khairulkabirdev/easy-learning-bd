"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";

import { loadAdminPagedRecords } from "@/app/admin/pagination/actions";
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
import type { AdminPagedResource } from "@/lib/admin/pagination-types";
import { cn } from "@/lib/utils";

export type AdminRecordDataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T, originalIndex: number) => ReactNode;
  sortValue?: (row: T) => string | number | Date | null | undefined;
  headerClassName?: string;
  cellClassName?: string;
};

export type AdminRecordSortState = {
  columnId: string;
  direction: "asc" | "desc";
} | null;

type IndexedRow<T> = {
  row: T;
  originalIndex: number;
};

type ServerMode = {
  resource: AdminPagedResource;
  filters?: Record<string, string | undefined>;
  total: number;
  enabled?: boolean;
  refreshKey?: string | number;
};

type Props<T extends { id: string }> = {
  rows: T[];
  columns: AdminRecordDataTableColumn<T>[];
  searchValue: (row: T) => string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  defaultSort?: AdminRecordSortState;
  className?: string;
  showRowNumber?: boolean;
  rowNumberHeader?: string;
  server?: ServerMode;
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
  server,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<AdminRecordSortState>(defaultSort);
  const [serverRows, setServerRows] = useState<T[]>(rows);
  const [serverTotal, setServerTotal] = useState(server?.total ?? rows.length);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const skipInitialServerFetch = useRef(Boolean(server && server.enabled !== false));
  const filtersKey = JSON.stringify(server?.filters ?? {});
  const serverFilters = useMemo(
    () => JSON.parse(filtersKey) as Record<string, string | undefined>,
    [filtersKey],
  );
  const isServerMode = Boolean(server);
  const isServerEnabled = server?.enabled !== false;
  const serverResource = server?.resource;
  const serverRefreshKey = server?.refreshKey;

  const indexedRows = useMemo<IndexedRow<T>[]>(
    () => rows.map((row, originalIndex) => ({ row, originalIndex })),
    [rows],
  );

  const filteredRows = useMemo(() => {
    if (isServerMode) return [];
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
  }, [columns, indexedRows, isServerMode, query, searchValue, sort]);

  const localTotalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const serverTotalPages = Math.max(1, Math.ceil(serverTotal / pageSize));
  const totalPages = isServerMode ? serverTotalPages : localTotalPages;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const localPagedRows = filteredRows.slice(startIndex, startIndex + pageSize);
  const displayedRows: IndexedRow<T>[] = isServerMode
    ? serverRows.map((row, pageIndex) => ({ row, originalIndex: startIndex + pageIndex }))
    : localPagedRows;
  const totalRecords = isServerMode ? serverTotal : filteredRows.length;
  const firstShown = totalRecords === 0 ? 0 : startIndex + 1;
  const lastShown = Math.min(startIndex + displayedRows.length, totalRecords);
  const visiblePages = buildVisiblePages(safeCurrentPage, totalPages);

  useEffect(() => {
    if (!isServerMode) setCurrentPage(1);
  }, [isServerMode, rows]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!serverResource) return;
    if (!isServerEnabled) {
      setServerRows([]);
      setServerTotal(0);
      setServerError("");
      setCurrentPage(1);
      return;
    }

    if (skipInitialServerFetch.current) {
      skipInitialServerFetch.current = false;
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setServerLoading(true);
      setServerError("");
      void loadAdminPagedRecords({
        resource: serverResource,
        page: safeCurrentPage,
        pageSize,
        search: query,
        sort: sort?.columnId,
        direction: sort?.direction,
        filters: serverFilters,
      })
        .then((result) => {
          if (cancelled) return;
          setServerRows(result.rows as T[]);
          setServerTotal(result.total);
          if (result.page !== safeCurrentPage) setCurrentPage(result.page);
        })
        .catch((cause) => {
          if (cancelled) return;
          setServerError(cause instanceof Error ? cause.message : "Could not load records.");
          setServerRows([]);
        })
        .finally(() => {
          if (!cancelled) setServerLoading(false);
        });
    }, query.trim() ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    filtersKey,
    isServerEnabled,
    pageSize,
    query,
    safeCurrentPage,
    serverRefreshKey,
    serverResource,
    serverFilters,
    sort,
  ]);

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
    <div className={cn("space-y-4", className)} aria-busy={serverLoading}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminTableSearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setCurrentPage(1);
          }}
          placeholder={searchPlaceholder}
          ariaLabel="Search records"
          className="sm:max-w-sm"
        />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {serverLoading ? (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Loader2 className="size-3.5 animate-spin" /> Loading
            </span>
          ) : null}
          <span className="whitespace-nowrap">Rows per page</span>
          <NativeSelect
            value={String(pageSize)}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setCurrentPage(1);
            }}
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

      {serverError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      ) : null}

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
            {displayedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (showRowNumber ? 1 : 0)}
                  className="h-28 text-center text-muted-foreground"
                >
                  {serverLoading ? "Loading records..." : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map(({ row, originalIndex }, pageIndex) => (
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
          Showing {firstShown}-{lastShown} of {totalRecords} record{totalRecords === 1 ? "" : "s"}
          {!isServerMode && query.trim() ? ` (${rows.length} total)` : ""}.
        </p>

        {totalPages > 1 ? (
          <Pagination className="mx-0 w-auto justify-start sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={safeCurrentPage === 1 || serverLoading}
                  className={safeCurrentPage === 1 || serverLoading ? "pointer-events-none opacity-50" : undefined}
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
                      aria-disabled={serverLoading}
                      className={serverLoading ? "pointer-events-none opacity-60" : undefined}
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
                  aria-disabled={safeCurrentPage === totalPages || serverLoading}
                  className={safeCurrentPage === totalPages || serverLoading ? "pointer-events-none opacity-50" : undefined}
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
