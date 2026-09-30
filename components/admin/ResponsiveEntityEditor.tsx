"use client";

import type { ReactNode } from "react";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type ResponsiveEntityEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function ResponsiveEntityEditor({
  open,
  onOpenChange,
  title,
  description,
  footer,
  className,
  children,
}: ResponsiveEntityEditorProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className={
            className
              ? `[--drawer-inset:0.75rem] max-h-[92dvh] overflow-hidden ${className}`
              : "[--drawer-inset:0.75rem] max-h-[92dvh] overflow-hidden"
          }
        >
          <DrawerHeader className="min-w-0 shrink-0 pr-12">
            <DrawerTitle className="break-words leading-snug">{title}</DrawerTitle>
            {description ? (
              <DrawerDescription className="break-words leading-relaxed">{description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">
            <div className="min-w-0">{children}</div>
          </div>
          {footer ? (
            <div className="shrink-0 border-t bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/90">
              {footer}
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl 2xl:max-w-5xl${
          className ? ` ${className}` : ""
        }`}
      >
        <DialogHeader className="min-w-0 shrink-0 border-b px-4 py-4 pr-12 sm:px-6 sm:pr-14">
          <DialogTitle className="break-words text-base leading-snug sm:text-lg">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="max-w-full break-words leading-relaxed">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">{children}</div>
        </div>

        {footer ? (
          <div className="min-w-0 shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
