import { ClipboardList } from "lucide-react";
import { getPublishedClassSubjects } from "@/app/user/lessons/data";
import { SubjectTileGrid } from "@/components/app/SubjectTileGrid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireStudent } from "@/lib/app-auth";

export default async function ModelQuestionsPage() {
  const student = await requireStudent();
  const detail = student.classId ? await getPublishedClassSubjects(student.organizationId, student.classId) : null;
  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-3 rounded-2xl border bg-card p-5 sm:p-8">
        <Badge variant="secondary"><ClipboardList className="size-3.5" /> Exam practice</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Model Questions</h1>
        <p className="max-w-xl text-muted-foreground">Choose a subject, open a published paper, and practise answering it in exam order.</p>
        {detail && <Badge variant="outline">{detail.classItem.name}</Badge>}
      </header>
      <section aria-labelledby="model-subjects" className="space-y-3">
        <h2 id="model-subjects" className="text-lg font-semibold">Choose a subject</h2>
        {detail?.subjects.length ? <SubjectTileGrid subjects={detail.subjects} hrefBase="/user/model-questions" /> :
          <Card><CardContent className="py-8 text-sm text-muted-foreground">
            {student.classId ? "There are no published subjects for your class yet." : "Ask your school administrator to assign you to a class to access model papers."}
          </CardContent></Card>}
      </section>
    </div>
  );
}
