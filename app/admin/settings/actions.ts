"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

const settingsSchema = z.object({
  senderName: z.string().trim().max(120, "Sender name is too long.").default(""),
  senderEmail: z.union([z.literal(""), z.email("Valid sender email is required.")]).default(""),
  appBaseUrl: z
    .union([z.literal(""), z.url("Valid app base URL is required.")])
    .refine((value) => !value || /^https?:\/\//i.test(value), "App base URL must use http or https.")
    .default(""),
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

  revalidatePath("/admin/email-settings");
  revalidatePath("/admin/settings");
  return { error: "", success: "Email settings saved." };
}

export type DatabaseCleanupActionState = {
  error: string;
  success: string;
};

export async function clearContentTablesAction(
  _: DatabaseCleanupActionState,
  formData: FormData,
): Promise<DatabaseCleanupActionState> {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const { CLEANUP_CONFIRMATION, CleanupError, clearDatabaseContent } = await import("@/lib/admin/database-cleanup");
  const token = formData.get("previewToken");
  if (formData.get("confirmation") !== CLEANUP_CONFIRMATION || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return { error: "Review the table preview and type CLEAR CONTENT to confirm.", success: "" };
  }
  let result: Awaited<ReturnType<typeof clearDatabaseContent>>;
  try {
    result = await clearDatabaseContent({
      organizationId: user.organizationId,
      userId: user.id,
      userName: user.name,
      token,
      includeTopics: formData.get("includeTopics") === "yes",
    });
  } catch (error) {
    console.error("Database cleanup failed", error);
    return { error: error instanceof CleanupError ? error.message : "Cleanup did not commit. Check the server log and refresh the preview.", success: "" };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/user", "layout");
  revalidatePath("/teacher", "layout");
  return {
    error: "",
    success: result.deleted ? `${result.deleted} records removed. Backup saved on the server: ${result.backup}.` : "The selected content tables are already empty.",
  };
}
