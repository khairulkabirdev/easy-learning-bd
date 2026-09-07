"use client";

import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";

import { cn } from "@/lib/utils";

type TopicTile = {
  id: string;
  title: string;
  topicNumber: string;
};

type TopicTileGridProps = {
  topics: TopicTile[];
  hrefBase: string;
};

export function TopicTileGrid({ topics, hrefBase }: TopicTileGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {topics.map((topic) => (
        <Link
          key={topic.id}
          href={`${hrefBase}/${topic.id}`}
          className={cn(
            "group flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 sm:gap-4 sm:p-4",
            "dark:hover:border-primary/50 dark:hover:shadow-primary/20",
          )}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10">
            <Tag className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {topic.topicNumber ? `${topic.topicNumber} · ${topic.title}` : topic.title}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary/70 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}
