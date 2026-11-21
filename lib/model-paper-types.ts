import type { StudentContentRecord } from "@/app/user/lessons/student-content";
import type { McqQuestionRecord } from "@/app/admin/content/content-types";

export type ModelPaperEntry = {
  id: string;
  title: string;
  number: string | null;
  marks: number | null;
  reference?: boolean;
  native?: StudentContentRecord["blocks"][number];
  imported?: { question: string; answer: string; passage: string; instructions: string; mcq: McqQuestionRecord | null };
};

export type ModelPaper = {
  id: string;
  name: string;
  subject: string;
  subjectId: string;
  className: string;
  board: string | null;
  year: number | null;
  entries: ModelPaperEntry[];
};
