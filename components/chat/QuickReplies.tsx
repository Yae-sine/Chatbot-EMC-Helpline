interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
}

export function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 sm:px-6">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-card-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {option}
        </button>
      ))}
    </div>
  );
}