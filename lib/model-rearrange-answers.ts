/** Model Question Import's rearrange-sentence block stores book-order rows and
 * correct positions in each row's existing `answer` string. No DB migration.
 * Older records with no numeric positions retain their original correct-row order.
 */
export type ModelRearrangeRow = { id: string; answer: string };

export function modelRearrangeLetter(index: number): string {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(97 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function validPosition(value: string, count: number): number | null {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;
  const numeric = Number(trimmed);
  return Number.isSafeInteger(numeric) && numeric <= count ? numeric : null;
}

export function readModelRearrangeKey(rows: ModelRearrangeRow[]): {
  order: string[];
  mode: "legacy" | "explicit" | "invalid";
} {
  // Old papers had no explicit answer: book rows were saved in their correct order.
  const hasPositions = rows.some((row) => /^\d+$/.test(row.answer.trim()));
  if (!hasPositions) return { order: rows.map((row) => row.id), mode: "legacy" };
  const positions = rows.map((row) => validPosition(row.answer, rows.length));
  if (positions.some((position) => position === null) || new Set(positions).size !== rows.length) {
    return { order: [], mode: "invalid" };
  }
  return {
    order: rows.map((row, i) => ({ id: row.id, position: positions[i]! }))
      .sort((left, right) => left.position - right.position)
      .map((row) => row.id),
    mode: "explicit",
  };
}

/** One input per position; returns blanks for unsaved/incomplete explicit keys. */
export function getModelRearrangeSlots(rows: ModelRearrangeRow[]): string[] {
  if (readModelRearrangeKey(rows).mode === "legacy") {
    return rows.map((_, index) => modelRearrangeLetter(index));
  }
  const slots = Array<string>(rows.length).fill("");
  rows.forEach((row, rowIndex) => {
    const position = validPosition(row.answer, rows.length);
    if (position && !slots[position - 1]) slots[position - 1] = modelRearrangeLetter(rowIndex);
  });
  return slots;
}

export function validateModelRearrangeSlots(slots: string[], rowCount: number): string[] {
  const errors = Array<string>(rowCount).fill("");
  if (rowCount < 2) return errors.map(() => "Add at least two book sentences.");
  const validLetters = new Set(Array.from({ length: rowCount }, (_, index) => modelRearrangeLetter(index)));
  const firstSeen = new Map<string, number>();
  for (let i = 0; i < rowCount; i++) {
    const letter = (slots[i] || "").trim().toLowerCase();
    if (!letter) { errors[i] = "Enter a letter."; continue; }
    if (!validLetters.has(letter)) { errors[i] = `Unknown letter: ${letter}.`; continue; }
    const prior = firstSeen.get(letter);
    if (prior !== undefined) {
      errors[i] = `Letter ${letter} is repeated.`;
      errors[prior] = `Letter ${letter} is repeated.`;
    } else {
      firstSeen.set(letter, i);
    }
  }
  return errors;
}

export function applyModelRearrangeSlots<Row extends ModelRearrangeRow>(rows: Row[], slots: string[]): Row[] {
  if (slots.length !== rows.length || validateModelRearrangeSlots(slots, rows.length).some(Boolean)) {
    throw new Error("Use every book-item letter exactly once before saving the answer key.");
  }
  const positionByLetter = new Map(slots.map((value, index) => [value.trim().toLowerCase(), index + 1]));
  return rows.map((row, index) => ({ ...row, answer: String(positionByLetter.get(modelRearrangeLetter(index))) }));
}

/** Deleting a sentence preserves the relative correct order of surviving rows. */
export function removeModelRearrangeRow<Row extends ModelRearrangeRow & { sortOrder: number }>(rows: Row[], deletedId: string): Row[] {
  const remaining = rows.filter((row) => row.id !== deletedId);
  const mode = readModelRearrangeKey(rows).mode;
  if (mode === "legacy") return remaining.map((row, index) => ({ ...row, sortOrder: index }));
  const sortedWithRank = remaining.filter((row) => validPosition(row.answer, rows.length) !== null)
    .sort((a, b) => Number(a.answer) - Number(b.answer));
  const newRank = new Map(sortedWithRank.map((row, index) => [row.id, String(index + 1)]));
  return remaining.map((row, index) => ({ ...row, sortOrder: index, answer: newRank.get(row.id) || "" }));
}
