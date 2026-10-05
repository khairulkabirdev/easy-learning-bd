export function isEnglishFirstPaperSubject(subject: {
  name: string;
  slug?: string | null;
  code?: string | null;
}) {
  const value = `${subject.name} ${subject.slug ?? ""} ${subject.code ?? ""}`.toLowerCase();
  const hasEnglish = value.includes("english") || value.includes("ইংরেজি");
  if (!hasEnglish) return false;

  // Some curricula store English 1st Paper simply as "English". Treat an
  // English subject as first paper unless it is explicitly marked as 2nd paper.
  const hasSecondPaper = /\b2nd\b|\bsecond\b|২য়|২য়|paper\s*2|2\s*paper/.test(value);
  return !hasSecondPaper;
}
