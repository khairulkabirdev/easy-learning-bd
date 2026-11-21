import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, UserRound } from "lucide-react";
import { getPublishedClassSubjects } from "@/app/user/lessons/data";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function UserDashboardPage() {
  const user = await requireStudent();
  const scope = user.classId ? { classId: user.classId, organizationId: user.organizationId } : null;
  const [curriculum, paperCount] = scope ? await Promise.all([
    getPublishedClassSubjects(scope.organizationId, scope.classId),
    prisma.modelQuestionSet.count({
      where: { ...scope, publishedAt: { not: null }, class: { status: "published", organizationId: scope.organizationId },
        subject: { status: "published", classId: scope.classId, organizationId: scope.organizationId } },
    }),
  ]) : [null, 0];
  return (
    <div className="space-y-7 pb-8">
      <header className="space-y-4 rounded-2xl border bg-card p-5 sm:p-8">
        <Badge variant="secondary">{curriculum?.classItem.name ?? "Student workspace"}</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome, {user.name}</h1>
          <p className="max-w-xl text-muted-foreground">Study by chapter or practise with a model question paper for your class.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/user/model-questions" className={buttonVariants()}><ClipboardList /> Model Questions <ArrowRight /></Link>
          <Link href="/user/chapter-preparation" className={buttonVariants({ variant: "outline" })}>Chapter Preparation</Link>
        </div>
      </header>
      <section aria-labelledby="dashboard-tools" className="space-y-3">
        <h2 id="dashboard-tools" className="text-lg font-semibold">Learning tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <ClipboardList className="mb-2 size-5 text-primary" aria-hidden />
              <CardTitle>Model Questions</CardTitle>
              <CardDescription>{paperCount ? `${paperCount} published model ${paperCount === 1 ? "paper" : "papers"} for your class.` : "Practise real model papers when they’re published for your class."}</CardDescription>
            </CardHeader>
            <CardContent><Link href="/user/model-questions" className={buttonVariants({ variant: "outline", size: "sm" })}>Browse papers <ArrowRight /></Link></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <BookOpen className="mb-2 size-5 text-primary" aria-hidden />
              <CardTitle>Chapter Preparation</CardTitle>
              <CardDescription>Read chapter content and work through the practice exercises.</CardDescription>
            </CardHeader>
            <CardContent><Link href="/user/chapter-preparation" className={buttonVariants({ variant: "outline", size: "sm" })}>Browse chapters <ArrowRight /></Link></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <UserRound className="mb-2 size-5 text-primary" aria-hidden />
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Review your class assignment and profile details.</CardDescription>
            </CardHeader>
            <CardContent><Link href="/user/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>Open profile <ArrowRight /></Link></CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
