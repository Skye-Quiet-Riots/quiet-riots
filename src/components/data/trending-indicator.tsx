interface TrendingIndicatorProps {
  delta: number;
  size?: 'sm' | 'md';
}

export function TrendingIndicator({ delta, size = 'sm' }: TrendingIndicatorProps) {
  const isPositive = delta > 0;
  const formatted = delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString();

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold ${
        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
      } ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
    >
      <span>{isPositive ? '↑' : '↓'}</span>
      <span>{formatted}</span>
    </span>
  );
}
