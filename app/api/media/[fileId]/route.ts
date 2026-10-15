import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/app-auth";
import { prisma } from "@/lib/db";
import { getStoredObjectForUpload, readManagedImageFile } from "@/lib/storage/upload-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

async function canStudentViewFile(file: {
  ownerType: string;
  ownerId: string;
  vocabularyEntry?: { vocabulary: { classId: string } } | null;
}, organizationId: string) {
  if (file.ownerType === "User") return true;

  let classId: string | null = null;
  if (file.ownerType === "VocabularyEntry") {
    classId = file.vocabularyEntry?.vocabulary.classId ?? null;
  } else if (file.ownerType === "Class") {
    classId = file.ownerId;
  } else if (file.ownerType === "Subject") {
    const subject = await prisma.subject.findFirst({ where: { id: file.ownerId, organizationId }, select: { classId: true } });
    classId = subject?.classId ?? null;
  } else if (file.ownerType === "Unit") {
    const unit = await prisma.unit.findFirst({ where: { id: file.ownerId, organizationId }, select: { classId: true } });
    classId = unit?.classId ?? null;
  } else if (file.ownerType === "Lesson") {
    const lesson = await prisma.lesson.findFirst({
      where: { id: file.ownerId, organizationId },
      select: { unit: { select: { classId: true } } },
    });
    classId = lesson?.unit.classId ?? null;
  } else if (file.ownerType === "Topic") {
    const topic = await prisma.topic.findFirst({
      where: { id: file.ownerId, organizationId },
      select: { lesson: { select: { unit: { select: { classId: true } } } } },
    });
    classId = topic?.lesson.unit.classId ?? null;
  }

  if (!classId) return false;
  const publishedClass = await prisma.class.findFirst({
    where: { id: classId, organizationId, status: "published" },
    select: { id: true },
  });
  return Boolean(publishedClass);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { fileId } = await context.params;
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(fileId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await readManagedImageFile(fileId, user.organizationId);
  if (!file) return new NextResponse("Not found", { status: 404 });

  if (file.ownerType === "TempUpload" && file.createdBy !== user.id) {
    return new NextResponse("Not found", { status: 404 });
  }
  const hasPrivilegedContentAccess = user.role === "admin" || user.role === "teacher";
  if (!hasPrivilegedContentAccess && file.ownerType !== "TempUpload" && !(await canStudentViewFile(file, user.organizationId))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = SAFE_IMAGE_TYPES.has(file.mimeType) ? file.mimeType : "image/webp";
  try {
    const stored = await getStoredObjectForUpload(file);
    const headers = new Headers({
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'inline; filename="image.webp"',
      "Cross-Origin-Resource-Policy": "same-site",
      Vary: "Cookie",
      "Cache-Control": "private, no-store",
    });
    return new Response(new Uint8Array(stored.body), { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Stored image is temporarily unavailable." }, { status: 503 });
  }
}
