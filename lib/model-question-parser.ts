/** Deterministic, dependency-free importer. No OCR or AI inference is performed. */
export type ImportedModelQuestion = {
  number: number;
  type: "mcq" | "short";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type ModelQuestionParseResult = {
  questions: ImportedModelQuestion[];
  errors: string[];
};

export const MODEL_QUESTION_TEXT_LIMIT = 250_000;
export const MODEL_QUESTION_COUNT_LIMIT = 250;
const MAX_FIELD = 10_000;
const NUMBER = "[0-9০-৯]";
const START = new RegExp(`^\\s*(?:(?:Q(?:uestion)?|প্রশ্ন)\\s*[:#-]?\\s*)?${NUMBER}+[.)।:-]\\s*(.+)$`, "iu");
const ANSWER = /^\s*(?:answer|ans|correct\s*answer|উত্তর|সঠিক\s*উত্তর)\s*[:：-]\s*(.*)$/iu;
const EXPLANATION = /^\s*(?:explanation|solution|ব্যাখ্যা|সমাধান)\s*[:：-]\s*(.*)$/iu;
const OPTION = /^\s*(?:\(([A-Fa-fকখগঘঙচ])\)|([A-Fa-fকখগঘঙচ])[.)।:-])\s*(.+)$/u;
const LABELS = ["A", "B", "C", "D", "E", "F"];
const BANGLA_LABELS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ"];

function labelIndex(answer: string) {
  const stripped = answer.trim().replace(/^[([\s]+|[)\].।\s]+$/g, "").toUpperCase();
  const latin = LABELS.indexOf(stripped);
  return latin >= 0 ? latin : BANGLA_LABELS.indexOf(stripped);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function addQuestion(
  input: { question: string; options: string[]; answer: string; explanation: string },
  index: number,
  questions: ImportedModelQuestion[],
  errors: string[],
) {
  const question = input.question.trim();
  const options = input.options.map((option) => option.trim());
  const answer = input.answer.trim();
  if (!question) { errors.push(`Question ${index}: question text is missing.`); return; }
  if (question.length > MAX_FIELD || answer.length > MAX_FIELD || input.explanation.length > MAX_FIELD || options.some((item) => item.length > MAX_FIELD)) {
    errors.push(`Question ${index}: text exceeds the 10,000-character field limit.`); return;
  }
  if (options.length && (options.length < 2 || options.length > 6 || options.some((item) => !item))) {
    errors.push(`Question ${index}: MCQs must have 2–6 nonempty options.`); return;
  }
  let normalizedAnswer = answer;
  if (options.length && answer) {
    const detected = labelIndex(answer);
    if (detected >= 0) {
      if (detected >= options.length) { errors.push(`Question ${index}: answer ${answer} is outside the options.`); return; }
      normalizedAnswer = LABELS[detected];
    } else {
      const match = options.findIndex((option) => option.toLocaleLowerCase() === answer.toLocaleLowerCase());
      if (match >= 0) normalizedAnswer = LABELS[match];
      else { errors.push(`Question ${index}: answer must match an option label (A–F / ক–চ) or option text.`); return; }
    }
  }
  questions.push({ number: index, type: options.length ? "mcq" : "short", question, options, answer: normalizedAnswer, explanation: input.explanation.trim() });
}

function parseJson(value: unknown): ModelQuestionParseResult {
  const entries = Array.isArray(value) ? value : value && typeof value === "object" && "questions" in value ? (value as { questions: unknown }).questions : null;
  if (!Array.isArray(entries)) return { questions: [], errors: ["JSON must be an array of questions or an object with a questions array."] };
  if (entries.length > MODEL_QUESTION_COUNT_LIMIT) return { questions: [], errors: [`Maximum ${MODEL_QUESTION_COUNT_LIMIT} questions per import.`] };
  const questions: ImportedModelQuestion[] = [];
  const errors: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) { errors.push(`Question ${i + 1}: expected an object.`); continue; }
    const item = entry as Record<string, unknown>;
    const options = Array.isArray(item.options) ? item.options.map((option) => {
      if (option && typeof option === "object" && !Array.isArray(option)) return text((option as Record<string, unknown>).text);
      return text(option);
    }) : [];
    const directAnswer = item.answer ?? item.correctAnswer ?? "";
    // A numeric correct answer is interpreted as an array index (0-based).
    const answer = typeof directAnswer === "number" && Array.isArray(item.options)
      ? LABELS[directAnswer] || "" : text(directAnswer);
    addQuestion({ question: text(item.question ?? item.text), options, answer, explanation: text(item.explanation) }, i + 1, questions, errors);
  }
  return { questions, errors };
}

function parsePlainText(source: string): ModelQuestionParseResult {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const entries: string[][] = [];
  let current: string[] = [];
  const hasNumbers = lines.some((line) => START.test(line));
  for (const line of lines) {
    if (hasNumbers) {
      // Skip heading/instruction text before question 1 instead of importing it as a question.
      if (START.test(line)) {
        if (current.length) entries.push(current);
        current = [line.trim()];
      } else if (current.length && line.trim()) current.push(line.trim());
    } else {
      if (!line.trim() && current.length) { entries.push(current); current = []; }
      else if (line.trim()) current.push(line.trim());
    }
  }
  if (current.length) entries.push(current);
  if (entries.length > MODEL_QUESTION_COUNT_LIMIT) return { questions: [], errors: [`Maximum ${MODEL_QUESTION_COUNT_LIMIT} questions per import.`] };

  const questions: ImportedModelQuestion[] = [];
  const errors: string[] = [];
  entries.forEach((entry, index) => {
    const first = entry[0]?.match(START);
    const questionParts: string[] = [first ? first[1] : entry[0]];
    const options: string[] = [];
    let invalidOptionOrder = false;
    let answer = "";
    let explanation = "";
    let section: "question" | "option" | "answer" | "explanation" = "question";
    for (const line of entry.slice(1)) {
      const a = line.match(ANSWER);
      const e = line.match(EXPLANATION);
      const o = line.match(OPTION);
      if (a) { answer = a[1].trim(); section = "answer"; }
      else if (e) { explanation = e[1].trim(); section = "explanation"; }
      else if (o) {
        const providedIndex = labelIndex(o[1] || o[2]);
        if (providedIndex !== options.length) invalidOptionOrder = true;
        options.push(o[3].trim()); section = "option";
      }
      else if (section === "question") questionParts.push(line);
      else if (section === "option") options[options.length - 1] += ` ${line}`;
      else if (section === "answer") answer += ` ${line}`;
      else explanation += ` ${line}`;
    }
    if (invalidOptionOrder) {
      errors.push(`Question ${index + 1}: option labels must appear in order (A, B, C… or ক, খ, গ…).`);
    } else {
      addQuestion({ question: questionParts.join(" "), options, answer, explanation }, index + 1, questions, errors);
    }
  });
  return { questions, errors };
}

export function parseModelQuestions(raw: string): ModelQuestionParseResult {
  const source = raw.replace(/^\uFEFF/, "").trim();
  if (!source) return { questions: [], errors: ["Enter question text or choose a TXT/JSON question file."] };
  if (source.length > MODEL_QUESTION_TEXT_LIMIT) return { questions: [], errors: ["Question text must be 250,000 characters or shorter."] };
  if (source.startsWith("{") || source.startsWith("[")) {
    try { return parseJson(JSON.parse(source)); }
    catch { return { questions: [], errors: ["Invalid JSON. Check the syntax or use the numbered text format."] }; }
  }
  return parsePlainText(source);
}
