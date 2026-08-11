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
        <DrawerContent className={className ? `max-h-[90vh] ${className}` : "max-h-[90vh]"}>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">{children}</div>
          {footer ? <div className="border-t px-4 py-4">{footer}</div> : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] max-w-3xl overflow-y-auto p-0${className ? ` ${className}` : ""}`}>
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="px-6 py-4">{children}</div>
        {footer ? <div className="border-t px-6 py-4">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
