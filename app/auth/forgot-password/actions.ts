"use server";

import { z } from "zod";

import { assertTrustedMutationOrigin, requestPasswordReset } from "@/lib/app-auth";

const forgotPasswordSchema = z.object({
  email: z.email("Valid email is required."),
});

export type ForgotPasswordActionState = {
  error: string;
  success: string;
};

export async function forgotPasswordAction(
  _: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  await assertTrustedMutationOrigin();

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid email.", success: "" };
  }

  const result = await requestPasswordReset(parsed.data.email);
  if (!result.ok) {
    return { error: result.error, success: "" };
  }

  return {
    error: "",
    success: "If an account exists for that email, a reset link has been sent.",
  };
}
