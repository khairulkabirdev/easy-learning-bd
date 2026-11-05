"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Expand, Images, Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type VocabularyGalleryImage = {
  id: string;
  url: string;
  path?: string;
  sortOrder?: number;
};

export function VocabularyImageGallery({
  images,
  title,
  className,
}: {
  images: VocabularyGalleryImage[];
  title: string;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const gestureStart = useRef<{ x: number; y: number } | null>(null);
  const wasSwiped = useRef(false);
  const lastWheelAt = useRef(0);
  const itemCount = images.length;
  const current = Math.min(Math.max(active, 0), Math.max(0, itemCount - 1));

  function select(index: number) {
    setActive(Math.max(0, Math.min(index, itemCount - 1)));
    setZoom(1);
  }
  function step(delta: number) {
    if (!itemCount) return;
    setActive((value) => (value + delta + itemCount) % itemCount);
    setZoom(1);
  }
  useEffect(() => {
    if (!open) return;
    function handleKeys(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActive((value) => (value - 1 + itemCount) % itemCount);
        setZoom(1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setActive((value) => (value + 1) % itemCount);
        setZoom(1);
      }
    }
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [open, itemCount]);

  if (!itemCount) return null;

  const thumbnails = (viewer = false) => (
    <div className={cn(
      "flex gap-2 overflow-x-auto pb-1",
      viewer && "max-h-full lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0",
    )} aria-label={`${title}: choose image`}>
      {images.map((image, index) => (
        <button
          type="button"
          key={image.id || `${image.url}-${index}`}
          aria-label={`Show image ${index + 1} of ${itemCount}`}
          aria-current={current === index ? "true" : undefined}
          onClick={() => select(index)}
          className={cn(
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            current === index ? "border-emerald-500" : "border-transparent hover:border-border",
          )}
        >
          {/* Images are served through the authenticated project media route. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        </button>
      ))}
    </div>
  );

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    gestureStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    wasSwiped.current = false;
  };
  const onTouchEnd = (event: TouchEvent) => {
    if (!gestureStart.current || zoom > 1 || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - gestureStart.current.x;
    const dy = event.changedTouches[0].clientY - gestureStart.current.y;
    gestureStart.current = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      wasSwiped.current = true;
      step(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-xl border bg-muted/20">
        <button
          type="button"
          className="group flex h-48 w-full items-center justify-center overflow-hidden sm:h-60"
          aria-label={`Open ${title} image viewer`}
          onClick={() => { if (wasSwiped.current) { wasSwiped.current = false; return; } setZoom(1); setOpen(true); }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[current].url} alt={`${title} illustration ${current + 1}`} loading="lazy" className="h-full w-full object-contain transition-transform group-hover:scale-[1.02]" />
          <span className="absolute right-3 top-3 rounded-lg bg-background/90 p-2 shadow-sm"><Expand className="h-4 w-4" /></span>
        </button>
        {itemCount > 1 ? (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm">
            <Images className="h-3.5 w-3.5" /> {current + 1} / {itemCount}
          </div>
        ) : null}
        {itemCount > 1 ? (
          <div className="pointer-events-none absolute inset-y-0 flex w-full items-center justify-between px-2">
            <Button type="button" variant="secondary" size="icon" className="pointer-events-auto size-9 rounded-full bg-background/90" aria-label="Previous image" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button type="button" variant="secondary" size="icon" className="pointer-events-auto size-9 rounded-full bg-background/90" aria-label="Next image" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        ) : null}
      </div>
      {itemCount > 1 ? thumbnails() : null}
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); setZoom(1); }}>
        <DialogContent showCloseButton className="flex h-[min(94dvh,960px)] w-[min(96vw,1500px)] max-w-none sm:max-w-[min(96vw,1500px)] flex-col gap-3 overflow-hidden bg-background p-3 sm:p-4">
          <DialogHeader className="shrink-0 pr-12">
            <DialogTitle className="truncate text-base">{title} — Image {current + 1} of {itemCount}</DialogTitle>
            <DialogDescription>Use thumbnails, arrow keys or swipe to browse. Zoom in to inspect details.</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col-reverse gap-3 lg:flex-row">
            {itemCount > 1 ? <aside className="shrink-0 lg:w-[76px]" aria-label="Image pages">{thumbnails(true)}</aside> : null}
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-muted/25">
              <div
                className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 sm:p-6"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onDoubleClick={() => setZoom((value) => value === 1 ? 2 : 1)}
                onWheel={(event) => {
                  if (zoom !== 1 || itemCount < 2 || Math.abs(event.deltaY) < 15) return;
                  event.preventDefault();
                  const now = Date.now();
                  if (now - lastWheelAt.current > 450) {
                    lastWheelAt.current = now;
                    step(event.deltaY > 0 ? 1 : -1);
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[current].url} alt={`${title}, image ${current + 1}`} draggable={false} className="max-h-full max-w-full select-none object-contain" style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 150ms ease" }} />
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t bg-background/90 p-2">
                <Button type="button" size="icon" variant="outline" aria-label="Previous image" disabled={itemCount < 2} onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="min-w-12 text-center text-xs tabular-nums">{current + 1} / {itemCount}</span>
                <Button type="button" size="icon" variant="outline" aria-label="Next image" disabled={itemCount < 2} onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
                <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
                <Button type="button" size="icon" variant="outline" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))}><Minus className="h-4 w-4" /></Button>
                <span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
                <Button type="button" size="icon" variant="outline" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}><Plus className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="outline" aria-label="Reset zoom" onClick={() => setZoom(1)}><RotateCcw className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
