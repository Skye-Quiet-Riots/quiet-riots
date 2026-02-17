import type { CountryBreakdown } from '@/types';

const FLAG_MAP: Record<string, string> = {
  GB: '🇬🇧',
  US: '🇺🇸',
  DE: '🇩🇪',
  FR: '🇫🇷',
  IE: '🇮🇪',
  AU: '🇦🇺',
  ES: '🇪🇸',
  IT: '🇮🇹',
  IN: '🇮🇳',
  BR: '🇧🇷',
  JP: '🇯🇵',
  CA: '🇨🇦',
  PT: '🇵🇹',
  NL: '🇳🇱',
  SE: '🇸🇪',
};

interface CountryListProps {
  countries: CountryBreakdown[];
}

export function CountryList({ countries }: CountryListProps) {
  if (countries.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        🌍 Countries
      </h3>
      <div className="space-y-2">
        {countries.map((c) => (
          <div key={c.country_code} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="text-lg">{FLAG_MAP[c.country_code] || '🏳️'}</span>
              <span>{c.country_name}</span>
            </span>
            <span className="font-semibold">{c.rioter_count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
