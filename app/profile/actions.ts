"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireUser } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

const bdPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number.");

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: bdPhoneSchema,
  institutionName: z.string().trim().optional(),
  classId: z.string().optional(),
});

export type ProfileActionState = {
  error: string;
  success: string;
};

export async function updateProfileAction(_: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  await assertTrustedMutationOrigin();
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    institutionName: formData.get("institutionName") || undefined,
    classId: formData.get("classId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Profile update failed.", success: "" };
  }

  if (user.role === "student") {
    if (!parsed.data.classId) {
      return { error: "Please choose your class.", success: "" };
    }

    const classItem = await prisma.class.findFirst({
      where: {
        id: parsed.data.classId,
        organizationId: user.organizationId,
        status: "published",
      },
      select: { id: true },
    });

    if (!classItem) {
      return { error: "Selected class is not available.", success: "" };
    }
  }

  if (user.role === "teacher" && !parsed.data.institutionName) {
    return { error: "Institution name is required for teachers.", success: "" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone.replace(/^88(?=01)/, "+88"),
      classId: user.role === "student" ? parsed.data.classId : user.classId,
      institutionName: user.role === "teacher" ? parsed.data.institutionName : user.institutionName,
    },
  });

  revalidatePath("/admin/profile");
  revalidatePath("/user/profile");
  revalidatePath("/teacher/profile");
  revalidatePath("/admin", "layout");
  revalidatePath("/user", "layout");
  revalidatePath("/teacher", "layout");

  return { error: "", success: "Profile updated." };
}
