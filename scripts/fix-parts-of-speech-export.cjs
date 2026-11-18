const fs = require("node:fs");
const path = require("node:path");

const patches = {
  "app/admin/content/actions.ts": [
    {
      "before": "  \"punctuation-and-capitalization\",\n  \"preposition\",\n  \"suffix-and-prefix\",\n  \"tag-question\",\n",
      "after": "  \"punctuation-and-capitalization\",\n  \"preposition\",\n  \"parts-of-speech\",\n  \"suffix-and-prefix\",\n  \"tag-question\",\n"
    },
    {
      "before": "        tx.preposition.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),\n        tx.suffixAndPrefix.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),\n        tx.tagQuestion.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),\n        tx.connector.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),\n",
      "after": "        tx.preposition.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),\n        tx.suffixAndPrefix.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),\n        tx.partsOfSpeech.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),\n        tx.tagQuestion.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),\n        tx.connector.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),\n"
    },
    {
      "before": "    await tx.preposition.deleteMany({ where });\n    await tx.suffixAndPrefix.deleteMany({ where });\n    await tx.tagQuestion.deleteMany({ where });\n    await tx.connector.deleteMany({ where });\n",
      "after": "    await tx.preposition.deleteMany({ where });\n    await tx.suffixAndPrefix.deleteMany({ where });\n    await tx.partsOfSpeech.deleteMany({ where });\n    await tx.tagQuestion.deleteMany({ where });\n    await tx.connector.deleteMany({ where });\n"
    },
    {
      "before": "    ? getFixedModelQuestionSlots(fixedLayout).findIndex((slot) => slot.kind === parsed.kind)\n    : -1;\n  if (fixedLayout && fixedKindPosition === -1) {\n    throw new Error(\"This block is not part of the fixed English 1st Paper layout for this class.\");\n  }\n\n",
      "after": "    ? getFixedModelQuestionSlots(fixedLayout).findIndex((slot) => slot.kind === parsed.kind)\n    : -1;\n  if (parsed.kind === \"parts-of-speech\" && fixedLayout !== \"class-6-7-second-paper\") {\n    throw new Error(\"This Parts of Speech block is only available in Class 6–7 English 2nd Paper model question sets.\");\n  }\n  if (fixedLayout && fixedKindPosition === -1) {\n    throw new Error(\"This block is not part of the fixed model question layout for this class and subject.\");\n  }\n\n"
    },
    {
      "before": "        break;\n\n      case \"tag-question\":\n        await tx.tagQuestion.create({\n",
      "after": "        break;\n\n      case \"parts-of-speech\":\n        await tx.partsOfSpeech.create({\n          data: {\n            ...baseData,\n            question: \"\",\n            answer: \"\",\n            details: \"\",\n          },\n        });\n        break;\n\n      case \"tag-question\":\n        await tx.tagQuestion.create({\n"
    },
    {
      "before": "  });\n  if (linkedSets.some((set) => getFixedModelQuestionLayout(set.class.name, set.subject))) {\n    throw new Error(\"Fixed English 1st Paper model-question sections cannot be reordered.\");\n  }\n\n",
      "after": "  });\n  if (linkedSets.some((set) => getFixedModelQuestionLayout(set.class.name, set.subject))) {\n    throw new Error(\"Fixed model question sections cannot be reordered.\");\n  }\n\n"
    },
    {
      "before": "}\n\nexport async function updateTagQuestion(input: unknown) {\n  return updateThreeFieldRecord(input, {\n",
      "after": "}\n\nexport async function updatePartsOfSpeech(input: unknown) {\n  return updateThreeFieldRecord(input, {\n    entityName: \"PartsOfSpeech\",\n    expectedKind: \"parts-of-speech\",\n    update: (parsed, userId, organizationId) =>\n      prisma.partsOfSpeech.update({\n        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },\n        data: {\n          question: parsed.question,\n          answer: parsed.answer,\n          details: parsed.details,\n          updatedBy: userId,\n        },\n      }),\n  });\n}\n\nexport async function updateTagQuestion(input: unknown) {\n  return updateThreeFieldRecord(input, {\n"
    }
  ],
  "app/admin/content/content-types.ts": [
    {
      "before": "  | \"punctuation-and-capitalization\"\n  | \"preposition\"\n  | \"suffix-and-prefix\"\n  | \"tag-question\"\n",
      "after": "  | \"punctuation-and-capitalization\"\n  | \"preposition\"\n  | \"parts-of-speech\"\n  | \"suffix-and-prefix\"\n  | \"tag-question\"\n"
    },
    {
      "before": "  preposition: PrepositionRecord | null;\n  suffixAndPrefix: SuffixAndPrefixRecord | null;\n  tagQuestion: TagQuestionRecord | null;\n  connector: ConnectorRecord | null;\n",
      "after": "  preposition: PrepositionRecord | null;\n  suffixAndPrefix: SuffixAndPrefixRecord | null;\n  partsOfSpeech?: SuffixAndPrefixRecord | null;\n  tagQuestion: TagQuestionRecord | null;\n  connector: ConnectorRecord | null;\n"
    }
  ],
  "prisma/schema.prisma": [
    {
      "before": "  preposition                  Preposition?\n  suffixAndPrefix              SuffixAndPrefix?\n  tagQuestion                  TagQuestion?\n  connector                    Connector?\n",
      "after": "  preposition                  Preposition?\n  suffixAndPrefix              SuffixAndPrefix?\n  partsOfSpeech                PartsOfSpeech?\n  tagQuestion                  TagQuestion?\n  connector                    Connector?\n"
    },
    {
      "before": "}\n\nmodel TagQuestion {\n  id             String   @id @default(cuid())\n",
      "after": "}\n\nmodel PartsOfSpeech {\n  id             String   @id @default(cuid())\n  contentBlockId String   @unique\n  contentId      String\n  classId        String\n  subjectId      String\n  unitId         String\n  lessonId       String\n  topicId        String?\n  question       String   @default(\"\")\n  answer         String   @default(\"\")\n  details        String   @default(\"\")\n  organizationId String\n  createdBy      String\n  updatedBy      String\n  createdAt      DateTime @default(now())\n  updatedAt      DateTime @updatedAt\n\n  contentBlock   ContentBlock @relation(fields: [contentBlockId], references: [id], onDelete: Cascade)\n\n  @@index([organizationId, contentId])\n}\n\nmodel TagQuestion {\n  id             String   @id @default(cuid())\n"
    }
  ],
  "app/admin/content/english-second-paper-blocks/types.ts": [
    {
      "before": "}\n\nfunction normalizeTagQuestionDocument(value: unknown, recordId: string): TagQuestionDocument {\n  const parsed = (value && typeof value === \"object\" ? value : {}) as Partial<TagQuestionDocument>;\n",
      "after": "}\n\n// Keep answers with their words when a new target is inserted before them.\nfunction normalizePartsOfSpeechDocument(value: unknown, recordId: string): SuffixPrefixDocument {\n  const parsed = (value && typeof value === \"object\" ? value : {}) as Partial<SuffixPrefixDocument>;\n  const question = typeof parsed.question === \"string\" ? parsed.question : \"\";\n  const sourcesByWord = new Map<string, SuffixPrefixItem[]>();\n  const occupiedIds = new Set<string>();\n  if (Array.isArray(parsed.items)) {\n    for (const item of parsed.items) {\n      if (!item || typeof item.word !== \"string\") continue;\n      const matching = sourcesByWord.get(item.word) || [];\n      matching.push(item);\n      sourcesByWord.set(item.word, matching);\n      if (typeof item.id === \"string\" && item.id) occupiedIds.add(item.id);\n    }\n  }\n  const usedIds = new Set<string>();\n  return {\n    version: 1,\n    question,\n    items: extractSuffixPrefixWords(question).map((word, sortOrder) => {\n      const source = sourcesByWord.get(word)?.shift();\n      let id = typeof source?.id === \"string\" && !usedIds.has(source.id) ? source.id : \"\";\n      if (!id) {\n        id = `${recordId}-part-of-speech-${sortOrder + 1}`;\n        while (occupiedIds.has(id) || usedIds.has(id)) id += \"-new\";\n      }\n      usedIds.add(id);\n      return { id, sortOrder, word, answer: typeof source?.answer === \"string\" ? source.answer : \"\" };\n    }),\n  };\n}\n\nfunction normalizeTagQuestionDocument(value: unknown, recordId: string): TagQuestionDocument {\n  const parsed = (value && typeof value === \"object\" ? value : {}) as Partial<TagQuestionDocument>;\n"
    },
    {
      "before": "\nexport function parseEnglishSecondPaperDocument(\n  kind: EnglishSecondPaperKind,\n  value: string,\n  recordId: string,\n",
      "after": "\nexport function parseEnglishSecondPaperDocument(\n  kind: EnglishSecondPaperKind | \"parts-of-speech\",\n  value: string,\n  recordId: string,\n"
    },
    {
      "before": "    case \"suffix-and-prefix\":\n      return normalizeSuffixPrefixDocument(parsed, recordId);\n    case \"tag-question\":\n      return normalizeTagQuestionDocument(parsed, recordId);\n",
      "after": "    case \"suffix-and-prefix\":\n      return normalizeSuffixPrefixDocument(parsed, recordId);\n    case \"parts-of-speech\":\n      return normalizePartsOfSpeechDocument(parsed, recordId);\n    case \"tag-question\":\n      return normalizeTagQuestionDocument(parsed, recordId);\n"
    }
  ],
  "components/tiptap-templates/simple/simple-editor.tsx": [
    {
      "before": "import Link from \"@tiptap/extension-link\"\nimport Underline from \"@tiptap/extension-underline\"\nimport Placeholder from \"@tiptap/extension-placeholder\"\nimport { Table } from \"@tiptap/extension-table\"\n",
      "after": "import Link from \"@tiptap/extension-link\"\nimport Underline from \"@tiptap/extension-underline\"\nimport { WordScopedUnderline } from \"@/components/tiptap-extension/word-scoped-underline\"\nimport Placeholder from \"@tiptap/extension-placeholder\"\nimport { Table } from \"@tiptap/extension-table\"\n"
    },
    {
      "before": "  placeholder?: string\n  onEditorReady?: (editor: Editor | null) => void\n}\n\n",
      "after": "  placeholder?: string\n  onEditorReady?: (editor: Editor | null) => void\n  wordScopedUnderline?: boolean\n}\n\n"
    },
    {
      "before": "  placeholder = \"Write here...\",\n  onEditorReady,\n}: EmbeddedSimpleEditorProps) {\n  const isMobile = useIsBreakpoint()\n",
      "after": "  placeholder = \"Write here...\",\n  onEditorReady,\n  wordScopedUnderline = false,\n}: EmbeddedSimpleEditorProps) {\n  const isMobile = useIsBreakpoint()\n"
    },
    {
      "before": "      StarterKit.configure({\n        horizontalRule: false,\n      }),\n      Link.configure({\n",
      "after": "      StarterKit.configure({\n        horizontalRule: false,\n        underline: false,\n      }),\n      Link.configure({\n"
    },
    {
      "before": "        enableClickSelection: true,\n      }),\n      Underline,\n      Placeholder.configure({\n        placeholder,\n",
      "after": "        enableClickSelection: true,\n      }),\n      wordScopedUnderline ? WordScopedUnderline : Underline,\n      Placeholder.configure({\n        placeholder,\n"
    }
  ]
};

