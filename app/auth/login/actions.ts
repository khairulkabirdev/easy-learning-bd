"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { loginWithPassword } from "@/lib/app-auth";

const loginSchema = z.object({
  email: z.email("Valid email is required."),
  password: z.string().min(1, "Password is required."),
});

export type LoginActionState = {
  error: string;
};

export async function loginAction(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid email or password.",
    };
  }

  const result = await loginWithPassword(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return {
      error: result.error,
    };
  }

  if (result.role === "admin") {
    redirect("/admin/content");
  }

  redirect("/user/dashboard");
}
