import { NextResponse } from "next/server";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { MEDIA_LIBRARY_OWNER_TYPE, MEDIA_LIBRARY_PURPOSE } from "@/lib/storage/media-library";
import { deleteStoredUploadById } from "@/lib/storage/upload-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const { fileId } = await context.params;

  if (!/^[A-Za-z0-9_-]{8,100}$/.test(fileId)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const file = await prisma.uploadedFile.findFirst({
    where: {
      id: fileId,
      organizationId: user.organizationId,
      status: "active",
      isCurrent: true,
    },
    select: {
      id: true,
      originalName: true,
      ownerType: true,
      purpose: true,
      path: true,
      storageConfigurationId: true,
    },
  });

  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (file.ownerType !== MEDIA_LIBRARY_OWNER_TYPE || file.purpose !== MEDIA_LIBRARY_PURPOSE) {
    return NextResponse.json(
      { error: "This file is linked to learning content and cannot be deleted from the Media Library." },
      { status: 409 },
    );
  }

  await deleteStoredUploadById(file.id, user.organizationId, user.id);
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "UploadedFile",
    entityId: file.id,
    changes: {
      originalName: file.originalName,
      path: file.path,
      storageConfigurationId: file.storageConfigurationId,
      purpose: file.purpose,
    },
    organizationId: user.organizationId,
  });

  return NextResponse.json({ success: true });
}
