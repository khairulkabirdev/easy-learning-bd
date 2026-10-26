"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Check,
  Clipboard,
  File as FileIcon,
  FileText,
  Film,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { StorageWorkspaceNav } from "@/components/admin/settings/StorageWorkspaceNav";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type MediaLibraryClientItem = {
  id: string;
  name: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  url: string;
  purpose: string;
  ownerType: string;
  deletable: boolean;
  storageName: string;
  storageProvider: string;
};

type LibraryResponse = {
  items: MediaLibraryClientItem[];
  total: number;
  hasMore: boolean;
  activeStorage: { name: string; provider: string };
};

type FilterKey = "all" | "images" | "videos" | "3d" | "documents";

const filters: Array<{ value: FilterKey; label: string }> = [
  { value: "all", label: "All" },
  { value: "images", label: "Images" },
  { value: "videos", label: "Videos" },
  { value: "3d", label: "3D Models" },
  { value: "documents", label: "Documents" },
];

const providerLabels: Record<string, string> = {
  "local-private": "Local private storage",
  s3: "Amazon S3",
  "cloudflare-r2": "Cloudflare R2",
  minio: "MinIO",
  "s3-compatible": "S3-compatible storage",
};

const acceptedFiles = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  ".pdf",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".glb",
  ".gltf",
  ".obj",
  ".fbx",
  ".stl",
].join(",");

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${amount >= 100 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function kindFor(file: MediaLibraryClientItem) {
  if (file.mimeType.startsWith("image/")) return "image";
  if (file.mimeType.startsWith("video/")) return "video";
  if (["glb", "gltf", "obj", "fbx", "stl"].includes(file.extension)) return "3d";
  return "document";
}

function FileKindIcon({ file, className }: { file: MediaLibraryClientItem; className?: string }) {
  const kind = kindFor(file);
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "video") return <Film className={className} />;
  if (kind === "3d") return <Box className={className} />;
  if (file.extension === "pdf") return <FileText className={className} />;
  return <FileIcon className={className} />;
}

function FilePreview({ file, detail = false }: { file: MediaLibraryClientItem; detail?: boolean }) {
  const kind = kindFor(file);
  if (kind === "image") {
    return (
      <img
        src={file.url}
        alt={file.name}
        className={cn("h-full w-full object-contain", detail ? "max-h-[54vh]" : "object-cover")}
        loading={detail ? "eager" : "lazy"}
      />
    );
  }
  if (kind === "video" && detail) {
    return <video src={file.url} controls preload="metadata" className="max-h-[54vh] max-w-full rounded-lg" />;
  }
  return (
    <div className="flex h-full min-h-28 w-full flex-col items-center justify-center gap-3 bg-muted/40 text-muted-foreground">
      <FileKindIcon file={file} className={detail ? "size-16" : "size-10"} />
      {detail ? <span className="max-w-full truncate px-4 text-sm font-medium">.{file.extension || "file"}</span> : null}
    </div>
  );
}

