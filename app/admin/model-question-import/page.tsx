import Link from "next/link";
import { ArrowRight, BookOpen, FileUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function ModelQuestionClassesPage() {
  const user = await requireAdmin();
  const [classes, totals] = await Promise.all([
    prisma.class.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, description: true, _count: { select: { subjects: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.modelQuestionImport.groupBy({
      by: ["classId"],
      where: { organizationId: user.organizationId },
      _count: { _all: true },
    }),
  ]);
  const countByClass = new Map(totals.map((item) => [item.classId, item._count._all]));

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary"><FileUp className="size-5" /><span className="text-xs font-semibold uppercase tracking-wider">Question Bank</span></div>
        <h2 className="text-2xl font-semibold tracking-tight">Model Question Import</h2>
        <p className="text-sm text-muted-foreground">Choose a class to organize model-question files by subject, board and academic year.</p>
      </div>
      {classes.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((entry) => (
            <Link key={entry.id} href={`/admin/model-question-import/${entry.id}`}
              className="group flex min-h-36 flex-col justify-between rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-5">
              <div className="flex gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{entry.name}</div>
                  {entry.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.description}</p> : null}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-2">
                <div className="flex gap-1.5"><Badge variant="secondary">{entry._count.subjects} subjects</Badge><Badge variant="outline">{countByClass.get(entry.id) ?? 0} files</Badge></div>
                <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <BookOpen className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">No classes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a class before importing model questions.</p>
          <Link className="mt-3 inline-flex text-sm font-medium text-primary underline underline-offset-4" href="/admin/classes">Go to Classes</Link>
        </div>
      )}
    </div>
  );
}
