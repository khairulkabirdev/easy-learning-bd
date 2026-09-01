"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

const settingsSchema = z.object({
  senderName: z.string().trim().default(""),
  senderEmail: z.union([z.literal(""), z.email("Valid sender email is required.")]).default(""),
  appBaseUrl: z.union([z.literal(""), z.url("Valid app base URL is required.")]).default(""),
  resetEmailEnabled: z.boolean().default(false),
});

export type EmailSettingsActionState = {
  error: string;
  success: string;
};

export async function saveEmailSettingsAction(
  _: EmailSettingsActionState,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const parsed = settingsSchema.safeParse({
    senderName: formData.get("senderName") || "",
    senderEmail: formData.get("senderEmail") || "",
    appBaseUrl: formData.get("appBaseUrl") || "",
    resetEmailEnabled: formData.get("resetEmailEnabled") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Failed to save settings.", success: "" };
  }

  await prisma.authEmailSetting.upsert({
    where: { organizationId: user.organizationId },
    update: {
      ...parsed.data,
      updatedBy: user.id,
    },
    create: {
      ...parsed.data,
      organizationId: user.organizationId,
      updatedBy: user.id,
    },
  });

  revalidatePath("/admin/settings");
  return { error: "", success: "Email settings saved." };
}
