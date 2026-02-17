import type { CommunityHealth } from '@/types';

interface HealthMeterProps {
  health: CommunityHealth;
}

const metrics = [
  {
    key: 'needs_met' as const,
    label: 'Needs Met',
    emoji: '🎯',
    description: "Members feel it's worthwhile",
  },
  {
    key: 'membership' as const,
    label: 'Membership',
    emoji: '🏷',
    description: 'Trust & belonging',
  },
  { key: 'influence' as const, label: 'Influence', emoji: '📢', description: 'Your voice matters' },
  {
    key: 'connection' as const,
    label: 'Connection',
    emoji: '💜',
    description: 'Shared experiences',
  },
];

function getBarColor(score: number): string {
  if (score >= 75) return 'bg-green-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getOverallStatus(health: CommunityHealth): { label: string; color: string } {
  const avg = (health.needs_met + health.membership + health.influence + health.connection) / 4;
  if (avg >= 75) return { label: 'Healthy', color: 'text-green-600 dark:text-green-400' };
  if (avg >= 60) return { label: 'Growing', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Needs Attention', color: 'text-red-600 dark:text-red-400' };
}

export function HealthMeter({ health }: HealthMeterProps) {
  const status = getOverallStatus(health);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          📊 Sense of Community Index
        </h3>
        <span className={`text-sm font-bold ${status.color}`}>{status.label}</span>
      </div>

      <div className="space-y-3">
        {metrics.map((metric) => {
          const score = health[metric.key];
          return (
            <div key={metric.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span>{metric.emoji}</span>
                  <span className="font-medium">{metric.label}</span>
                </span>
                <span className="font-bold">{score}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                {metric.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
