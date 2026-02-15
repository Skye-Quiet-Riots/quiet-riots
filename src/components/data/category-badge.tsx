import { CATEGORY_COLORS, CATEGORY_EMOJIS } from '@/types';
import type { Category } from '@/types';

interface CategoryBadgeProps {
  category: Category;
  showEmoji?: boolean;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, showEmoji = true, size = 'sm' }: CategoryBadgeProps) {
  const colors = CATEGORY_COLORS[category];
  const emoji = CATEGORY_EMOJIS[category];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colors.bg} ${colors.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {showEmoji && <span>{emoji}</span>}
      {category}
    </span>
  );
}
