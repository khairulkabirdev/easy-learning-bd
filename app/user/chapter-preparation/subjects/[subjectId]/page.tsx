import { notFound } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import UserSubjectBrowser from "@/app/user/subjects/[subjectId]/UserSubjectBrowser";
import { requireStudent } from "@/lib/app-auth";
import { UnitTileGrid } from "@/components/app/UnitTileGrid";

export default async function UserChapterPreparationSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const user = await requireStudent();
  const { subjectId } = await params;

  if (!user.classId) {
    notFound();
  }

  const detail = await getPublishedSubjectDetail(user.organizationId, user.classId, subjectId);

  if (!detail) {
    notFound();
  }

  console.log("detail", detail.units);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">                                                                                                                                              </span> <ChevronRight className="h-4 w-4" /> <span className="font-medium text-foreground">অধ্যায়ভিত্তিক প্রস্তুতি</span> 
        </div>
  
        <div className="space-y-1 pt-8">
          <h1 className="text-xl font-semibold tracking-tight pb-3">অধ্যায় নির্বাচন করুন</h1>
           <hr className="border-t" />
        </div>
       
  
        {detail.units.length > 0 ? (
          <UnitTileGrid
            subjects={detail.units}
            hrefBase="/user/chapter-preparation/subjects"
          />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            No published units found for your subjects.
          </div>
        )}
      </div>
    );
}
