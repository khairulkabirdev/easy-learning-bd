import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { getPublishedClassSubjects } from "@/app/user/lessons/data";
import { EntityVisual } from "@/components/app/EntityVisual";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

export default async function UserClassSubjectsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const user = await requireUser();
  const { classId } = await params;
  const detail = await getPublishedClassSubjects(user.organizationId, classId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <EntityVisual
                title={detail.classItem.name}
                iconType={detail.classItem.iconType}
                iconName={detail.classItem.iconName}
                iconColor={detail.classItem.iconColor}
                imagePath={detail.classItem.imagePath}
                className="h-14 w-14 rounded-2xl"
              />
              <div className="space-y-1">
                <CardTitle>{detail.classItem.name}</CardTitle>
                <CardDescription>Select a subject for this class.</CardDescription>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{detail.classItem.name}</Badge>
            {detail.classItem.code ? <Badge variant="outline">{detail.classItem.code}</Badge> : null}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>Open a published subject under this class.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.subjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {detail.subjects.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/user/chapter-preparation/classes/${detail.classItem.id}/subjects/${subject.id}`}
                  className={cn(buttonVariants({ variant: "outline" }), "h-auto justify-start rounded-2xl px-4 py-4 text-left")}
                >
                  <div className="flex w-full items-start gap-4">
                    <EntityVisual
                      title={subject.name}
                      iconType={subject.iconType}
                      iconName={subject.iconName}
                      iconColor={subject.iconColor}
                      imagePath={subject.imagePath}
                      className="h-14 w-14 rounded-2xl"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="font-medium">{subject.name}</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{detail.classItem.name}</Badge>
                        <Badge variant="outline">{subject._count.units} units</Badge>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No published subjects found for this class.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
