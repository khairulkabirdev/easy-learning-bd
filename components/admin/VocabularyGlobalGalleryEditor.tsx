"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical, Images, LoaderCircle, Trash2, UploadCloud, X } from "lucide-react";

import { VocabularyImageGallery, type VocabularyGalleryImage } from "@/components/app/VocabularyImageGallery";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BATCH = 12;
const MAX_GALLERY = 60;

type PendingImage = { id: number; file: File; previewUrl: string };

/**
 * Shared gallery for an entire Vocabulary block, not a gallery for each word.
 * Word images remain one optional image per vocabulary entry.
 */
export function VocabularyGlobalGalleryEditor({
  images,
  busy,
  onUpload,
  onReorder,
  onDelete,
}: {
  images: VocabularyGalleryImage[];
  busy: boolean;
  onUpload: (files: File[]) => Promise<boolean>;
  onReorder: (imageIds: string[]) => Promise<unknown>;
  onDelete: (imageId: string) => Promise<unknown>;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const previewUrls = useRef<Set<string>>(new Set());
  const nextPendingId = useRef(0);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function releasePending(imagesToRelease: PendingImage[]) {
    for (const image of imagesToRelease) {
      URL.revokeObjectURL(image.previewUrl);
      previewUrls.current.delete(image.previewUrl);
    }
  }

  function addFiles(files: File[]) {
    if (!files.length || busy) return;
    const valid = files.filter((file) => ACCEPTED_TYPES.has(file.type) && file.size > 0);
    if (valid.length !== files.length) {
      setLocalError("Only non-empty JPG, PNG and WebP images can be added.");
    } else {
      setLocalError(null);
    }
    const capacity = Math.max(0, Math.min(MAX_BATCH - pending.length, MAX_GALLERY - images.length - pending.length));
    if (valid.length > capacity) {
      setLocalError(`You can stage up to ${MAX_BATCH} images per upload, with ${MAX_GALLERY} images per gallery.`);
    }
    if (!capacity) return;
    const existing = new Set(pending.map(({ file }) => `${file.name}:${file.size}:${file.lastModified}`));
    const toAdd = valid.filter((file) => {
      const signature = `${file.name}:${file.size}:${file.lastModified}`;
      if (existing.has(signature)) return false;
      existing.add(signature);
      return true;
    }).slice(0, capacity);
    const staged = toAdd.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { id: ++nextPendingId.current, file, previewUrl };
    });
    setPending((current) => [...current, ...staged]);
  }

  function clearPending() {
    releasePending(pending);
    setPending([]);
    setLocalError(null);
  }

  async function uploadPending() {
    if (!pending.length || busy) return;
    const saved = await onUpload(pending.map((image) => image.file));
    if (saved) clearPending();
  }

  function dropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDropActive(false);
    if (event.dataTransfer.files.length) addFiles(Array.from(event.dataTransfer.files));
  }

  function reorder(imageId: string, targetId: string) {
    const ordered = images.map((image) => image.id);
    const sourceIndex = ordered.indexOf(imageId);
    const targetIndex = ordered.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex || busy) return;
    ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, imageId);
    void onReorder(ordered);
  }

  function reorderByStep(index: number, offset: number) {
    const other = index + offset;
    if (other < 0 || other >= images.length || busy) return;
    const ids = images.map((image) => image.id);
    [ids[index], ids[other]] = [ids[other], ids[index]];
    void onReorder(ids);
  }

  const availableSlots = MAX_GALLERY - images.length;

  return (
    <section className="space-y-4 rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-label="Vocabulary Global Gallery">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Images className="size-5 text-primary" aria-hidden="true" />
            <h3 className="font-semibold">Vocabulary Global Gallery</h3>
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            Shared images for this Vocabulary block, separate from each word's single image.
            Students browse the gallery below the word list.
          </p>
        </div>
        <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {images.length} / {MAX_GALLERY} images
        </span>
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        aria-label="Choose images for the Vocabulary Global Gallery"
        disabled={busy || availableSlots <= 0}
        onChange={(event) => {
          addFiles(Array.from(event.currentTarget.files || []));
          event.currentTarget.value = "";
        }}
      />

      <div
        className={cn(
          "rounded-xl border-2 border-dashed bg-background transition-colors",
          dropActive && !busy ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          (busy || availableSlots <= 0) && "opacity-60",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy && availableSlots > 0) setDropActive(true);
        }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? "none" : "copy"; }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false);
        }}
        onDrop={dropFiles}
      >
        <button
          type="button"
          className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl p-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-40"
          onClick={() => fileInput.current?.click()}
          disabled={busy || availableSlots <= 0}
        >
          <span className="rounded-xl bg-primary/10 p-3 text-primary"><UploadCloud className="size-6" aria-hidden="true" /></span>
          <span className="text-sm font-semibold">Drag and drop images here, or click to browse</span>
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP · Up to {MAX_BATCH} at once · {Math.max(0, availableSlots)} slots left · Size limits follow Storage Settings</span>
        </button>
      </div>

      {localError ? <p role="alert" className="text-sm text-destructive">{localError}</p> : null}

      {pending.length ? (
        <div className="space-y-3 rounded-xl border bg-background p-3 sm:p-4" aria-label="Images ready to upload">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Upload preview</p>
              <p className="text-xs text-muted-foreground">Review the {pending.length} selected image{pending.length === 1 ? "" : "s"} before uploading.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearPending} disabled={busy}>Clear selection</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {pending.map((image) => (
              <div key={image.id} className="relative min-w-0 overflow-hidden rounded-lg border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.previewUrl} alt={`Upload preview: ${image.file.name}`} className="h-28 w-full object-contain sm:h-32" />
                <span className="block truncate border-t bg-background px-2 py-1.5 text-xs" title={image.file.name}>{image.file.name}</span>
                <button
                  type="button"
                  className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-background/95 shadow-sm hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Remove ${image.file.name} from upload`}
                  disabled={busy}
                  onClick={() => {
                    releasePending([image]);
                    setPending((current) => current.filter((candidate) => candidate.id !== image.id));
                  }}
                ><X className="size-4" /></button>
              </div>
            ))}
          </div>
          <Button type="button" onClick={() => void uploadPending()} disabled={busy} className="w-full sm:w-auto">
            {busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <UploadCloud className="mr-2 size-4" />}
            {busy ? "Uploading images..." : `Upload ${pending.length} image${pending.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      ) : null}

      {images.length ? (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Gallery preview and order</h4>
            <p className="text-xs text-muted-foreground">Drag a thumbnail to reorder. On touchscreens, use the arrow buttons. Click the preview to zoom.</p>
          </div>
          <VocabularyImageGallery title="Vocabulary gallery" images={images} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Reorder gallery images">
            {images.map((image, index) => (
              <div
                key={image.id}
                className={cn("flex min-w-0 items-center gap-2 rounded-xl border bg-background p-2 transition-colors", draggedImageId === image.id && "border-primary bg-primary/5")}
                onDragOver={(event) => { if (draggedImageId && !busy) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }}
                onDrop={(event) => {
                  if (!draggedImageId || busy) return;
                  event.preventDefault();
                  reorder(draggedImageId, image.id);
                  setDraggedImageId(null);
                }}
              >
                <span
                  className="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-lg border text-muted-foreground active:cursor-grabbing"
                  draggable={!busy}
                  title={`Drag image ${index + 1} to reorder`}
                  aria-label={`Drag image ${index + 1} to reorder`}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", image.id);
                    setDraggedImageId(image.id);
                  }}
                  onDragEnd={() => setDraggedImageId(null)}
                ><GripVertical className="size-4" /></span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={`Gallery image ${index + 1}`} className="size-12 shrink-0 rounded-md object-cover" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">Image {index + 1}</span>
                <Button type="button" variant="outline" size="icon-sm" className="size-9 shrink-0" aria-label={`Move image ${index + 1} earlier`}
                  disabled={busy || index === 0} onClick={() => reorderByStep(index, -1)}><ArrowUp className="size-4" /></Button>
                <Button type="button" variant="outline" size="icon-sm" className="size-9 shrink-0" aria-label={`Move image ${index + 1} later`}
                  disabled={busy || index === images.length - 1} onClick={() => reorderByStep(index, 1)}><ArrowDown className="size-4" /></Button>
                <Button type="button" variant="outline" size="icon-sm" className="size-9 shrink-0" aria-label={`Delete gallery image ${index + 1}`}
                  disabled={busy} onClick={() => void onDelete(image.id)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-background px-4 py-3 text-sm text-muted-foreground">No gallery images yet. Choose or drop images above to create the gallery.</div>
      )}
      {busy ? <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Updating gallery...</p> : null}
    </section>
  );
}
