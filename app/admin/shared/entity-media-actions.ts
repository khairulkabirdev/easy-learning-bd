"use server";

import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { saveImageToTemp } from "@/lib/upload";

const uploadSchema = z.object({
  domain: z.enum(["classes", "subjects", "units", "lessons", "topics"]),
});

export async function uploadEntityImageTemp(formData: FormData) {
  await assertTrustedMutationOrigin();
  await requireAdmin();

  const domain = formData.get("domain");
  const file = formData.get("file");
  const parsed = uploadSchema.parse({ domain });

  if (!(file instanceof File)) {
    throw new Error("Image file is required.");
  }

  const saved = await saveImageToTemp(file);

  return {
    domain: parsed.domain,
    tempPublicPath: saved.publicPath,
  };
}
