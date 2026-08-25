import { LinkifiedText } from "@/components/chat/LinkifiedText";
import { cn } from "@/lib/utils";

interface MessageTextProps {
  text: string;
  className?: string;
}

/**
 * Renders answer text with its paragraphs intact.
 *
 * Several flows compose their reply from more than one validated entry joined
 * by a blank line (`lib/chatbot/flows/guided.ts`, `psychologique.ts`). Those
 * breaks used to be swallowed — the bubble had no `whitespace-pre-line` — so a
 * 700-character answer arrived as one unbroken block. Splitting here keeps the
 * text byte-identical while giving it the shape its author intended.
 */
export function MessageText({ text, className }: MessageTextProps) {
  const paragraphs = text.split(/\n{2,}/);

  return (
    <div className={cn("space-y-3", className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          <LinkifiedText text={paragraph} />
        </p>
      ))}
    </div>
  );
}
