import UserLessonsBrowser from "@/app/user/lessons/UserLessonsBrowser";
import { requireUser } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function UserLessonsPage() {
  const user = await requireUser();

  const [classes, subjects, units, lessons, topics, contents] = await Promise.all([
    prisma.class.findMany({
      where: {
        organizationId: user.organizationId,
        status: "published",
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.subject.findMany({
      where: {
        organizationId: user.organizationId,
        status: "published",
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        classId: true,
        name: true,
      },
    }),
    prisma.unit.findMany({
      where: {
        organizationId: user.organizationId,
        status: "published",
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        classId: true,
        subjectId: true,
        title: true,
        unitNumber: true,
      },
    }),
    prisma.lesson.findMany({
      where: {
        organizationId: user.organizationId,
        status: "published",
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        unitId: true,
        title: true,
        lessonNumber: true,
      },
    }),
    prisma.topic.findMany({
      where: {
        organizationId: user.organizationId,
        status: "published",
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        lessonId: true,
        title: true,
        topicNumber: true,
      },
    }),
    prisma.content.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        classId: true,
        subjectId: true,
        unitId: true,
        lessonId: true,
        topicId: true,
        createdAt: true,
        _count: {
          select: {
            blocks: true,
          },
        },
      },
    }),
  ]);

  return (
    <UserLessonsBrowser
      classes={classes}
      subjects={subjects}
      units={units}
      lessons={lessons}
      topics={topics}
      contents={contents.map((item) => ({
        id: item.id,
        classId: item.classId,
        subjectId: item.subjectId,
        unitId: item.unitId,
        lessonId: item.lessonId,
        topicId: item.topicId,
        createdAt: item.createdAt.toISOString(),
        blocksCount: item._count.blocks,
      }))}
    />
  );
}
