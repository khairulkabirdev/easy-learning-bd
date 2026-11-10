import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { isEnglishSecondPaperSubject } from "@/app/admin/content/navigation-helpers";
import {
  ENGLISH_SECOND_PAPER_META,
  type EnglishSecondPaperKind,
} from "@/app/admin/content/english-second-paper-blocks/types";
import { getPublishedSubjectMeta } from "@/app/user/chapter-preparation/first-paper-data";
import { getSecondPaperPage, getSecondPaperRecordAndNext } from "@/app/user/chapter-preparation/second-paper-data";
import { UserEnglishSecondPaperViewer } from "@/components/app/UserEnglishSecondPaperViewer";
import { UserFirstPaperSectionList } from "@/components/app/UserFirstPaperSectionList";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}
function positive(value: string | string[] | undefined) {
  const n = Number.parseInt(one(value), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function UserEnglishSecondPaperSectionPage({
  subjectId,
  kind,
  queryParams,
}: {
  subjectId: string;
  kind: EnglishSecondPaperKind;
  queryParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireStudent();
  if (!user.classId) notFound();
  const subject = await getPublishedSubjectMeta(user.organizationId, user.classId, subjectId);
  if (!subject || !isEnglishSecondPaperSubject(subject)) notFound();

  const meta = ENGLISH_SECOND_PAPER_META[kind];
  const basePath = `/user/chapter-preparation/subjects/${subjectId}/${kind}`;
  const q = one(queryParams.q).trim();
  const page = positive(queryParams.page);
  const recordId = one(queryParams.recordId);

  if (!recordId) {
    const result = await getSecondPaperPage({
      organizationId: user.organizationId,
      classId: user.classId,
      subjectId,
      kind,
      query: q,
      page,
    });
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5 py-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
          <p className="text-sm text-muted-foreground">Choose a practice set to begin.</p>
        </div>
        <UserFirstPaperSectionList
          basePath={basePath}
          rows={result.rows.map((row) => ({ id: row.id, title: row.title }))}
          total={result.total}
          page={result.page}
          totalPages={result.totalPages}
          query={q}
          emptyMessage={`No ${meta.title.toLowerCase()} practice available yet.`}
        />
      </div>
    );
  }

  const item = await getSecondPaperRecordAndNext({
    organizationId: user.organizationId,
    classId: user.classId,
    subjectId,
    kind,
    query: q,
    recordId,
  });
  if (!item) notFound();

  const nextParams = new URLSearchParams();
  if (q) nextParams.set("q", q);
  nextParams.set("page", String(item.nextPage || page));
  if (item.nextId) nextParams.set("recordId", item.nextId);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-12 pt-2">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{item.record.title}</h1>
        <Badge variant="outline">{meta.title}</Badge>
      </div>
      <UserEnglishSecondPaperViewer key={item.record.id} kind={kind} record={item.record} />
      <div className="flex justify-end border-t pt-4">
        {item.nextId ? (
          <Link href={`${basePath}?${nextParams.toString()}`} className={cn(buttonVariants(), "min-h-11 gap-2")}>
            Next <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" /> Practice Complete
          </div>
        )}
      </div>
    </div>
  );
}
