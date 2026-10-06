"use server";

import { z } from "zod";

import { assertTrustedMutationOrigin, requestPasswordReset } from "@/lib/app-auth";
import { consumeAuthRateLimit } from "@/lib/auth-rate-limit";

const forgotPasswordSchema = z.object({
  email: z.email("Valid email is required.").max(320, "Email is too long."),
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

  const rateLimit = await consumeAuthRateLimit({
    scope: "forgot-password",
    identifier: parsed.data.email,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      error: "",
      success: "If an account exists for that email, a reset link has been sent.",
    };
  }

  await requestPasswordReset(parsed.data.email);

  return {
    error: "",
    success: "If an account exists for that email, a reset link has been sent.",
  };
}
