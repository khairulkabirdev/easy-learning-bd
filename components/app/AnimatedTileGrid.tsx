"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type AnimatedTileGridProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  hrefForItem?: (item: T) => string;
  onItemClick?: (item: T) => void;
  renderIcon: (item: T) => ReactNode;
  renderTitle: (item: T, index: number) => ReactNode;
  renderMeta?: (item: T) => ReactNode;
  renderRight?: (item: T) => ReactNode;
  columnsClassName?: string;
  itemClassName?: string;
  staggerMs?: number;
};

export function AnimatedTileGrid<T>({
  items,
  getKey,
  hrefForItem,
  onItemClick,
  renderIcon,
  renderTitle,
  renderMeta,
  renderRight,
  columnsClassName = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
  itemClassName = "",
  staggerMs = 120,
}: AnimatedTileGridProps<T>) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    const timers = items.map((_, index) =>
      window.setTimeout(() => {
        setVisibleCount((current) => Math.max(current, index + 1));
      }, (index + 1) * staggerMs)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [items, staggerMs]);

  return (
    <div className={columnsClassName}>
      {items.map((item, index) => {
        const visible = index < visibleCount;
        const commonClassName = cn(
          "group flex items-center gap-3 rounded-2xl border border-primary/15 bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 sm:gap-4 sm:p-4",
          "dark:border-primary/20 dark:bg-background/70 dark:hover:border-primary/40 dark:hover:shadow-primary/20",
          itemClassName,
        );
        const style = {
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 320ms ease, transform 320ms ease",
          transitionDelay: `${(index + 1) * staggerMs}ms`,
        } as CSSProperties;

        const content = (
          <>
            {renderIcon(item)}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{renderTitle(item, index)}</div>
              {renderMeta ? <div className="mt-1 flex flex-wrap gap-2">{renderMeta(item)}</div> : null}
            </div>
            {renderRight ? renderRight(item) : null}
          </>
        );

        if (hrefForItem) {
          return (
            <Link key={getKey(item)} href={hrefForItem(item)} className={commonClassName} style={style}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={getKey(item)}
            type="button"
            className={commonClassName}
            style={style}
            onClick={() => onItemClick?.(item)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
