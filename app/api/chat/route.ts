import { NextResponse } from "next/server";
import { QA_DATABASE } from "@/data/qa-database";
import { detectCrisis } from "@/lib/chatbot/safety";
import { matchEntry } from "@/lib/chatbot/matcher";
import { fallbackMessage } from "@/lib/chatbot/fallback";
import { t } from "@/lib/i18n";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let message: unknown;
  try {
    const body = (await request.json()) as { message?: unknown };
    message = body.message;
  } catch {
    return NextResponse.json({ text: t("fr", "emptyMessage"), isCrisis: false }, { status: 400 });
  }

  if (typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ text: t("fr", "emptyMessage"), isCrisis: false }, { status: 400 });
  }

  // Safety protocol runs FIRST, before any general matching (AGENTS.md §6).
  const safety = detectCrisis(message);
  if (safety.isCrisis) {
    return NextResponse.json({ text: safety.message as string, isCrisis: true });
  }

  const match = matchEntry(message, QA_DATABASE);
  if (match.matched && match.entry) {
    return NextResponse.json({ text: match.entry.answer, isCrisis: false });
  }

  return NextResponse.json({ text: fallbackMessage("fr"), isCrisis: false });
}
