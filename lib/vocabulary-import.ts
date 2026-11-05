export type VocabularyImportEntry = {
  word: string;
  partOfSpeech: string;
  pronunciation: string;
  meaning: string;
  synonyms: string;
  antonyms: string;
};

export type VocabularyImportResult = {
  entries: VocabularyImportEntry[];
  errors: string[];
};

const POS_PATTERN = /^(?:adj(?:ective)?|adv(?:erb)?|n(?:oun)?|v(?:erb)?|verb|prep(?:osition)?|pron(?:oun)?|conj(?:unction)?|interj(?:ection)?|det(?:erminer)?|article|aux(?:iliary)?|modal|phrase|idiom)$/i;

function cleanValue(value: string) {
  return value.trim().replace(/[\s.।]+$/u, "").trim();
}

function normalizeList(value: string) {
  return value
    .split(/[,;]+/)
    .map((item) => cleanValue(item))
    .filter(Boolean)
    .join(", ");
}

function parseWordLine(value: string): VocabularyImportEntry {
  const result: VocabularyImportEntry = {
    word: "",
    partOfSpeech: "",
    pronunciation: "",
    meaning: "",
    synonyms: "",
    antonyms: "",
  };

  const dashMatch = value.match(/\s(?:–|—|-)\s/);
  const left = dashMatch ? value.slice(0, dashMatch.index).trim() : value.trim();
  const right = dashMatch ? value.slice((dashMatch.index ?? 0) + dashMatch[0].length).trim() : "";

  const parenthetical = [...left.matchAll(/\(([^()]*)\)/g)].map((match) => cleanValue(match[1] ?? ""));
  result.word = cleanValue(left.replace(/\s*\([^()]*\)/g, " "));
  result.meaning = cleanValue(right);

  for (const token of parenthetical) {
    if (!result.partOfSpeech && POS_PATTERN.test(token)) {
      result.partOfSpeech = token;
    } else if (!result.pronunciation) {
      result.pronunciation = token;
    }
  }

  return result;
}

export function parseVocabularyImport(text: string): VocabularyImportResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const entries: VocabularyImportEntry[] = [];
  const errors: string[] = [];
  let current: VocabularyImportEntry | null = null;
  let currentNumber = 0;

  const flush = () => {
    if (!current) return;
    if (!current.word) errors.push(`Entry ${currentNumber}: Word is missing.`);
    if (!current.meaning) errors.push(`Entry ${currentNumber}: Meaning is missing.`);
    if (current.word && current.meaning) entries.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const wordMatch = line.match(/^word\s*:\s*(.+)$/i);
    if (wordMatch) {
      flush();
      currentNumber += 1;
      current = parseWordLine(wordMatch[1] ?? "");
      continue;
    }

    if (!current) continue;

    const posMatch = line.match(/^(?:parts?\s*of\s*speech|pos)\s*:\s*(.+)$/i);
    if (posMatch) {
      current.partOfSpeech = cleanValue(posMatch[1] ?? "");
      continue;
    }

    const pronunciationMatch = line.match(/^pronunciation\s*:\s*(.+)$/i);
    if (pronunciationMatch) {
      current.pronunciation = cleanValue(pronunciationMatch[1] ?? "").replace(/^\((.*)\)$/u, "$1");
      continue;
    }

    const meaningMatch = line.match(/^(?:meaning|bangla\s*meaning|বাংলা\s*অর্থ)\s*:\s*(.+)$/i);
    if (meaningMatch) {
      current.meaning = cleanValue(meaningMatch[1] ?? "");
      continue;
    }

    const synonymMatch = line.match(/^synonyms?\s*:\s*(.+)$/i);
    if (synonymMatch) {
      current.synonyms = normalizeList(synonymMatch[1] ?? "");
      continue;
    }

    const antonymMatch = line.match(/^antonyms?\s*:\s*(.+)$/i);
    if (antonymMatch) {
      current.antonyms = normalizeList(antonymMatch[1] ?? "");
    }
  }

  flush();

  if (entries.length === 0 && errors.length === 0 && text.trim()) {
    errors.push('No vocabulary entries found. Start each entry with "Word:".');
  }

  return { entries, errors };
}
