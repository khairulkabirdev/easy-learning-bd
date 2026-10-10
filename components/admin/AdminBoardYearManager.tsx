"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  bulkAcademicYearAction,
  bulkBoardAction,
  deleteAcademicYear,
  deleteBoard,
  saveAcademicYear,
  saveBoard,
} from "@/app/admin/board/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminTableSearchInput } from "@/components/admin/AdminTableSearchInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

export type AdminBoardYearRecord = {
  id: string;
  label: string;
  numericValue?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  kind: "board" | "year";
  records: AdminBoardYearRecord[];
};

type SortKey = "label" | "status" | "createdAt" | "updatedAt";
type SortState = { key: SortKey; direction: "asc" | "desc" } | null;
type StatusFilter = "all" | "active" | "inactive";
type PendingDelete = { type: "single"; id: string } | { type: "bulk" } | null;

function buildVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push("ellipsis-start");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("ellipsis-end");
  pages.push(totalPages);
  return pages;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function compareValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

export function AdminBoardYearManager({ kind, records }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortState>({ key: "label", direction: kind === "year" ? "desc" : "asc" });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBoardYearRecord | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fieldError, setFieldError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const entityLabel = kind === "board" ? "Board" : "Year";
  const pageTitle = kind === "board" ? "Boards" : "Years";

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    let rows = records.filter((record) => {
      if (statusFilter === "active" && !record.isActive) return false;
      if (statusFilter === "inactive" && record.isActive) return false;
      if (!normalizedQuery) return true;
      return record.label.toLocaleLowerCase().includes(normalizedQuery);
    });

    if (sort) {
      rows = [...rows].sort((left, right) => {
        let leftValue: string | number;
        let rightValue: string | number;
        if (sort.key === "status") {
          leftValue = left.isActive ? 1 : 0;
          rightValue = right.isActive ? 1 : 0;
        } else if (sort.key === "createdAt" || sort.key === "updatedAt") {
          leftValue = new Date(left[sort.key]).getTime();
          rightValue = new Date(right[sort.key]).getTime();
        } else {
          leftValue = kind === "year" ? left.numericValue ?? Number(left.label) : left.label;
          rightValue = kind === "year" ? right.numericValue ?? Number(right.label) : right.label;
        }
        const result = compareValues(leftValue, rightValue);
        return sort.direction === "asc" ? result : -result;
      });
    }

    return rows;
  }, [kind, query, records, sort, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const pagedRows = filteredRows.slice(startIndex, startIndex + pageSize);
  const visiblePages = buildVisiblePages(safeCurrentPage, totalPages);
  const firstShown = filteredRows.length ? startIndex + 1 : 0;
  const lastShown = Math.min(startIndex + pageSize, filteredRows.length);
  const selectedVisibleCount = pagedRows.filter((row) => selectedIds.has(row.id)).length;
  const allVisibleSelected = pagedRows.length > 0 && selectedVisibleCount === pagedRows.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, pageSize, records]);

  useEffect(() => {
    setSelectedIds((current) => {
      const validIds = new Set(records.map((record) => record.id));
      return new Set([...current].filter((id) => validIds.has(id)));
    });
  }, [records]);

  function openCreate() {
    setEditing(null);
    setFieldValue("");
    setIsActive(true);
    setFieldError("");
    setEditorOpen(true);
  }

  function openEdit(record: AdminBoardYearRecord) {
    setEditing(record);
    setFieldValue(kind === "year" ? String(record.numericValue ?? record.label) : record.label);
    setIsActive(record.isActive);
    setFieldError("");
    setEditorOpen(true);
  }

  function validateValue() {
    const trimmed = fieldValue.trim();
    if (!trimmed) {
      setFieldError(kind === "board" ? "Board name is required." : "Year is required.");
      return false;
    }
    if (kind === "year") {
      const year = Number(trimmed);
      if (!Number.isInteger(year) || year < 1 || year > 9999) {
        setFieldError("Enter a valid whole-number year.");
        return false;
      }
    }
    setFieldError("");
    return true;
  }

  function submitEditor() {
    if (!validateValue()) return;
    startTransition(async () => {
      try {
        if (kind === "board") {
          await saveBoard({ id: editing?.id, name: fieldValue.trim(), isActive });
        } else {
          await saveAcademicYear({ id: editing?.id, year: Number(fieldValue), isActive });
        }
        setEditorOpen(false);
        toast.add({
          title: `${entityLabel} ${editing ? "updated" : "created"}`,
          type: "success",
        });
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unable to save ${entityLabel.toLowerCase()}.`;
        setFieldError(message);
        toast.add({ title: "Save failed", description: message, type: "error" });
      }
    });
  }

  function runSingleDelete(id: string) {
    startTransition(async () => {
      try {
        if (kind === "board") await deleteBoard(id);
        else await deleteAcademicYear(id);
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        setPendingDelete(null);
        toast.add({ title: `${entityLabel} deleted`, type: "success" });
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unable to delete ${entityLabel.toLowerCase()}.`;
        toast.add({ title: "Delete failed", description: message, type: "error" });
      }
    });
  }

  function runBulkAction(action: "activate" | "deactivate" | "delete") {
    const ids = [...selectedIds];
    if (!ids.length) return;
    startTransition(async () => {
      try {
        if (kind === "board") await bulkBoardAction({ ids, action });
        else await bulkAcademicYearAction({ ids, action });
        setSelectedIds(new Set());
        setPendingDelete(null);
        toast.add({
          title:
            action === "delete"
              ? `${ids.length} ${entityLabel.toLowerCase()} record${ids.length === 1 ? "" : "s"} deleted`
              : `${ids.length} record${ids.length === 1 ? "" : "s"} ${action === "activate" ? "activated" : "deactivated"}`,
          type: "success",
        });
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bulk action failed.";
        toast.add({ title: "Bulk action failed", description: message, type: "error" });
      }
    });
  }

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });
    setCurrentPage(1);
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sort?.key !== column) return <ArrowUpDown className="size-3.5 text-muted-foreground" />;
    return sort.direction === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
  }

  function toggleVisibleSelection(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const row of pagedRows) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{pageTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Manage {kind === "board" ? "education boards" : "academic years"}, status, filters, and bulk actions.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Add {entityLabel}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <AdminTableSearchInput
              value={query}
              onChange={setQuery}
              placeholder={kind === "board" ? "Search board name..." : "Search year..."}
              ariaLabel={`Search ${pageTitle.toLowerCase()}`}
              className="sm:max-w-sm"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <Badge variant="secondary">{selectedIds.size} selected</Badge>
                <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => runBulkAction("activate")}>
                  <CheckCircle2 className="size-4" />
                  Activate
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => runBulkAction("deactivate")}>
                  <XCircle className="size-4" />
                  Deactivate
                </Button>
                <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={() => setPendingDelete({ type: "bulk" })}>
                  <Trash2 className="size-4" />
                  Delete selected
                </Button>
              </>
            ) : null}
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <NativeSelect
              value={String(pageSize)}
              onChange={(event) => setPageSize(Number(event.target.value))}
              size="sm"
              aria-label="Rows per page"
            >
              {[10, 25, 50].map((size) => (
                <NativeSelectOption key={size} value={String(size)}>
                  {size}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => toggleVisibleSelection(Boolean(checked))}
                    aria-label="Select visible records"
                  />
                </TableHead>
                <TableHead className="w-14 text-center">#</TableHead>
                <TableHead>
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2" onClick={() => toggleSort("label")}>
                    {entityLabel}
                    <SortIcon column="label" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2" onClick={() => toggleSort("status")}>
                    Status
                    <SortIcon column="status" />
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2" onClick={() => toggleSort("createdAt")}>
                    Created
                    <SortIcon column="createdAt" />
                  </Button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2" onClick={() => toggleSort("updatedAt")}>
                    Updated
                    <SortIcon column="updatedAt" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                    No {pageTitle.toLowerCase()} found.
                  </TableCell>
                </TableRow>
              ) : (
                pagedRows.map((record, pageIndex) => (
                  <TableRow key={record.id} data-state={selectedIds.has(record.id) ? "selected" : undefined}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={(checked) =>
                          setSelectedIds((current) => {
                            const next = new Set(current);
                            if (checked) next.add(record.id);
                            else next.delete(record.id);
                            return next;
                          })
                        }
                        aria-label={`Select ${record.label}`}
                      />
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">{startIndex + pageIndex + 1}</TableCell>
                    <TableCell className="font-medium">{record.label}</TableCell>
                    <TableCell>
                      <Badge variant={record.isActive ? "default" : "secondary"}>
                        {record.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(record.createdAt)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{formatDate(record.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(record)}>
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => setPendingDelete({ type: "single", id: record.id })}>
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {firstShown}-{lastShown} of {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}
            {query.trim() || statusFilter !== "all" ? ` (${records.length} total)` : ""}.
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

      <Dialog open={editorOpen} onOpenChange={(open) => !isPending && setEditorOpen(open)}>
        <DialogContent
          className="w-[calc(100vw-2rem)] max-w-lg sm:max-w-lg"
          style={{ maxWidth: "32rem" }}
        >
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${entityLabel}` : `Add ${entityLabel}`}</DialogTitle>
            <DialogDescription>
              {kind === "board" ? "Enter the board name and choose its status." : "Enter the numeric year and choose its status."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <Field data-invalid={Boolean(fieldError)}>
              <FieldLabel htmlFor="master-value">{kind === "board" ? "Board name" : "Year number"}</FieldLabel>
              <Input
                id="master-value"
                type={kind === "year" ? "number" : "text"}
                inputMode={kind === "year" ? "numeric" : undefined}
                value={fieldValue}
                onChange={(event) => {
                  setFieldValue(event.target.value);
                  if (fieldError) setFieldError("");
                }}
                placeholder={kind === "board" ? "e.g. Dhaka Board" : "e.g. 2027"}
                min={kind === "year" ? 1 : undefined}
                max={kind === "year" ? 9999 : undefined}
                disabled={isPending}
                className={
                  kind === "year"
                    ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    : undefined
                }
                autoFocus
              />
              <FieldError>{fieldError}</FieldError>
            </Field>

            <Field orientation="horizontal" className="rounded-lg border p-3">
              <div className="flex-1">
                <FieldLabel htmlFor="master-status">Active status</FieldLabel>
                <FieldDescription>Inactive records stay saved but can be filtered out.</FieldDescription>
              </div>
              <Switch id="master-status" checked={isActive} onCheckedChange={setIsActive} disabled={isPending} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submitEditor} disabled={isPending}>
              {isPending ? "Saving..." : editing ? "Save changes" : `Create ${entityLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !isPending && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.type === "bulk" ? "Delete selected records?" : `Delete ${entityLabel.toLowerCase()}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.type === "bulk"
                ? `This will permanently delete ${selectedIds.size} selected record${selectedIds.size === 1 ? "" : "s"}.`
                : `This will permanently delete this ${entityLabel.toLowerCase()} record.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (pendingDelete?.type === "bulk") runBulkAction("delete");
                else if (pendingDelete?.type === "single") runSingleDelete(pendingDelete.id);
              }}
            >
              <Trash2 className="size-4" />
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
