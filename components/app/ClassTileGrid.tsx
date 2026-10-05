"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { EntityVisual } from "@/components/app/EntityVisual";
import { cn } from "@/lib/utils";

type ClassTile = {
  id: string;
  name: string;
  iconType: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type ClassTileGridProps = {
  classes: ClassTile[];
  hrefBase: string;
};

export function ClassTileGrid({ classes, hrefBase }: ClassTileGridProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    const timers = classes.map((_, index) =>
      window.setTimeout(() => {
        setVisibleCount((current) => Math.max(current, index + 1));
      }, (index + 1) * 120),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [classes]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {classes.map((classItem, index) => {
        const visible = index < visibleCount;

        return (
          <Link
            key={classItem.id}
            href={`${hrefBase}/${classItem.id}`}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 sm:gap-4 sm:p-4",
              "dark:hover:border-primary/50 dark:hover:shadow-primary/20",
            )}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 320ms ease, transform 320ms ease",
              transitionDelay: `${(index + 1) * 120}ms`,
            }}
          >
            <EntityVisual
              title={classItem.name}
              iconType={classItem.iconType}
              iconName={classItem.iconName}
              iconColor={classItem.iconColor}
              imagePath={classItem.imagePath}
              className="h-12 w-12 rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{classItem.name}</div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary/70 transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}
