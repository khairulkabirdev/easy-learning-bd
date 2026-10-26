"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { loadAdminPagedRecords } from "@/app/admin/pagination/actions";
import type {
  AdminPagedResource,
  AdminSortDirection,
} from "@/lib/admin/pagination-types";

export function useAdminPagedRecords<T>({
  resource,
  initialRows,
  initialTotal,
  filters,
  search = "",
  sort,
  direction,
  enabled = true,
  initialPage = 1,
  initialPageSize = 12,
  refreshKey = 0,
}: {
  resource: AdminPagedResource;
  initialRows: T[];
  initialTotal: number;
  filters?: Record<string, string | undefined>;
  search?: string;
  sort?: string;
  direction?: AdminSortDirection;
  enabled?: boolean;
  initialPage?: number;
  initialPageSize?: number;
  refreshKey?: string | number;
}) {
  const [rows, setRows] = useState<T[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const filtersKey = JSON.stringify(filters ?? {});
  const stableFilters = useMemo(() => JSON.parse(filtersKey) as Record<string, string | undefined>, [filtersKey]);
  const skipInitialFetch = useRef(enabled);

  const reload = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setTotal(0);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await loadAdminPagedRecords({
        resource,
        page,
        pageSize,
        search,
        sort,
        direction,
        filters: stableFilters,
      });
      setRows(result.rows as T[]);
      setTotal(result.total);
      if (result.page !== page) setPage(result.page);
    } catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : "Could not load records.");
    } finally {
      setLoading(false);
    }
  }, [direction, enabled, page, pageSize, resource, search, sort, stableFilters]);

  useEffect(() => {
    if (!enabled) {
      skipInitialFetch.current = false;
      setRows([]);
      setTotal(0);
      setError("");
      setPage(1);
      return;
    }
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    const timer = window.setTimeout(() => void reload(), search.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [enabled, filtersKey, page, pageSize, refreshKey, reload, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min((page - 1) * pageSize + rows.length, total);

  return {
    rows,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    firstShown,
    lastShown,
    loading,
    error,
    reload,
  };
}
