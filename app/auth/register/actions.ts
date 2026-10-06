"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { assertTrustedMutationOrigin, registerWithPassword } from "@/lib/app-auth";
import { consumeAuthRateLimit } from "@/lib/auth-rate-limit";

const DEFAULT_ORGANIZATION_ID = "default-org";
const bdPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number.");

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120, "Name is too long."),
    email: z.email("Valid email is required.").max(320, "Email is too long."),
    phone: bdPhoneSchema,
    password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
    confirmPassword: z.string().min(1, "Confirm your password.").max(128, "Password is too long."),
    role: z.enum(["student", "teacher"]),
    institutionName: z.string().trim().max(200, "Institution name is too long.").optional(),
    classId: z.string().max(100).optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.role !== "student" || Boolean(value.classId), {
    message: "Please choose your class.",
    path: ["classId"],
  })
  .refine((value) => value.role !== "teacher" || Boolean(value.institutionName), {
    message: "Institution name is required for teachers.",
    path: ["institutionName"],
  });

export type RegisterActionState = {
  error: string;
};

export async function registerAction(_: RegisterActionState, formData: FormData): Promise<RegisterActionState> {
  await assertTrustedMutationOrigin();

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    role: formData.get("role"),
    institutionName: formData.get("institutionName") || undefined,
    classId: formData.get("classId") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Registration failed.",
    };
  }

  const rateLimit = await consumeAuthRateLimit({
    scope: "register",
    identifier: parsed.data.email,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return { error: "Too many registration attempts. Please try again later." };
  }

  const result = await registerWithPassword({
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
    role: parsed.data.role,
    phone: parsed.data.phone.replace(/^88(?=01)/, "+88"),
    institutionName: parsed.data.institutionName,
    classId: parsed.data.classId,
    organizationId: DEFAULT_ORGANIZATION_ID,
  });

  if (!result.ok) {
    return {
      error: result.error,
    };
  }

  if (result.role === "teacher") {
    redirect("/teacher/dashboard");
  }

  redirect("/user/dashboard");
}
