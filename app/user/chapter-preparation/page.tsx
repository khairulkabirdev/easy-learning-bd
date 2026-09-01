import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getPublishedClassCards } from "@/app/user/lessons/data";
import { EntityVisual } from "@/components/app/EntityVisual";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

export default async function UserChapterPreparationPage() {
  const user = await requireUser();
  const classes = await getPublishedClassCards(user.organizationId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>অধ্যায়ভিত্তিক প্রস্তুতি</CardTitle>
          <CardDescription>Choose a class first, then open its subjects, units, topics, and content.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
          <CardDescription>Select a published class to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {classes.map((item) => (
                <Link
                  key={item.id}
                  href={`/user/chapter-preparation/classes/${item.id}`}
                  className={cn(buttonVariants({ variant: "outline" }), "h-auto justify-start rounded-2xl px-4 py-4 text-left")}
                >
                  <div className="flex w-full items-start gap-4">
                    <EntityVisual
                      title={item.name}
                      iconType={item.iconType}
                      iconName={item.iconName}
                      iconColor={item.iconColor}
                      imagePath={item.imagePath}
                      className="h-14 w-14 rounded-2xl"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="font-medium">{item.name}</div>
                      <div className="flex flex-wrap gap-2">
                        {item.code ? <Badge variant="secondary">{item.code}</Badge> : null}
                        <Badge variant="outline">{item._count.subjects} subjects</Badge>
                      </div>
                      {item.description ? <div className="text-sm text-muted-foreground">{item.description}</div> : null}
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No published classes are available yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