const standaloneParserPatch = [
  {
    "before": "  | \"preposition\"\n  | \"suffix-and-prefix\"\n  | \"tag-question\"\n  | \"connector\";\n",
    "after": "  | \"preposition\"\n  | \"suffix-and-prefix\"\n  | \"parts-of-speech\"\n  | \"tag-question\"\n  | \"connector\";\n"
  },
  {
    "before": "  \"preposition\",\n  \"suffix-and-prefix\",\n  \"tag-question\",\n  \"connector\",\n",
    "after": "  \"preposition\",\n  \"suffix-and-prefix\",\n  \"parts-of-speech\",\n  \"tag-question\",\n  \"connector\",\n"
  },
  {
    "before": "    description: \"Mark root words in the question and save each completed-word answer.\",\n    blockKind: \"suffix-and-prefix\",\n  },\n  \"tag-question\": {\n",
    "after": "    description: \"Mark root words in the question and save each completed-word answer.\",\n    blockKind: \"suffix-and-prefix\",\n  },\n  \"parts-of-speech\": {\n    title: \"Parts of Speech\",\n    singular: \"Parts of Speech block\",\n    description: \"Mark words in a sentence or passage and save the part of speech of each word.\",\n    blockKind: \"parts-of-speech\",\n  },\n  \"tag-question\": {\n"
  },
  {
    "before": "      answer: sourceItems[index]?.answer || \"\",\n    })),\n  };\n}\n",
    "after": "      answer: sourceItems[index]?.answer || \"\",\n    })),\n  };\n}\n\n// Keep answers with their words when a new target is inserted before them.\nfunction normalizePartsOfSpeechDocument(value: unknown, recordId: string): SuffixPrefixDocument {\n  const parsed = (value && typeof value === \"object\" ? value : {}) as Partial<SuffixPrefixDocument>;\n  const question = typeof parsed.question === \"string\" ? parsed.question : \"\";\n  const sourcesByWord = new Map<string, SuffixPrefixItem[]>();\n  const occupiedIds = new Set<string>();\n  if (Array.isArray(parsed.items)) {\n    for (const item of parsed.items) {\n      if (!item || typeof item.word !== \"string\") continue;\n      const matching = sourcesByWord.get(item.word) || [];\n      matching.push(item);\n      sourcesByWord.set(item.word, matching);\n      if (typeof item.id === \"string\" && item.id) occupiedIds.add(item.id);\n    }\n  }\n  const usedIds = new Set<string>();\n  return {\n    version: 1,\n    question,\n    items: extractSuffixPrefixWords(question).map((word, sortOrder) => {\n      const source = sourcesByWord.get(word)?.shift();\n      let id = typeof source?.id === \"string\" && !usedIds.has(source.id) ? source.id : \"\";\n      if (!id) {\n        id = `${recordId}-part-of-speech-${sortOrder + 1}`;\n        while (occupiedIds.has(id) || usedIds.has(id)) id += \"-new\";\n      }\n      usedIds.add(id);\n      return { id, sortOrder, word, answer: typeof source?.answer === \"string\" ? source.answer : \"\" };\n    }),\n  };\n}\n"
  },
  {
    "before": "    case \"suffix-and-prefix\":\n      return normalizeSuffixPrefixDocument(parsed, recordId);\n    case \"tag-question\":\n      return normalizeTagQuestionDocument(parsed, recordId);\n",
    "after": "    case \"suffix-and-prefix\":\n      return normalizeSuffixPrefixDocument(parsed, recordId);\n    case \"parts-of-speech\":\n      return normalizePartsOfSpeechDocument(parsed, recordId);\n    case \"tag-question\":\n      return normalizeTagQuestionDocument(parsed, recordId);\n"
  },
  {
    "before": "      return normalizeSubstitutionDocument({}, id);\n    case \"suffix-and-prefix\":\n      return { version: 1, question: \"\", items: [] };\n    case \"tag-question\":\n",
    "after": "      return normalizeSubstitutionDocument({}, id);\n    case \"suffix-and-prefix\":\n    case \"parts-of-speech\":\n      return { version: 1, question: \"\", items: [] };\n    case \"tag-question\":\n"
  },
  {
    "before": "      break;\n    }\n    case \"suffix-and-prefix\": {\n      const document = draft.document as SuffixPrefixDocument;\n      if (!richTextHasContent(document.question)) errors.question = \"Question is required.\";\n      if (document.items.length === 0) errors.document = \"Add at least one Suffix / Prefix root word.\";\n      document.items.forEach((item, index) => {\n        if (!item.answer.trim()) errors[`suffix:${item.id}`] = `Answer ${index + 1} is required.`;\n      });\n      break;\n",
    "after": "      break;\n    }\n    case \"suffix-and-prefix\":\n    case \"parts-of-speech\": {\n      const document = draft.document as SuffixPrefixDocument;\n      const isPartsOfSpeech = kind === \"parts-of-speech\";\n      if (!richTextHasContent(document.question)) errors.question = \"Question is required.\";\n      if (document.items.length === 0) errors.document = isPartsOfSpeech ? \"Mark at least one target word.\" : \"Add at least one Suffix / Prefix root word.\";\n      document.items.forEach((item, index) => {\n        if (!item.answer.trim()) errors[`suffix:${item.id}`] = isPartsOfSpeech\n          ? `Enter the part of speech for “${item.word}”.`\n          : `Answer ${index + 1} is required.`;\n      });\n      break;\n"
  }
];
const root = path.resolve(__dirname, "..");

