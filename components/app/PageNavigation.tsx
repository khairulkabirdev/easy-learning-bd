"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type PageNavigationItem = {
  label: string;
  href?: string;
};

type PageNavigationProps = {
  items?: PageNavigationItem[];
  backHref?: string;
  backLabel?: string;
  homeHref?: string;
  className?: string;
};

type NavigationLabelResponse = {
  labels?: Record<string, string>;
  items?: PageNavigationItem[];
  backHref?: string;
};

const LAST_PATH_KEY = "easy-learning:page-navigation:last-path";
const PREVIOUS_PATH_KEY = "easy-learning:page-navigation:previous-path";

const STATIC_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Teacher",
  user: "Learning",
  dashboard: "Dashboard",
  content: "Content",
  classes: "Classes",
  subjects: "Subjects",
  units: "Units",
  lessons: "Lessons",
  topics: "Topics",
  profile: "Profile",
  settings: "Settings",
  "audit-logs": "Audit Logs",
  "chapter-preparation": "অধ্যায়ভিত্তিক প্রস্তুতি",
  "matching-sentences": "Matching Sentences",
  "rearrange-sentence": "Rearrange Sentence",
  "question-from-poems": "Question from Poems",
  "question-from-story": "Question from Story",
  "seen-composition": "Seen Composition",
  "seen-compositon": "Seen Composition",
  "seen-compostion": "Seen Composition",
  "unseen-composition": "Unseen Composition",
  "unseen-compositon": "Unseen Composition",
  "unseen-compostion": "Unseen Composition",
  "fill-in-the-blanks": "Fill in the Blanks",
  "information-transfer": "Information Transfer",
  mcq: "MCQ",
  paragraph: "Paragraph",
  "question-answer": "Question Answer",
  "synonyms-antonyms": "Synonyms & Antonyms",
  "table-completion": "Table Completion",
  "true-false": "True / False",
  vocabulary: "Vocabulary",
  add: "Add",
};

const STRUCTURAL_SEGMENTS = new Set(["class", "subject", "chapter"]);
const COLLECTION_SEGMENTS = new Set(["classes", "subjects", "units", "lessons", "topics"]);
const USER_CHAPTER_EXERCISE_SEGMENTS = new Set([
  "fill-in-the-blanks",
  "information-transfer",
  "mcq",
  "paragraph",
  "question-answer",
  "rearrange-sentence",
  "synonyms-antonyms",
  "table-completion",
  "true-false",
  "vocabulary",
]);

function getRoleHome(pathname: string) {
  if (pathname.startsWith("/admin")) return "/admin/dashboard";
  if (pathname.startsWith("/teacher")) return "/teacher/dashboard";
  if (pathname.startsWith("/user")) return "/user/dashboard";
  return "/";
}

function looksLikeId(segment: string) {
  return segment.length >= 18 && /^[a-z0-9_]+$/i.test(segment);
}

function humanizeSegment(segment: string) {
  if (STATIC_LABELS[segment]) return STATIC_LABELS[segment];

  return decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isSafeInternalPath(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

function buildAutoItems(pathname: string, labels: Record<string, string>) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const routeSegments = segments.slice(1);
  const rolePrefix = `/${segments[0]}`;
  const roleHome = getRoleHome(pathname);

  if (pathname === roleHome) return [];

  const items: PageNavigationItem[] = [];

  routeSegments.forEach((segment, index) => {
    const previous = routeSegments[index - 1];
    const next = routeSegments[index + 1];
    let href = `${rolePrefix}/${routeSegments.slice(0, index + 1).join("/")}`;

    if (
      rolePrefix === "/user" &&
      next === "chapter" &&
      USER_CHAPTER_EXERCISE_SEGMENTS.has(segment)
    ) {
      href = "/user/lessons";
    }

    if (STRUCTURAL_SEGMENTS.has(segment)) return;

    if (
      COLLECTION_SEGMENTS.has(segment) &&
      next &&
      (labels[next] || looksLikeId(next))
    ) {
      return;
    }

    let label = labels[segment] || STATIC_LABELS[segment];

    if (!label && looksLikeId(segment)) {
      if (previous === "content") {
        label = "Content Editor";
      } else if (previous === "chapter") {
        label = "Chapter";
      } else if (
        previous === "matching-sentences" ||
        previous === "rearrange-sentence" ||
        previous === "question-from-poems" ||
        previous === "question-from-story"
      ) {
        label = "Edit";
      } else {
        label = "Item";
      }
    }

    label ||= humanizeSegment(segment);

    const isLastVisible = routeSegments
      .slice(index + 1)
      .every((candidate, candidateIndex) => {
        if (STRUCTURAL_SEGMENTS.has(candidate)) return true;
        const candidateNext = routeSegments[index + candidateIndex + 2];
        return Boolean(
          COLLECTION_SEGMENTS.has(candidate) &&
            candidateNext &&
            (labels[candidateNext] || looksLikeId(candidateNext)),
        );
      });

    items.push({
      label,
      href: isLastVisible ? undefined : href,
    });

  });

  return items;
}

function computeParentPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "/";

  const roleHome = getRoleHome(pathname);
  if (pathname === roleHome) return "/";

  const last = segments.at(-1) || "";
  const previous = segments.at(-2) || "";

  if (last === "add") {
    return `/${segments.slice(0, -1).join("/")}`;
  }

  if (
    segments[0] === "user" &&
    previous === "chapter" &&
    looksLikeId(last)
  ) {
    return "/user/lessons";
  }

  if (
    looksLikeId(last) &&
    (previous === "class" ||
      previous === "subject" ||
      COLLECTION_SEGMENTS.has(previous))
  ) {
    const parent = segments.slice(0, -2);
    return parent.length > 1 ? `/${parent.join("/")}` : roleHome;
  }

  return `/${segments.slice(0, -1).join("/")}` || roleHome;
}

