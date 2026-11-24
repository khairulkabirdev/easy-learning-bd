"use server";

import { requireStudent } from "@/lib/app-auth";
import { prisma } from "@/lib/db";
import { searchStudentCatalog } from "@/lib/user/student-dashboard";

const FIELDS = ["readLesson", "practiceExercise", "reviewSomething"] as const;
function validDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 10) === day && date <= Date.now() + 2 * 86400000 && date >= Date.now() - 100 * 86400000;
}
function validTasks(value: unknown): value is boolean[] {
  return Array.isArray(value) && value.length === 3 && value.every(item => typeof item === "boolean");
}
export async function searchStudentLearning(query: string) {
  const user = await requireStudent();
  if (typeof query !== "string") return [];
  const term = query.trim().slice(0, 120);
  return term.length >= 2 ? searchStudentCatalog(user, term) : [];
}

export async function syncStudentGoals(day: string, legacyTasks: boolean[] | null, legacyDays: string[]) {
  const user = await requireStudent();
  if (!validDay(day)) throw new Error("Invalid study day");
  // Legacy browser history seeds missing rows only; never overwrites server goals.
  const days = Array.isArray(legacyDays) ? [...new Set(legacyDays.filter(validDay))].slice(-90) : [];
  const tasks = validTasks(legacyTasks) ? legacyTasks : [false, false, false];
  if (validTasks(legacyTasks) || days.includes(day)) {
    await prisma.studentDailyGoal.upsert({ where: { userId_day: { userId: user.id, day } }, create: { userId: user.id, day, readLesson: tasks[0], practiceExercise: tasks[1], reviewSomething: tasks[2], studied: tasks.some(Boolean) || days.includes(day) }, update: {} });
  }
  const existingDays = days.length ? await prisma.studentDailyGoal.findMany({ where: { userId: user.id, day: { in: days } }, select: { day: true } }) : [];
  const knownDays = new Set(existingDays.map(row => row.day));
  for (const historicDay of days.filter(d => d !== day && !knownDays.has(d))) {
    await prisma.studentDailyGoal.upsert({ where: { userId_day: { userId: user.id, day: historicDay } }, create: { userId: user.id, day: historicDay, studied: true }, update: {} });
  }
  const [today, history] = await Promise.all([
    prisma.studentDailyGoal.findUnique({ where: { userId_day: { userId: user.id, day } } }),
    prisma.studentDailyGoal.findMany({ where: { userId: user.id, studied: true }, orderBy: { day: "desc" }, take: 90, select: { day: true } }),
  ]);
  return { tasks: today ? FIELDS.map(field => today[field]) : [false, false, false], days: history.map(row => row.day) };
}

export async function saveStudentGoal(day: string, index: number, checked: boolean) {
  const user = await requireStudent();
  if (!validDay(day) || !Number.isInteger(index) || index < 0 || index >= FIELDS.length || typeof checked !== "boolean") throw new Error("Invalid goal");
  const field = FIELDS[index];
  const row = await prisma.studentDailyGoal.upsert({
    where: { userId_day: { userId: user.id, day } },
    create: { userId: user.id, day, [field]: checked, studied: checked },
    update: { [field]: checked, ...(checked ? { studied: true } : {}) },
  });
  return { tasks: FIELDS.map(key => row[key]), studied: row.studied };
}
