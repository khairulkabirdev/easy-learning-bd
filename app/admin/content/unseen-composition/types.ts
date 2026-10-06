export type UnseenPassageBlock = {
  id: string;
  kind: "unseen-passage";
  sortOrder: number;
  body: string;
};

export type WritingSummaryBlock = {
  id: string;
  kind: "writing-summary";
  sortOrder: number;
  instruction: string;
  modelAnswer: string;
};

export type InformationTransferBlank = {
  id: string;
  sortOrder: number;
  answer: string;
};

export type InformationTransferBlock = {
  id: string;
  kind: "information-transfer";
  sortOrder: number;
  question: string;
  details: string;
  blanks: InformationTransferBlank[];
};

export type UnseenTrueFalseBlock = {
  id: string;
  kind: "true-false";
  sortOrder: number;
  instruction: string;
  rows: Array<{
    id: string;
    statement: string;
    expectedAnswer: boolean;
    correction: string;
  }>;
};

export type UnseenCompositionBlock =
  | UnseenPassageBlock
  | WritingSummaryBlock
  | InformationTransferBlock
  | UnseenTrueFalseBlock;

export type UnseenCompositionBlockKind = UnseenCompositionBlock["kind"];

export type UnseenCompositionDocument = {
  version: 1;
  blocks: UnseenCompositionBlock[];
};

export const UNSEEN_COMPOSITION_BLOCK_KINDS: UnseenCompositionBlockKind[] = [
  "unseen-passage",
  "writing-summary",
  "information-transfer",
  "true-false",
];

function id() {
  return crypto.randomUUID();
}

export function createUnseenCompositionBlock(
  kind: UnseenCompositionBlockKind,
  sortOrder = 0,
): UnseenCompositionBlock {
  switch (kind) {
    case "unseen-passage":
      return {
        id: id(),
        kind,
        sortOrder,
        body: "",
      };
    case "writing-summary":
      return {
        id: id(),
        kind,
        sortOrder,
        instruction: "",
        modelAnswer: "",
      };
    case "information-transfer":
      return {
        id: id(),
        kind,
        sortOrder,
        question: "",
        details: "",
        blanks: [],
      };
    case "true-false":
      return {
        id: id(),
        kind,
        sortOrder,
        instruction: "",
        rows: [],
      };
  }
}

export function createDefaultUnseenCompositionDocument(): UnseenCompositionDocument {
  return {
    version: 1,
    blocks: [],
  };
}

function isKnownBlockKind(value: unknown): value is UnseenCompositionBlockKind {
  return typeof value === "string" && UNSEEN_COMPOSITION_BLOCK_KINDS.includes(value as UnseenCompositionBlockKind);
}

function normalizeInformationTransferBlock(
  block: Record<string, unknown>,
  sortOrder: number,
): InformationTransferBlock {
  const question = typeof block.question === "string" ? block.question : "";
  const details = typeof block.details === "string" ? block.details : "";

  const currentBlanks = Array.isArray(block.blanks) ? block.blanks : null;
  const legacyAnswers = Array.isArray(block.answers) ? block.answers : [];
  const source = currentBlanks ?? legacyAnswers;

  const blanks = source
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id ? item.id : id(),
      sortOrder: index,
      answer: typeof item.answer === "string" ? item.answer : "",
    }));

  return {
    id: typeof block.id === "string" && block.id ? block.id : id(),
    kind: "information-transfer",
    sortOrder,
    question,
    details,
    blanks,
  };
}

function normalizeBlock(block: Record<string, unknown>, sortOrder: number): UnseenCompositionBlock | null {
  if (!isKnownBlockKind(block.kind)) return null;

  switch (block.kind) {
    case "information-transfer":
      return normalizeInformationTransferBlock(block, sortOrder);
    case "unseen-passage":
      return {
        id: typeof block.id === "string" && block.id ? block.id : id(),
        kind: "unseen-passage",
        sortOrder,
        body: typeof block.body === "string" ? block.body : "",
      };
    case "writing-summary":
      return {
        id: typeof block.id === "string" && block.id ? block.id : id(),
        kind: "writing-summary",
        sortOrder,
        instruction: typeof block.instruction === "string" ? block.instruction : "",
        modelAnswer: typeof block.modelAnswer === "string" ? block.modelAnswer : "",
      };
    case "true-false": {
      const rows = Array.isArray(block.rows)
        ? block.rows
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
            .map((item) => ({
              id: typeof item.id === "string" && item.id ? item.id : id(),
              statement: typeof item.statement === "string" ? item.statement : "",
              expectedAnswer: typeof item.expectedAnswer === "boolean" ? item.expectedAnswer : true,
              correction: typeof item.correction === "string" ? item.correction : "",
            }))
        : [];

      return {
        id: typeof block.id === "string" && block.id ? block.id : id(),
        kind: "true-false",
        sortOrder,
        instruction: typeof block.instruction === "string" ? block.instruction : "",
        rows,
      };
    }
  }
}

export function parseUnseenCompositionDocument(value: string): UnseenCompositionDocument {
  try {
    const parsed = JSON.parse(value) as { version?: unknown; blocks?: unknown };
    if (parsed.version === 1 && Array.isArray(parsed.blocks)) {
      const blocks = parsed.blocks
        .filter((block): block is Record<string, unknown> => Boolean(block) && typeof block === "object")
        .sort((a, b) => {
          const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : 0;
          const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : 0;
          return aOrder - bOrder;
        })
        .map((block, index) => normalizeBlock(block, index))
        .filter((block): block is UnseenCompositionBlock => block !== null);

      return {
        version: 1,
        blocks,
      };
    }
  } catch {
    // Fall through to a fresh document.
  }

  return createDefaultUnseenCompositionDocument();
}
