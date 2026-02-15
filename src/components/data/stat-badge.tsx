interface StatBadgeProps {
  value: number | string;
  label: string;
  emoji?: string;
}

export function StatBadge({ value, label, emoji }: StatBadgeProps) {
  const formatted = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="flex flex-col items-center rounded-lg bg-zinc-50 px-4 py-3 text-center dark:bg-zinc-800/50">
      <span className="text-xl font-bold">
        {emoji && <span className="mr-1">{emoji}</span>}
        {formatted}
      </span>
      <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  );
}