export function PageNavigation({
  items,
  backHref,
  backLabel = "Back",
  homeHref,
  className,
}: PageNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resolvedLabels, setResolvedLabels] = useState<Record<string, string>>({});
  const [resolvedRouteItems, setResolvedRouteItems] = useState<PageNavigationItem[] | null>(null);
  const [resolvedRouteBackHref, setResolvedRouteBackHref] = useState<string | null>(null);

  const resolvedHomeHref = homeHref ?? getRoleHome(pathname);
  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const lastPath = window.sessionStorage.getItem(LAST_PATH_KEY);

    if (lastPath && lastPath !== currentPath && isSafeInternalPath(lastPath)) {
      window.sessionStorage.setItem(PREVIOUS_PATH_KEY, lastPath);
    }

    window.sessionStorage.setItem(LAST_PATH_KEY, currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (items) {
      setResolvedRouteItems(null);
      setResolvedRouteBackHref(null);
      return;
    }

    setResolvedLabels({});
    setResolvedRouteItems(null);
    setResolvedRouteBackHref(null);

    const controller = new AbortController();
    const editorMode = searchParams.get("editorMode") || "";
    const query = new URLSearchParams({ path: pathname });
    if (editorMode) query.set("editorMode", editorMode);

    void fetch(`/api/navigation/labels?${query.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as NavigationLabelResponse;
      })
      .then((result) => {
        setResolvedLabels(result?.labels ?? {});
        setResolvedRouteItems(result?.items ?? null);
        setResolvedRouteBackHref(result?.backHref ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResolvedLabels({});
        setResolvedRouteItems(null);
        setResolvedRouteBackHref(null);
      });

    return () => controller.abort();
  }, [items, pathname, searchParams]);

  const resolvedItems = useMemo(
    () => items ?? resolvedRouteItems ?? buildAutoItems(pathname, resolvedLabels),
    [items, pathname, resolvedLabels, resolvedRouteItems],
  );

  const handleBack = () => {
    const preferredBackHref = backHref ?? resolvedRouteBackHref;
    if (preferredBackHref) {
      router.push(preferredBackHref);
      return;
    }

    const parentPath = computeParentPath(pathname);
    if (isSafeInternalPath(parentPath) && parentPath !== pathname) {
      router.push(parentPath);
      return;
    }

    const previousPath = window.sessionStorage.getItem(PREVIOUS_PATH_KEY);
    if (isSafeInternalPath(previousPath) && previousPath !== currentPath) {
      router.push(previousPath!);
      return;
    }

    router.push(resolvedHomeHref);
  };

  return (
    <div
      data-page-navigation
      className={cn(
        "flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              render={<Link href={resolvedHomeHref} />}
              aria-label="Home"
              className="inline-flex items-center"
            >
              <Home className="size-4" />
              <span className="sr-only">Home</span>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {resolvedItems.map((item, index) => {
            const isLast = index === resolvedItems.length - 1;

            return (
              <span key={`${item.label}-${index}`} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  {!isLast && item.href ? (
                    <BreadcrumbLink
                      render={<Link href={item.href} />}
                      className="max-w-[14rem] truncate sm:max-w-[20rem]"
                    >
                      {item.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="max-w-[14rem] truncate font-medium sm:max-w-[20rem]">
                      {item.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleBack}
        className="shrink-0 self-start gap-2 sm:self-auto"
        aria-label={backLabel}
      >
        <ArrowLeft className="size-4" />
        <span>{backLabel}</span>
      </Button>
    </div>
  );
}
