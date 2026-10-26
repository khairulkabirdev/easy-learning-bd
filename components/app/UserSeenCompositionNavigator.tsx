"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, BookOpenCheck } from "lucide-react";

import { AnimatedTileGrid } from "@/components/app/AnimatedTileGrid";
import { EntityVisual } from "@/components/app/EntityVisual";
import { Badge } from "@/components/ui/badge";

export type SeenPassageParam = "1" | "2";

type UnitItem = {
  id: string;
  title: string;
  unitNumber: string;
  iconType: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type LessonItem = {
  id: string;
  title: string;
  lessonNumber: string;
};

const PASSAGES = [
  {
    id: "1" as const,
    title: "Passage 1",
    description: "Open Unit and Lesson based Seen Passage 1 content.",
  },
  {
    id: "2" as const,
    title: "Passage 2",
    description: "Open Unit and Lesson based Seen Passage 2 content.",
  },
];

function withQuery(basePath: string, values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function SeenPassageTypeGrid({ basePath }: { basePath: string }) {
  return (
    <AnimatedTileGrid
      items={PASSAGES}
      getKey={(item) => item.id}
      hrefForItem={(item) => withQuery(basePath, { passage: item.id })}
      renderIcon={() => (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10">
          <BookOpenCheck className="h-5 w-5" />
        </span>
      )}
      renderTitle={(item) => item.title}
      renderMeta={(item) => <span className="text-xs leading-5 text-muted-foreground">{item.description}</span>}
      renderRight={() => <ArrowRight className="h-4 w-4 shrink-0 text-primary/70" />}
      columnsClassName="grid gap-4 sm:grid-cols-2"
      itemClassName="min-h-28"
    />
  );
}

export function SeenUnitGrid({
  basePath,
  passage,
  units,
}: {
  basePath: string;
  passage: SeenPassageParam;
  units: UnitItem[];
}) {
  return (
    <AnimatedTileGrid
      items={units}
      getKey={(item) => item.id}
      hrefForItem={(item) => withQuery(basePath, { passage, unitId: item.id })}
      renderIcon={(item) => (
        <EntityVisual
          title={item.title}
          iconType={item.iconType}
          iconName={item.iconName}
          iconColor={item.iconColor}
          imagePath={item.imagePath}
          className="h-12 w-12 rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10"
        />
      )}
      renderTitle={(item) => (item.unitNumber ? `${item.unitNumber} · ${item.title}` : item.title)}
      renderMeta={() => <Badge variant="outline">Choose unit</Badge>}
      renderRight={() => <ArrowRight className="h-4 w-4 shrink-0 text-primary/70" />}
    />
  );
}

export function SeenLessonGrid({
  basePath,
  passage,
  unitId,
  lessons,
}: {
  basePath: string;
  passage: SeenPassageParam;
  unitId: string;
  lessons: LessonItem[];
}) {
  return (
    <AnimatedTileGrid
      items={lessons}
      getKey={(item) => item.id}
      hrefForItem={(item) => withQuery(basePath, { passage, unitId, lessonId: item.id })}
      renderIcon={() => (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10">
          <BookOpen className="h-5 w-5" />
        </span>
      )}
      renderTitle={(item) => (item.lessonNumber ? `${item.lessonNumber} · ${item.title}` : item.title)}
      renderMeta={() => <Badge variant="outline">Choose lesson</Badge>}
      renderRight={() => <ArrowRight className="h-4 w-4 shrink-0 text-primary/70" />}
    />
  );
}

export function SeenStepBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
