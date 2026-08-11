import Link from "next/link";
import {
  BookOpen,
  BookText,
  FolderOpen,
  Layers3,
  Sparkles,
  Tags,
} from "lucide-react";

import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("en-US");

export default async function AdminDashboardPage() {
  const user = await requireAdmin();

  const [
    classCount,
    subjectCount,
    unitCount,
    lessonCount,
    topicCount,
    contentCount,
    blockCount,
    recentAuditLogs,
    recentContents,
  ] = await Promise.all([
    prisma.class.count({ where: { organizationId: user.organizationId } }),
    prisma.subject.count({ where: { organizationId: user.organizationId } }),
    prisma.unit.count({ where: { organizationId: user.organizationId } }),
    prisma.lesson.count({ where: { organizationId: user.organizationId } }),
    prisma.topic.count({ where: { organizationId: user.organizationId } }),
    prisma.content.count({ where: { organizationId: user.organizationId } }),
    prisma.contentBlock.count({
      where: { content: { organizationId: user.organizationId } },
    }),
    prisma.auditLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        action: true,
        entityName: true,
        userName: true,
        createdAt: true,
      },
    }),
    prisma.content.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        updatedAt: true,
        class: { select: { name: true } },
        subject: { select: { name: true } },
        unit: { select: { title: true } },
        lesson: { select: { title: true } },
        topic: { select: { title: true } },
        _count: { select: { blocks: true } },
      },
    }),
  ]);

  const metrics = [
    {
      title: "Classes",
      value: classCount,
      description: "Published curriculum levels",
      icon: <BookOpen className="h-4 w-4" />,
      href: "/admin/classes",
    },
    {
      title: "Subjects",
      value: subjectCount,
      description: "Subject records across classes",
      icon: <BookText className="h-4 w-4" />,
      href: "/admin/subjects",
    },
    {
      title: "Units",
      value: unitCount,
      description: "Structured unit containers",
      icon: <Layers3 className="h-4 w-4" />,
      href: "/admin/units",
    },
    {
      title: "Lessons",
      value: lessonCount,
      description: "Lesson entries ready for content",
      icon: <FolderOpen className="h-4 w-4" />,
      href: "/admin/lessons",
    },
    {
      title: "Topics",
      value: topicCount,
      description: "Topic-level curriculum nodes",
      icon: <Tags className="h-4 w-4" />,
      href: "/admin/topics",
    },
    {
      title: "Content Blocks",
      value: blockCount,
      description: `${numberFormatter.format(contentCount)} content record${contentCount === 1 ? "" : "s"}`,
      icon: <Sparkles className="h-4 w-4" />,
      href: "/admin/content",
    },
  ];

  const primaryLinkClass =
    "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90";
  const outlineLinkClass =
    "inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground";
  const ghostLinkClass =
    "inline-flex h-9 items-center justify-center rounded-md px-0 text-sm font-medium transition-colors hover:text-foreground";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">
              Admin overview
            </Badge>
            <CardTitle className="text-3xl">Dashboard</CardTitle>
            <CardDescription className="max-w-3xl text-sm">
              Review curriculum coverage, content production, and recent admin activity from one server-rendered
              workspace.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/content" className={primaryLinkClass}>
              Open Content
            </Link>
            <Link href="/admin/classes" className={outlineLinkClass}>
              Manage Curriculum
            </Link>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">{metric.title}</CardTitle>
                <CardDescription>{metric.description}</CardDescription>
              </div>
              <div className="rounded-md border p-2 text-muted-foreground">{metric.icon}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-semibold tracking-tight">
                {numberFormatter.format(metric.value)}
              </div>
              <Link href={metric.href} className={ghostLinkClass}>
                Open {metric.title}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recently updated content</CardTitle>
            <CardDescription>
              Latest content paths with block counts so you can jump back into editing quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentContents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No content records yet.
              </div>
            ) : (
              recentContents.map((item, index) => (
                <div key={item.id} className="space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{item.class.name}</Badge>
                        <span className="text-xs text-muted-foreground">/</span>
                        <Badge variant="outline">{item.subject.name}</Badge>
                        <span className="text-xs text-muted-foreground">/</span>
                        <Badge variant="outline">{item.unit.title}</Badge>
                        <span className="text-xs text-muted-foreground">/</span>
                        <Badge variant="outline">{item.lesson.title}</Badge>
                        {item.topic ? (
                          <>
                            <span className="text-xs text-muted-foreground">/</span>
                            <Badge variant="outline">{item.topic.title}</Badge>
                          </>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item._count.blocks} block{item._count.blocks === 1 ? "" : "s"} • Updated{" "}
                        {item.updatedAt.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <Link
                      href={`/admin/content/${item.id}`}
                      className={cn(outlineLinkClass, "w-fit")}
                    >
                      Open editor
                    </Link>
                  </div>
                  {index < recentContents.length - 1 ? <Separator /> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent admin activity</CardTitle>
            <CardDescription>Latest audit entries recorded for this organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAuditLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No audit activity yet.
              </div>
            ) : (
              recentAuditLogs.map((log, index) => (
                <div key={log.id} className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">
                        {log.action} {log.entityName}
                      </div>
                      <Badge variant="outline">{log.userName}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {log.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {log.createdAt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  {index < recentAuditLogs.length - 1 ? <Separator /> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
