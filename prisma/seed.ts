process.env.DATABASE_URL ??= "file:./dev.db";

import bcrypt from "bcryptjs";

import { PrismaClient, PublishStatus, UserRole } from "../generated/prisma/client";

const prisma = new PrismaClient();
const ORG_ID = "default-org";


function seedValue(name: string, developmentFallback: string) {
  const configured = process.env[name]?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be configured before running the production seed.`);
  }
  return developmentFallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function upsertUser(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      passwordHash,
      role: params.role,
      organizationId: ORG_ID,
    },
    create: {
      name: params.name,
      email: params.email,
      passwordHash,
      role: params.role,
      organizationId: ORG_ID,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    name: process.env.SEED_ADMIN_NAME?.trim() || "Local Admin",
    email: seedValue("SEED_ADMIN_EMAIL", "admin@example.com"),
    password: seedValue("SEED_ADMIN_PASSWORD", "admin123456"),
    role: UserRole.admin,
  });

  await upsertUser({
    name: process.env.SEED_STUDENT_NAME?.trim() || "Student User",
    email: seedValue("SEED_STUDENT_EMAIL", "student@example.com"),
    password: seedValue("SEED_STUDENT_PASSWORD", "student123456"),
    role: UserRole.student,
  });

  const classNames = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
  const subjectNames = ["Bangla", "English", "Mathematics", "Science", "Social Science", "ICT"];

  for (const [classIndex, className] of classNames.entries()) {
    const classRecord = await prisma.class.upsert({
      where: { slug: slugify(className) },
      update: {
        name: className,
        code: `C${classIndex + 6}`,
        status: PublishStatus.published,
        sortOrder: classIndex,
        organizationId: ORG_ID,
        updatedBy: admin.id,
      },
      create: {
        name: className,
        slug: slugify(className),
        code: `C${classIndex + 6}`,
        status: PublishStatus.published,
        sortOrder: classIndex,
        organizationId: ORG_ID,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });

    for (const [subjectIndex, subjectName] of subjectNames.entries()) {
      const subjectRecord = await prisma.subject.upsert({
        where: { slug: `${slugify(className)}-${slugify(subjectName)}` },
        update: {
          classId: classRecord.id,
          name: subjectName,
          sortOrder: subjectIndex,
          status: PublishStatus.published,
          organizationId: ORG_ID,
          updatedBy: admin.id,
        },
        create: {
          classId: classRecord.id,
          name: subjectName,
          slug: `${slugify(className)}-${slugify(subjectName)}`,
          code: `${classIndex + 6}-${subjectName.slice(0, 3).toUpperCase()}`,
          sortOrder: subjectIndex,
          status: PublishStatus.published,
          organizationId: ORG_ID,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      });

      for (let unitIndex = 1; unitIndex <= 2; unitIndex += 1) {
        const unitRecord = await prisma.unit.upsert({
          where: { slug: `${slugify(className)}-${slugify(subjectName)}-unit-${unitIndex}` },
          update: {
            classId: classRecord.id,
            subjectId: subjectRecord.id,
            title: `Unit ${unitIndex}`,
            unitNumber: `${unitIndex}`,
            sortOrder: unitIndex - 1,
            status: PublishStatus.published,
            organizationId: ORG_ID,
            updatedBy: admin.id,
          },
          create: {
            classId: classRecord.id,
            subjectId: subjectRecord.id,
            title: `Unit ${unitIndex}`,
            slug: `${slugify(className)}-${slugify(subjectName)}-unit-${unitIndex}`,
            unitNumber: `${unitIndex}`,
            sortOrder: unitIndex - 1,
            status: PublishStatus.published,
            organizationId: ORG_ID,
            createdBy: admin.id,
            updatedBy: admin.id,
          },
        });

        for (let lessonIndex = 1; lessonIndex <= 2; lessonIndex += 1) {
          const lessonRecord = await prisma.lesson.upsert({
            where: { slug: `${slugify(className)}-${slugify(subjectName)}-unit-${unitIndex}-lesson-${lessonIndex}` },
            update: {
              unitId: unitRecord.id,
              title: `Lesson ${lessonIndex}`,
              lessonNumber: `${lessonIndex}`,
              shortDescription: `Lesson ${lessonIndex} for ${subjectName}`,
              sortOrder: lessonIndex - 1,
              status: PublishStatus.published,
              organizationId: ORG_ID,
              updatedBy: admin.id,
            },
            create: {
              unitId: unitRecord.id,
              title: `Lesson ${lessonIndex}`,
              slug: `${slugify(className)}-${slugify(subjectName)}-unit-${unitIndex}-lesson-${lessonIndex}`,
              lessonNumber: `${lessonIndex}`,
              shortDescription: `Lesson ${lessonIndex} for ${subjectName}`,
              sortOrder: lessonIndex - 1,
              status: PublishStatus.published,
              organizationId: ORG_ID,
              createdBy: admin.id,
              updatedBy: admin.id,
            },
          });

          const existingLessonContent = await prisma.content.findFirst({
            where: {
              classId: classRecord.id,
              subjectId: subjectRecord.id,
              unitId: unitRecord.id,
              lessonId: lessonRecord.id,
              topicId: null,
              organizationId: ORG_ID,
            },
            select: { id: true },
          });

          const lessonContent = existingLessonContent
            ? await prisma.content.update({
                where: { id: existingLessonContent.id },
                data: { updatedBy: admin.id },
              })
            : await prisma.content.create({
                data: {
                  classId: classRecord.id,
                  subjectId: subjectRecord.id,
                  unitId: unitRecord.id,
                  lessonId: lessonRecord.id,
                  topicId: null,
                  organizationId: ORG_ID,
                  createdBy: admin.id,
                  updatedBy: admin.id,
                },
              });

          for (let topicIndex = 1; topicIndex <= 2; topicIndex += 1) {
            const topicRecord = await prisma.topic.upsert({
              where: { slug: `${slugify(className)}-${slugify(subjectName)}-unit-${unitIndex}-lesson-${lessonIndex}-topic-${topicIndex}` },
              update: {
                lessonId: lessonRecord.id,
                title: `Topic ${topicIndex}`,
                topicNumber: `${topicIndex}`,
                shortDescription: `Topic ${topicIndex} in Lesson ${lessonIndex}`,
                sortOrder: topicIndex - 1,
                status: PublishStatus.published,
                organizationId: ORG_ID,
                updatedBy: admin.id,
              },
              create: {
                lessonId: lessonRecord.id,
                title: `Topic ${topicIndex}`,
                slug: `${slugify(className)}-${slugify(subjectName)}-unit-${unitIndex}-lesson-${lessonIndex}-topic-${topicIndex}`,
                topicNumber: `${topicIndex}`,
                shortDescription: `Topic ${topicIndex} in Lesson ${lessonIndex}`,
                sortOrder: topicIndex - 1,
                status: PublishStatus.published,
                organizationId: ORG_ID,
                createdBy: admin.id,
                updatedBy: admin.id,
              },
            });

            await prisma.content.upsert({
              where: {
                classId_subjectId_unitId_lessonId_topicId_organizationId: {
                  classId: classRecord.id,
                  subjectId: subjectRecord.id,
                  unitId: unitRecord.id,
                  lessonId: lessonRecord.id,
                  topicId: topicRecord.id,
                  organizationId: ORG_ID,
                },
              },
              update: {
                updatedBy: admin.id,
              },
              create: {
                classId: classRecord.id,
                subjectId: subjectRecord.id,
                unitId: unitRecord.id,
                lessonId: lessonRecord.id,
                topicId: topicRecord.id,
                organizationId: ORG_ID,
                createdBy: admin.id,
                updatedBy: admin.id,
              },
            });
          }

          if (className === "Class 6" && subjectName === "English" && unitIndex === 1 && lessonIndex === 1) {
            const existingParagraph = await prisma.contentBlock.findFirst({
              where: {
                contentId: lessonContent.id,
                kind: "paragraph",
              },
              select: { id: true },
            });

            if (!existingParagraph) {
              const block = await prisma.contentBlock.create({
                data: {
                  contentId: lessonContent.id,
                  kind: "paragraph",
                  sortOrder: 0,
                },
              });

              await prisma.paragraph.create({
                data: {
                  contentBlockId: block.id,
                  contentId: lessonContent.id,
                  classId: classRecord.id,
                  subjectId: subjectRecord.id,
                  unitId: unitRecord.id,
                  lessonId: lessonRecord.id,
                  topicId: null,
                  body: "<p>Welcome to the English lesson content.</p>",
                  organizationId: ORG_ID,
                  createdBy: admin.id,
                  updatedBy: admin.id,
                },
              });
            }
          }
        }
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });



