"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ContentComponentGridItem = {
  id: string;
  label: string;
  href?: string;
};

export function ContentComponentGrid({
  items,
  onItemClick,
}: {
  items: ContentComponentGridItem[];
  onItemClick: (item: ContentComponentGridItem) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers = items.map((_, index) =>
      window.setTimeout(() => {
        setVisibleCount((current) => Math.max(current, index + 1));
      }, (index + 1) * 120),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [items]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => {
        const visible = index < visibleCount;

        const className = cn(
          buttonVariants({ variant: "outline" }),
          "group h-auto min-h-24 justify-start gap-3 rounded-2xl border-border bg-background p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10",
          "dark:hover:border-primary/50 dark:hover:shadow-primary/20",
        );
        const content = (
          <>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10">
              <Layers3 className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary/70 transition-transform group-hover:translate-x-0.5" />
          </>
        );

        return item.href ? (
          <Link
            key={item.id}
            href={item.href}
            className={className}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 320ms ease, transform 320ms ease",
              transitionDelay: `${(index + 1) * 120}ms`,
            }}
          >
            {content}
          </Link>
        ) : (
          <Button
            key={item.id}
            type="button"
            variant="outline"
            onClick={() => onItemClick(item)}
            className={className}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 320ms ease, transform 320ms ease",
              transitionDelay: `${(index + 1) * 120}ms`,
            }}
          >
            {content}
          </Button>
        );
      })}
    </div>
  );
}