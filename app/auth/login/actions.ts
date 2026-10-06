"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { assertTrustedMutationOrigin, loginWithPassword } from "@/lib/app-auth";
import { consumeAuthRateLimit, resetAuthRateLimit } from "@/lib/auth-rate-limit";

const loginSchema = z.object({
  email: z.email("Valid email is required.").max(320, "Email is too long."),
  password: z.string().min(1, "Password is required.").max(128, "Password is too long."),
});

export type LoginActionState = {
  error: string;
};

export async function loginAction(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  await assertTrustedMutationOrigin();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid email or password.",
    };
  }

  const rateLimit = await consumeAuthRateLimit({
    scope: "login",
    identifier: parsed.data.email,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return { error: "Too many login attempts. Please try again later." };
  }

  const result = await loginWithPassword(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return {
      error: result.error,
    };
  }

  await resetAuthRateLimit("login", parsed.data.email);

  if (result.role === "admin") {
    redirect("/admin/content");
  }

  if (result.role === "teacher") {
    redirect("/teacher/dashboard");
  }

  redirect("/user/dashboard");
}
