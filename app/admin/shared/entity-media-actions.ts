"use server";

import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { deleteLocalImage, saveImageToTemp, deleteTemporaryImageUpload } from "@/lib/upload";

const uploadSchema = z.object({
  domain: z.enum(["classes", "subjects", "units", "lessons", "topics"]),
});

export async function uploadEntityImageTemp(formData: FormData) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const domain = formData.get("domain");
  const file = formData.get("file");
  const parsed = uploadSchema.parse({ domain });

  if (!(file instanceof File)) {
    throw new Error("Image file is required.");
  }

  const previousTempPath = String(formData.get("previousTempPath") ?? "").trim();
  const saved = await saveImageToTemp(file, { organizationId: user.organizationId, userId: user.id });

  if (previousTempPath.startsWith("/api/media/") && previousTempPath !== saved.publicPath) {
    await deleteTemporaryImageUpload(previousTempPath, { organizationId: user.organizationId, userId: user.id });
  } else if (previousTempPath.startsWith("/uploads/temp/") && previousTempPath !== saved.publicPath) {
    await deleteLocalImage(previousTempPath);
  }

  return {
    domain: parsed.domain,
    tempPublicPath: saved.publicPath,
  };
}
