import { ChevronRight, Home } from "lucide-react";
import { notFound } from "next/navigation";

import { getPublishedClassSubjects } from "@/app/user/lessons/data";
import { SubjectTileGrid } from "@/components/app/SubjectTileGrid";
import { requireStudent } from "@/lib/app-auth";

export default async function UserChapterPreparationPage() {
  const user = await requireStudent();

  if (!user.classId) {
    notFound();
  }

  const detail = await getPublishedClassSubjects(user.organizationId, user.classId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">অধ্যায়ভিত্তিক প্রস্তুতি</span>
      </div>

      <div className="space-y-1 pt-8">
        <h1 className="text-xl font-semibold tracking-tight pb-3">বিষয় নির্বাচন করুন</h1>
         <hr className="border-t" />
      </div>
     

      {detail.subjects.length > 0 ? (
        <SubjectTileGrid
          subjects={detail.subjects}
          hrefBase="/user/chapter-preparation/subjects"
        />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          No published subjects found for your class.
        </div>
      )}
    </div>
  );
}
