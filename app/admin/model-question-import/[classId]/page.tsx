import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenCheck, FileUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function ModelQuestionSubjectsPage({ params }: { params: Promise<{ classId: string }> }) {
  const user = await requireAdmin();
  const { classId } = await params;
  const classItem = await prisma.class.findFirst({
    where: { id: classId, organizationId: user.organizationId },
    select: { id: true, name: true, subjects: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, description: true } } },
  });
  if (!classItem) notFound();
  const totals = await prisma.modelQuestionImport.groupBy({
    by: ["subjectId"],
    where: { organizationId: user.organizationId, classId },
    _count: { _all: true },
  });
  const bySubject = new Map(totals.map((item) => [item.subjectId, item._count._all]));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link href="/admin/model-question-import" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> All classes</Link>
        <h2 className="text-2xl font-semibold tracking-tight">{classItem.name} — Subjects</h2>
        <p className="text-sm text-muted-foreground">Select a subject to see its model questions, board and year filters, and file uploads.</p>
      </div>
      {classItem.subjects.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {classItem.subjects.map((subject) => (
            <Link key={subject.id} href={`/admin/model-question-import/${classId}/${subject.id}`}
              className="group flex min-h-32 flex-col justify-between rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpenCheck className="size-5" /></div>
                <div className="min-w-0"><div className="font-semibold">{subject.name}</div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{subject.description || "Board and year wise model questions"}</p></div>
              </div>
              <div className="mt-4 flex items-center justify-between"><Badge variant="secondary">{bySubject.get(subject.id) ?? 0} files</Badge><ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" /></div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center"><FileUp className="mx-auto mb-2 size-8 text-muted-foreground" /><p>No subjects in this class yet.</p><Link href="/admin/subjects" className="mt-3 inline-block text-sm text-primary underline underline-offset-4">Manage Subjects</Link></div>
      )}
    </div>
  );
}
