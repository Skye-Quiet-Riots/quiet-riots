interface ProfileProps {
  name: string;
  icon: string;
  roleLabel: string;
  quote: string | null;
  bio: string | null;
  gradientStart: string | null;
  gradientEnd: string | null;
}

export function AssistantProfile({
  name,
  icon,
  roleLabel,
  quote,
  bio,
  gradientStart,
  gradientEnd,
}: ProfileProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
          style={{
            background:
              gradientStart && gradientEnd
                ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
                : '#6366f1',
          }}
        >
          {icon}
        </span>
        <div>
          <h3 className="text-lg font-bold">{name}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{roleLabel}</p>
        </div>
      </div>

      {quote && (
        <blockquote className="mb-3 border-l-2 border-zinc-300 pl-3 text-sm italic text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
          &ldquo;{quote}&rdquo;
        </blockquote>
      )}

      {bio && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{bio}</p>
      )}
    </div>
  );
}
