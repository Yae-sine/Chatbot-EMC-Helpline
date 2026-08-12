export type LinkSegment =
  | { type: "text"; value: string }
  | { type: "url"; value: string };

export const URL_PATTERN = /https?:\/\/[^\s<>"'«»]+/g;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?)\]}]+$/;

function cleanUrl(match: string): string {
  return match.replace(TRAILING_PUNCTUATION_PATTERN, "");
}

export function linkify(text: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index as number;
    const raw = match[0];
    const cleaned = cleanUrl(raw);
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    segments.push({ type: "url", value: cleaned });
    lastIndex = index + cleaned.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}