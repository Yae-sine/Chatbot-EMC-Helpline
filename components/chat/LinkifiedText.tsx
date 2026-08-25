import { linkify } from "@/lib/chatbot/linkify";

interface LinkifiedTextProps {
  text: string;
}

export function LinkifiedText({ text }: LinkifiedTextProps) {
  const segments = linkify(text);

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === "url" ? (
          <a
            key={`${segment.value}-${index}`}
            href={segment.value}
            target="_blank"
            rel="noopener noreferrer"
            // `[[data-crisis]_&]` re-colours links inside the crisis panel: the
            // default link blue is unreadable on dark red.
            className="rounded-sm font-medium break-words text-link underline decoration-current underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [[data-crisis]_&]:text-link-on-crisis [[data-crisis]_&]:focus-visible:ring-offset-bubble-crisis"
          >
            {segment.value}
          </a>
        ) : (
          <span key={`${index}-${segment.value}`}>{segment.value}</span>
        ),
      )}
    </>
  );
}
