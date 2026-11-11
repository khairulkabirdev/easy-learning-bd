import { modelQuestionBlockOptions } from "@/lib/model-question-block-types";

type SubjectInfo = { name: string; slug?: string | null; code?: string | null };
export type BlockDraft = {
  kind: string;
  title: string;
  instructions: string;
  passage: string;
  question: string;
  options: string[];
  answer: string;
  marks: number;
};

export function validateModelQuestionBlock(input: unknown, subject: SubjectInfo): { data?: BlockDraft; error?: string } {
  if (!input || typeof input !== "object") return { error: "Invalid block data." };
  const value = input as Record<string, unknown>;
  const read = (key: string) => typeof value[key] === "string" ? (value[key] as string).trim() : "";
  const kind = read("kind");
  if (!modelQuestionBlockOptions(subject).some((entry) => entry.value === kind)) return { error: "This block type is unavailable for the selected subject." };
  const title = read("title");
  const question = read("question");
  const instructions = read("instructions");
  const passage = read("passage");
  const answer = read("answer");
  const marks = Number(value.marks);
  if (!title || title.length > 180) return { error: "Block title is required (max 180 characters)." };
  if (!question || question.length > 20000) return { error: "Question or prompt is required (max 20,000 characters)." };
  if (instructions.length > 5000 || passage.length > 30000 || answer.length > 30000) return { error: "Instructions, passage or answer is too long." };
  if (!Number.isInteger(marks) || marks < 1 || marks > 100) return { error: "Marks must be a whole number between 1 and 100." };
  const options = Array.isArray(value.options) ? value.options : [];
  if (kind === "mcq" && ((options.length < 2 || options.length > 6) || options.some((item) => typeof item !== "string" || !item.trim() || item.length > 1000))) {
    return { error: "MCQ blocks require 2–6 non-empty answer options." };
  }
  return { data: { kind, title, question, instructions, passage, answer, marks,
    options: kind === "mcq" ? options.map((item) => String(item).trim()) : [] } };
}