function count(text, pattern) {
  return text.split(pattern).length - 1;
}

function mergeFile(relative, hunks) {
  const filename = path.join(root, relative);
  const original = fs.readFileSync(filename, "utf8");
  const crlf = original.includes("\r\n");
  let updated = original.replace(/\r\n/g, "\n");
  const parserFile = relative.endsWith("english-second-paper-blocks/types.ts");
  if (parserFile && fs.existsSync(path.join(root, "app/admin/content/english-second-paper-blocks/store.ts"))) {
    hunks = standaloneParserPatch;
  }
  if (parserFile &&
      updated.includes('case "parts-of-speech":') &&
      updated.includes("return normalizePartsOfSpeechDocument(parsed, recordId);")) {
    return { filename, original, updated: original, relative };
  }
  for (const { before, after } of hunks) {
    if (count(updated, after) === 1) continue;
    if (count(updated, before) !== 1) {
      const hint = after.split("\n").find((line) => line.includes("partsOfSpeech") || line.includes("PartsOfSpeech"));
      throw new Error(`Cannot safely merge ${relative}${hint ? " near " + hint.trim() : ""}. No source files were changed.`);
    }
    updated = updated.replace(before, () => after);
  }
  if (crlf) updated = updated.replace(/\n/g, "\r\n");
  return { filename, original, updated, relative };
}

try {
  // Resolve every change before writing so conflicts cannot leave a partial merge.
  const files = Object.entries(patches).map(([filename, hunks]) => mergeFile(filename, hunks));
  const changed = files.filter(({ original, updated }) => original !== updated);
  if (!changed.length) {
    console.log("Parts of Speech source dependencies are already in place.");
  } else {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backup = path.join(root, "backups", `parts-of-speech-export-${stamp}`);
    for (const { filename, relative } of changed) {
      const dest = path.join(backup, relative + ".bak");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(filename, dest, fs.constants.COPYFILE_EXCL);
    }
    for (const { filename, updated, relative } of changed) {
      fs.writeFileSync(filename, updated, "utf8");
      console.log(`Updated ${relative}`);
    }
    console.log(`Original files backed up to ${backup}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
