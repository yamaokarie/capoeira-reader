export function formatTime(secs: number): string {
  const clamped = Math.max(0, Math.floor(secs));
  const hours = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const sec = clamped % 60;
  const ss = sec.toString().padStart(2, "0");
  const mm = mins.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function firstSentence(text: string, max = 72): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const sentence = trimmed.split(/[.!?\n]/)[0]?.trim() ?? trimmed;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).trimEnd()}…`;
}

export function excerpt(text: string, max = 180): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
