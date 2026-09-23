export function formatTime(secs: number): string {
  const clamped = Math.max(0, Math.floor(secs));
  const mins = Math.floor(clamped / 60);
  const sec = clamped % 60;
  return `${mins}:${sec.toString().padStart(2, "0")}`;
}

export function formatPreciseTime(secs: number): string {
  const clamped = Math.max(0, secs);
  let mins = Math.floor(clamped / 60);
  let sec = Math.round((clamped - mins * 60) * 10) / 10;
  if (sec >= 60) {
    sec -= 60;
    mins += 1;
  }
  return `${mins}:${sec.toFixed(1).padStart(4, "0")}`;
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

export function clusterKey(moments: { id: string }[]): string {
  return moments
    .map((m) => m.id)
    .sort()
    .join(",");
}
