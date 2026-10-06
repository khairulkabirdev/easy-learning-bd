"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { assertTrustedMutationOrigin, resetPasswordWithToken } from "@/lib/app-auth";

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is missing.").max(256, "Reset token is invalid."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
    confirmPassword: z.string().min(1, "Confirm your password.").max(128, "Password is too long."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordActionState = {
  error: string;
};

export async function resetPasswordAction(
  _: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  await assertTrustedMutationOrigin();

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Password reset failed." };
  }

  const result = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/auth/login");
}
