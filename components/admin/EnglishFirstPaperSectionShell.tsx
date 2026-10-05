import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EnglishFirstPaperSectionShell({
  classItem,
  subject,
  title,
  description,
}: {
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <Link
        href={`/admin/content/class/${classItem.id}/subject/${subject.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {subject.name}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">{classItem.name}</Badge>
            <Badge variant="outline">{subject.name}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            This section route is ready. Its dedicated content fields and block rules can be added without changing the new Class → Subject → Type navigation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