export function MediaLibraryClient({ initial }: { initial: LibraryResponse }) {
  const [items, setItems] = useState(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [activeStorage, setActiveStorage] = useState(initial.activeStorage);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MediaLibraryClientItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firstQueryRender = useRef(true);

  const fetchFiles = useCallback(async (options?: { append?: boolean; skip?: number }) => {
    const append = Boolean(options?.append);
    const skip = options?.skip ?? 0;
    append ? setLoadingMore(true) : setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        type: filter,
        skip: String(skip),
        take: "48",
      });
      const response = await fetch(`/api/admin/media-library?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = (await response.json()) as LibraryResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load the media library.");

      setItems((current) => (append ? [...current, ...data.items] : data.items));
      setTotal(data.total);
      setHasMore(data.hasMore);
      setActiveStorage(data.activeStorage);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load the media library.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, search]);

  useEffect(() => {
    if (firstQueryRender.current) {
      firstQueryRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchFiles({ append: false, skip: 0 });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fetchFiles, filter, search]);

  async function copySelectedUrl() {
    if (!selected) return;
    const absolute = new URL(selected.url, window.location.origin).href;
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function deleteSelected() {
    if (!selected || !selected.deletable || deleting) return;
    if (!window.confirm(`Delete “${selected.name}” permanently from storage?`)) return;

    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/media-library/${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not delete the file.");
      setSelected(null);
      await fetchFiles({ append: false, skip: 0 });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the file.");
    } finally {
      setDeleting(false);
    }
  }

  async function uploadSelectedFiles() {
    if (uploadFiles.length === 0 || uploading) return;
    setUploading(true);
    setUploadMessage("");
    setUploadError("");

    try {
      const form = new FormData();
      uploadFiles.forEach((file) => form.append("files", file));
      const response = await fetch("/api/admin/media-library", {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
      });
      const data = (await response.json()) as { uploadedCount?: number; errors?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Upload failed.");

      const count = data.uploadedCount ?? 0;
      const warning = data.errors?.length ? ` ${data.errors.join(" ")}` : "";
      setUploadMessage(`${count} file${count === 1 ? "" : "s"} uploaded.${warning}`);
      setUploadFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchFiles({ append: false, skip: 0 });
      if (!data.errors?.length) {
        window.setTimeout(() => setUploadOpen(false), 450);
      }
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StorageWorkspaceNav />
        <Button type="button" className="min-h-10 gap-2 self-stretch rounded-full px-4 sm:self-auto" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          Upload
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1 xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search files..."
                className="h-10 rounded-full pl-9"
                aria-label="Search media files"
              />
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 xl:justify-end xl:pb-0">
              <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
                {filters.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={cn(
                      "min-h-8 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm",
                      filter === item.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 shrink-0 gap-2 rounded-full"
                onClick={() => void fetchFiles({ append: false, skip: 0 })}
                disabled={loading}
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {error ? <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}

        <div className="p-3 sm:p-4">
          {loading && items.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 size-5 animate-spin" /> Loading files...
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/15 px-5 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <ImageIcon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No files found</p>
                <p className="mt-1 text-sm text-muted-foreground">Upload a file or change your search/filter.</p>
              </div>
              <Button type="button" variant="outline" className="min-h-10 rounded-full" onClick={() => setUploadOpen(true)}>
                <Upload className="size-4" /> Upload files
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    setSelected(file);
                    setCopied(false);
                  }}
                  className="group min-w-0 overflow-hidden rounded-xl border bg-background text-left shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="aspect-square overflow-hidden bg-muted/30">
                    <FilePreview file={file} />
                  </div>
                  <div className="min-w-0 border-t px-2.5 py-2">
                    <p className="truncate text-xs font-medium sm:text-sm" title={file.name}>{file.name}</p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">
                      {formatBytes(file.sizeBytes)} · {formatDate(file.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {total} file{total === 1 ? "" : "s"} · {providerLabels[activeStorage.provider] ?? activeStorage.name}
            </span>
            {hasMore ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-9 rounded-full px-4"
                disabled={loadingMore}
                onClick={() => void fetchFiles({ append: true, skip: items.length })}
              >
                {loadingMore ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-3xl md:p-5">
          {selected ? (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle className="truncate text-lg" title={selected.name}>{selected.name}</DialogTitle>
                <DialogDescription>File details and storage actions.</DialogDescription>
              </DialogHeader>

              <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-muted/30 p-2">
                  <FilePreview file={selected} detail />
                </div>

                <div className="min-w-0 space-y-4">
                  <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="min-w-0 truncate font-medium">{kindFor(selected) === "3d" ? "3D Model" : selected.mimeType}</dd>
                    <dt className="text-muted-foreground">Size</dt>
                    <dd>{formatBytes(selected.sizeBytes)}</dd>
                    <dt className="text-muted-foreground">Modified</dt>
                    <dd>{formatDate(selected.updatedAt)}</dd>
                    {selected.width > 0 && selected.height > 0 ? (
                      <>
                        <dt className="text-muted-foreground">Dimensions</dt>
                        <dd>{selected.width} × {selected.height}</dd>
                      </>
                    ) : null}
                    <dt className="text-muted-foreground">Storage</dt>
                    <dd className="min-w-0 truncate">{selected.storageName}</dd>
                    <dt className="text-muted-foreground">URL</dt>
                    <dd className="min-w-0 break-all font-mono text-[11px] text-muted-foreground">{selected.url}</dd>
                  </dl>

                  <div className="space-y-2">
                    <Button type="button" variant="outline" className="min-h-10 w-full justify-center gap-2 rounded-full border-primary/60" onClick={() => void copySelectedUrl()}>
                      {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
                      {copied ? "Copied" : "Copy URL"}
                    </Button>
                    <Button type="button" variant="outline" className="min-h-10 w-full justify-center rounded-full" onClick={() => window.open(selected.url, "_blank", "noopener,noreferrer")}>
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="min-h-10 w-full justify-center gap-2 rounded-full"
                      onClick={() => void deleteSelected()}
                      disabled={!selected.deletable || deleting}
                      title={selected.deletable ? "Delete file" : "Files linked to learning content must be removed from their content editor."}
                    >
                      {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      {selected.deletable ? (deleting ? "Deleting..." : "Delete") : "Linked to content"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(open) => {
        setUploadOpen(open);
        if (!open && !uploading) {
          setUploadError("");
          setUploadMessage("");
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload to Media Library</DialogTitle>
            <DialogDescription>
              Images are optimized to WebP. You can also store videos, documents, archives, and common 3D model files in the active storage configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedFiles}
              className="sr-only"
              onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []).slice(0, 10))}
            />
            <button
              type="button"
              className="flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-5 text-center transition hover:border-primary/50 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="size-5" />
              </div>
              <div>
                <p className="font-medium">Choose files</p>
                <p className="mt-1 text-xs text-muted-foreground">Up to 10 files. Image, video, and 3D model limits follow Storage Settings; documents use the server safety limit.</p>
              </div>
            </button>

            {uploadFiles.length > 0 ? (
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                {uploadFiles.map((file, index) => (
                  <div key={`${file.name}-${file.lastModified}-${index}`} className="flex min-w-0 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs">
                    <span className="min-w-0 truncate">{file.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {uploadError ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-sm text-destructive">{uploadError}</p> : null}
            {uploadMessage ? <p className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-sm text-foreground">{uploadMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-10" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
            <Button type="button" className="min-h-10 gap-2" onClick={() => void uploadSelectedFiles()} disabled={uploadFiles.length === 0 || uploading}>
              {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "Uploading..." : `Upload${uploadFiles.length ? ` (${uploadFiles.length})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
