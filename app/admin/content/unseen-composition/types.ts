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

export type InformationTransferBlock = {
  id: string;
  kind: "information-transfer";
  sortOrder: number;
  question: string;
  answers: Array<{ id: string; answer: string }>;
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

export type UnseenCompositionDocument = {
  version: 1;
  blocks: UnseenCompositionBlock[];
};

function id() {
  return crypto.randomUUID();
}

export function createDefaultUnseenCompositionDocument(): UnseenCompositionDocument {
  return {
    version: 1,
    blocks: [
      {
        id: id(),
        kind: "unseen-passage",
        sortOrder: 0,
        body: "",
      },
      {
        id: id(),
        kind: "writing-summary",
        sortOrder: 1,
        instruction: "Write a summary of the passage in your own words.",
        modelAnswer: "",
      },
      {
        id: id(),
        kind: "information-transfer",
        sortOrder: 2,
        question: "",
        answers: [{ id: id(), answer: "" }],
      },
      {
        id: id(),
        kind: "true-false",
        sortOrder: 3,
        instruction: "Read the statements and write True or False.",
        rows: [
          {
            id: id(),
            statement: "",
            expectedAnswer: true,
            correction: "",
          },
        ],
      },
    ],
  };
}

export function parseUnseenCompositionDocument(value: string): UnseenCompositionDocument {
  try {
    const parsed = JSON.parse(value) as Partial<UnseenCompositionDocument>;
    if (parsed.version === 1 && Array.isArray(parsed.blocks)) {
      return {
        version: 1,
        blocks: parsed.blocks as UnseenCompositionBlock[],
      };
    }
  } catch {
    // Fall through to a fresh document.
  }

  return createDefaultUnseenCompositionDocument();
}
