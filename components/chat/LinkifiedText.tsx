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
            className="font-medium underline text-blue-700 decoration-current underline-offset-2 hover:opacity-75"
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