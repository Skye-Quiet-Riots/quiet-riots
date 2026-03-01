import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Category } from '@/types';
import { CATEGORY_EMOJIS } from '@/types';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface HeroImageProps {
  imageUrl: string | null;
  category: Category;
  categoryLabel: string;
  title: string;
  breadcrumbs?: Breadcrumb[];
  children?: React.ReactNode;
}

/** Tailwind gradient-from classes keyed by category (for fallback when no hero image). */
const CATEGORY_GRADIENTS: Record<Category, string> = {
  Transport: 'from-blue-600 to-blue-800',
  Telecoms: 'from-purple-600 to-purple-800',
  Energy: 'from-yellow-600 to-amber-800',
  Water: 'from-cyan-600 to-cyan-800',
  Banking: 'from-green-600 to-green-800',
  Insurance: 'from-indigo-600 to-indigo-800',
  Health: 'from-red-500 to-red-700',
  Housing: 'from-orange-600 to-orange-800',
  Shopping: 'from-pink-600 to-pink-800',
  Delivery: 'from-amber-600 to-amber-800',
  Education: 'from-violet-600 to-violet-800',
  Environment: 'from-emerald-600 to-emerald-800',
  Local: 'from-teal-600 to-teal-800',
  Employment: 'from-slate-600 to-slate-800',
  Tech: 'from-sky-600 to-sky-800',
  Other: 'from-zinc-600 to-zinc-800',
};

export function HeroImage({
  imageUrl,
  category,
  categoryLabel,
  title,
  breadcrumbs,
  children,
}: HeroImageProps) {
  const emoji = CATEGORY_EMOJIS[category];
  const gradient = CATEGORY_GRADIENTS[category];

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl">
      {/* Image or fallback gradient */}
      <div className="relative h-[200px] sm:h-[300px] lg:h-[380px]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1152px"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
          >
            <span className="text-6xl opacity-40 sm:text-8xl">{emoji}</span>
          </div>
        )}

        {/* Bottom gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Text content over gradient */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-2 flex items-center gap-1.5 text-sm text-white/70">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-white/40">/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-white">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-white">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          {/* Category label */}
          <span className="mb-1 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {emoji} {categoryLabel}
          </span>

          {/* Title */}
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">{title}</h1>
        </div>
      </div>

      {/* Optional floating stats bar */}
      {children && (
        <div className="relative -mt-4 px-4 sm:px-6">
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
