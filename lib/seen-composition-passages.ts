export const SEEN_PASSAGE_ONE_REF = "__seen_passage_one__";
export const SEEN_PASSAGE_TWO_REF = "__seen_passage_two__";

export type SeenPassageSlot = 1 | 2;

export function isSeenPassageRef(value: string | null | undefined) {
  return value === SEEN_PASSAGE_ONE_REF || value === SEEN_PASSAGE_TWO_REF;
}

export function seenPassageSlotForRef(value: string | null | undefined): SeenPassageSlot | null {
  if (value === SEEN_PASSAGE_ONE_REF) return 1;
  if (value === SEEN_PASSAGE_TWO_REF) return 2;
  return null;
}
