// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CategoryBadge } from './category-badge';
import { CampaignProgress } from './campaign-progress';
import { CountryList } from './country-list';
import { HealthMeter } from './health-meter';
import { PivotTable } from './pivot-table';
import { StatBadge } from './stat-badge';
import { TrendingIndicator } from './trending-indicator';
import { WalletBalance } from './wallet-balance';
import { TransactionList } from './transaction-list';
import { AssistantBanner } from './assistant-banner';
import { AssistantDetailBanner } from './assistant-detail-banner';
import { AssistantOverviewBanner } from './assistant-overview-banner';
import type { Campaign, WalletTransaction, CategoryAssistant } from '@/types';
import type { AssistantWithStats } from '@/lib/queries/assistants';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('CategoryBadge', () => {
  it('renders category name', () => {
    render(<CategoryBadge category="Transport" />);
    expect(screen.getByText('Transport')).toBeDefined();
  });

  it('renders emoji by default', () => {
    render(<CategoryBadge category="Transport" />);
    expect(screen.getByText('🚂')).toBeDefined();
  });

  it('hides emoji when showEmoji is false', () => {
    render(<CategoryBadge category="Transport" showEmoji={false} />);
    expect(screen.queryByText('🚂')).toBeNull();
  });

  it('renders all categories', () => {
    const categories = [
      'Transport',
      'Telecoms',
      'Energy',
      'Water',
      'Banking',
      'Insurance',
      'Health',
      'Housing',
      'Shopping',
      'Delivery',
      'Education',
      'Environment',
      'Local',
      'Employment',
      'Tech',
      'Other',
    ] as const;
    categories.forEach((cat) => {
      const { unmount } = render(<CategoryBadge category={cat} />);
      expect(screen.getByText(cat)).toBeDefined();
      unmount();
    });
  });
});

describe('CountryList', () => {
  const countries = [
    {
      id: 'country-1',
      issue_id: 'issue-1',
      country_code: 'GB',
      country_name: 'United Kingdom',
      rioter_count: 500,
    },
    {
      id: 'country-2',
      issue_id: 'issue-1',
      country_code: 'US',
      country_name: 'United States',
      rioter_count: 300,
    },
  ];

  it('renders country names and counts', async () => {
    const el = await CountryList({ countries });
    render(el);
    expect(screen.getByText('United Kingdom')).toBeDefined();
    expect(screen.getByText('500')).toBeDefined();
    expect(screen.getByText('United States')).toBeDefined();
    expect(screen.getByText('300')).toBeDefined();
  });

  it('renders country flags', async () => {
    const el = await CountryList({ countries });
    render(el);
    expect(screen.getByText('🇬🇧')).toBeDefined();
    expect(screen.getByText('🇺🇸')).toBeDefined();
  });

  it('renders nothing when empty', async () => {
    const el = await CountryList({ countries: [] });
    expect(el).toBeNull();
  });

  it('renders fallback flag for unknown country code', async () => {
    const unknown = [
      {
        id: 'country-1',
        issue_id: 'issue-1',
        country_code: 'ZZ',
        country_name: 'Unknown',
        rioter_count: 1,
      },
    ];
    const el = await CountryList({ countries: unknown });
    render(el);
    expect(screen.getByText('🏳️')).toBeDefined();
  });
});

describe('HealthMeter', () => {
  const healthy = {
    id: 'health-1',
    issue_id: 'issue-1',
    needs_met: 85,
    membership: 90,
    influence: 80,
    connection: 75,
  };

  const struggling = {
    id: 'health-1',
    issue_id: 'issue-1',
    needs_met: 40,
    membership: 35,
    influence: 50,
    connection: 45,
  };

  it('renders all four metric labels', async () => {
    const el = await HealthMeter({ health: healthy });
    render(el);
    expect(screen.getByText('Needs Met')).toBeDefined();
    expect(screen.getByText('Membership')).toBeDefined();
    expect(screen.getByText('Influence')).toBeDefined();
    expect(screen.getByText('Connection')).toBeDefined();
  });

  it('renders scores', async () => {
    const el = await HealthMeter({ health: healthy });
    render(el);
    expect(screen.getByText('85/100')).toBeDefined();
    expect(screen.getByText('90/100')).toBeDefined();
    expect(screen.getByText('80/100')).toBeDefined();
    expect(screen.getByText('75/100')).toBeDefined();
  });

  it('shows Healthy status for high scores', async () => {
    const el = await HealthMeter({ health: healthy });
    render(el);
    expect(screen.getByText('Healthy')).toBeDefined();
  });

  it('shows Needs Attention status for low scores', async () => {
    const el = await HealthMeter({ health: struggling });
    render(el);
    expect(screen.getByText('Needs Attention')).toBeDefined();
  });

  it('shows Growing status for medium scores', async () => {
    const medium = {
      id: 'health-1',
      issue_id: 'issue-1',
      needs_met: 65,
      membership: 70,
      influence: 60,
      connection: 65,
    };
    const el = await HealthMeter({ health: medium });
    render(el);
    expect(screen.getByText('Growing')).toBeDefined();
  });
});

describe('PivotTable', () => {
  const issueRows = [
    {
      organisation_id: 'org-1',
      organisation_name: 'Network Rail',
      logo_emoji: '🚂',
      rioter_count: 500,
      rank: 1,
    },
    {
      organisation_id: 'org-2',
      organisation_name: 'TfL',
      logo_emoji: '🚇',
      rioter_count: 300,
      rank: 2,
    },
  ];

  const orgRows = [
    { issue_id: 'issue-1', issue_name: 'Train Delays', rioter_count: 500, rank: 1 },
    { issue_id: 'issue-2', issue_name: 'Bus Routes', rioter_count: 200, rank: 2 },
  ];

  it('renders issue pivot rows', async () => {
    const el = await PivotTable({ mode: 'issue', rows: issueRows });
    render(el);
    expect(screen.getByText('Network Rail')).toBeDefined();
    expect(screen.getByText('TfL')).toBeDefined();
    expect(screen.getByText('#1')).toBeDefined();
    expect(screen.getByText('#2')).toBeDefined();
  });

  it('links to organisation pages in issue mode', async () => {
    const el = await PivotTable({ mode: 'issue', rows: issueRows });
    render(el);
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/organisations/org-1');
  });

  it('shows YOU badge for current org', async () => {
    const el = await PivotTable({ mode: 'issue', rows: issueRows, currentOrgId: 'org-1' });
    render(el);
    expect(screen.getByText('YOU')).toBeDefined();
  });

  it('renders org pivot rows', async () => {
    const el = await PivotTable({ mode: 'org', rows: orgRows });
    render(el);
    expect(screen.getByText('Train Delays')).toBeDefined();
    expect(screen.getByText('Bus Routes')).toBeDefined();
  });

  it('links to issue pages in org mode', async () => {
    const el = await PivotTable({ mode: 'org', rows: orgRows });
    render(el);
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/issues/issue-1');
  });

  it('shows YOU badge for current issue', async () => {
    const el = await PivotTable({ mode: 'org', rows: orgRows, currentIssueId: 'issue-2' });
    render(el);
    expect(screen.getByText('YOU')).toBeDefined();
  });
});

describe('StatBadge', () => {
  it('renders value and label', () => {
    render(<StatBadge value={42} label="Rioters" />);
    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('Rioters')).toBeDefined();
  });

  it('formats numbers with locale', () => {
    render(<StatBadge value={1234} label="Count" />);
    expect(screen.getByText('1,234')).toBeDefined();
  });

  it('renders string values as-is', () => {
    render(<StatBadge value="N/A" label="Score" />);
    expect(screen.getByText('N/A')).toBeDefined();
  });

  it('renders emoji when provided', () => {
    render(<StatBadge value={10} label="Issues" emoji="📋" />);
    expect(screen.getByText('📋')).toBeDefined();
  });
});

describe('TrendingIndicator', () => {
  it('shows up arrow for positive delta', () => {
    render(<TrendingIndicator delta={42} />);
    expect(screen.getByText('↑')).toBeDefined();
    expect(screen.getByText('+42')).toBeDefined();
  });

  it('shows down arrow for negative delta', () => {
    render(<TrendingIndicator delta={-10} />);
    expect(screen.getByText('↓')).toBeDefined();
  });

  it('shows down arrow for zero delta', () => {
    render(<TrendingIndicator delta={0} />);
    expect(screen.getByText('↓')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
  });

  it('formats large numbers', () => {
    render(<TrendingIndicator delta={1500} />);
    expect(screen.getByText('+1,500')).toBeDefined();
  });
});

const makeCampaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: 'camp-1',
  issue_id: 'issue-1',
  org_id: null,
  title: 'Test Campaign',
  description: '',
  target_pence: 10000,
  raised_pence: 3100,
  contributor_count: 42,
  recipient: null,
  recipient_url: null,
  status: 'active',
  platform_fee_pct: 15,
  funded_at: null,
  disbursed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('CampaignProgress', () => {
  it('renders nothing when no campaigns', async () => {
    const el = await CampaignProgress({ campaigns: [] });
    expect(el).toBeNull();
  });

  it('renders campaign title and progress', async () => {
    const el = await CampaignProgress({ campaigns: [makeCampaign()] });
    render(el);
    expect(screen.getByText('Test Campaign')).toBeDefined();
    expect(screen.getByText(/£31 of £100/)).toBeDefined();
    expect(screen.getByText(/31%/)).toBeDefined();
    // ICU plural not parsed by mock — check count and raw plural string separately
    expect(screen.getByText(/42/)).toBeDefined();
    expect(screen.getByText(/backer/)).toBeDefined();
  });

  it('shows funded badge', async () => {
    const el = await CampaignProgress({ campaigns: [makeCampaign({ status: 'funded' })] });
    render(el);
    expect(screen.getByText('Funded')).toBeDefined();
  });

  it('shows backer text for single contributor', async () => {
    const el = await CampaignProgress({
      campaigns: [makeCampaign({ contributor_count: 1 })],
    });
    render(el);
    // The mock doesn't parse ICU plurals, so the rendered text includes the raw ICU string
    expect(screen.getByText(/1.*backer/)).toBeDefined();
  });

  it('formats pence amounts correctly', async () => {
    const el = await CampaignProgress({
      campaigns: [makeCampaign({ raised_pence: 50, target_pence: 500 })],
    });
    render(el);
    expect(screen.getByText(/£0\.50.*£5/)).toBeDefined();
  });
});

describe('WalletBalance', () => {
  it('renders balance and stats', async () => {
    const el = await WalletBalance({
      balance_pence: 450,
      total_loaded_pence: 1000,
      total_spent_pence: 550,
      campaigns_supported: 3,
    });
    render(el);
    expect(screen.getByText('£4.50')).toBeDefined();
    expect(screen.getByText('£10')).toBeDefined();
    expect(screen.getByText('£5.50')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    // ICU plural not parsed by mock — check the raw string contains 'campaign'
    expect(screen.getByText(/campaign/)).toBeDefined();
  });

  it('shows campaign text for single campaign', async () => {
    const el = await WalletBalance({
      balance_pence: 100,
      total_loaded_pence: 100,
      total_spent_pence: 0,
      campaigns_supported: 1,
    });
    render(el);
    expect(screen.getByText(/campaign/)).toBeDefined();
  });
});

const makeTx = (overrides: Partial<WalletTransaction> = {}): WalletTransaction => ({
  id: 'tx-1',
  wallet_id: 'wallet-1',
  type: 'topup',
  amount_pence: 500,
  campaign_id: null,
  issue_id: null,
  stripe_payment_id: null,
  description: 'Top-up via card',
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('TransactionList', () => {
  it('renders empty state', async () => {
    const el = await TransactionList({ transactions: [] });
    render(el);
    expect(screen.getByText(/No transactions yet/)).toBeDefined();
  });

  it('renders transactions with correct formatting', async () => {
    const el = await TransactionList({
      transactions: [
        makeTx({ type: 'topup', amount_pence: 500, description: 'Top-up via card' }),
        makeTx({
          id: 'tx-2',
          type: 'contribute',
          amount_pence: 100,
          description: 'Avanti Legal Review',
        }),
      ],
    });
    render(el);
    expect(screen.getByText('Top-up via card')).toBeDefined();
    expect(screen.getByText('Avanti Legal Review')).toBeDefined();
    expect(screen.getByText('+£5')).toBeDefined();
    expect(screen.getByText('-£1')).toBeDefined();
  });
});

// ─── Assistant components ──────────────────────────────────

const makeAssistant = (overrides: Partial<CategoryAssistant> = {}): CategoryAssistant => ({
  id: 'ast-transport',
  category: 'transport',
  agent_name: 'Jett',
  agent_icon: '🛩️',
  agent_quote: 'I map delay patterns',
  agent_bio: 'AI tracking bot',
  agent_gradient_start: '#8b5cf6',
  agent_gradient_end: '#6d28d9',
  human_name: 'Bex',
  human_icon: '👩🏻',
  human_quote: 'I organise commuters',
  human_bio: 'Manchester commuter',
  human_gradient_start: '#3b82f6',
  human_gradient_end: '#1d4ed8',
  human_user_id: null,
  goal: 'Help rioters hold UK transport companies to account',
  focus: 'Avanti West Coast cancellation patterns',
  focus_detail: null,
  profile_url: '/assistants/transport',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
});

const makeAssistantWithStats = (
  overrides: Partial<AssistantWithStats> = {},
): AssistantWithStats => ({
  ...makeAssistant(),
  riot_count: 5,
  rioter_count: 2847,
  action_count: 12,
  ...overrides,
});

describe('AssistantBanner', () => {
  it('renders agent and human names', () => {
    render(<AssistantBanner assistant={makeAssistantWithStats()} />);
    expect(screen.getByText(/Jett & Bex/)).toBeDefined();
  });

  it('renders category label', () => {
    render(<AssistantBanner assistant={makeAssistantWithStats()} />);
    expect(screen.getByText(/Your Transport Assistants/)).toBeDefined();
  });

  it('renders goal text', () => {
    render(<AssistantBanner assistant={makeAssistantWithStats()} />);
    expect(screen.getByText('Help rioters hold UK transport companies to account')).toBeDefined();
  });

  it('renders "Meet them" link to assistants page', () => {
    render(<AssistantBanner assistant={makeAssistantWithStats()} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/assistants/transport');
    expect(screen.getByText('Meet them →')).toBeDefined();
  });

  it('renders both assistant icons', () => {
    render(<AssistantBanner assistant={makeAssistantWithStats()} />);
    expect(screen.getByText('🛩️')).toBeDefined();
    expect(screen.getByText('👩🏻')).toBeDefined();
  });

  it('handles missing goal gracefully', () => {
    render(<AssistantBanner assistant={makeAssistantWithStats({ goal: null })} />);
    expect(screen.getByText(/Jett & Bex/)).toBeDefined();
  });
});

describe('AssistantDetailBanner', () => {
  it('renders category heading', () => {
    render(<AssistantDetailBanner assistant={makeAssistant()} />);
    expect(screen.getByText('Your Transport Assistants')).toBeDefined();
  });

  it('renders agent and human names with roles', () => {
    render(<AssistantDetailBanner assistant={makeAssistant()} />);
    expect(screen.getByText('(AI Agent)')).toBeDefined();
    expect(screen.getByText('(Human Organiser)')).toBeDefined();
  });

  it('renders goal', () => {
    render(<AssistantDetailBanner assistant={makeAssistant()} />);
    expect(screen.getByText('Help rioters hold UK transport companies to account')).toBeDefined();
  });

  it('renders assistant focus', () => {
    render(<AssistantDetailBanner assistant={makeAssistant()} />);
    expect(screen.getByText(/Avanti West Coast cancellation patterns/)).toBeDefined();
  });

  it('prefers focus prop over assistant focus', () => {
    render(<AssistantDetailBanner assistant={makeAssistant()} focus="Northern Rail punctuality" />);
    expect(screen.getByText(/Northern Rail punctuality/)).toBeDefined();
    expect(screen.queryByText(/Avanti West Coast/)).toBeNull();
  });

  it('renders agentHelps and humanHelps when provided', () => {
    render(
      <AssistantDetailBanner
        assistant={makeAssistant()}
        agentHelps="Filing delay-repay claims automatically"
        humanHelps="Coordinating group complaints"
      />,
    );
    expect(screen.getByText('Filing delay-repay claims automatically')).toBeDefined();
    expect(screen.getByText('Coordinating group complaints')).toBeDefined();
    expect(screen.getByText(/Jett helps with/)).toBeDefined();
    expect(screen.getByText(/Bex helps with/)).toBeDefined();
  });

  it('omits help sections when not provided', () => {
    render(<AssistantDetailBanner assistant={makeAssistant()} />);
    expect(screen.queryByText(/helps with/)).toBeNull();
  });

  it('links to assistant profile', () => {
    render(<AssistantDetailBanner assistant={makeAssistant()} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/assistants/transport');
    expect(screen.getByText(/Learn more about Jett & Bex/)).toBeDefined();
  });

  it('handles null goal and focus gracefully', () => {
    render(<AssistantDetailBanner assistant={makeAssistant({ goal: null, focus: null })} />);
    expect(screen.getByText('Your Transport Assistants')).toBeDefined();
    expect(screen.queryByText(/Current focus/)).toBeNull();
  });

  it('renders both assistant icons', () => {
    render(<AssistantDetailBanner assistant={makeAssistant()} />);
    expect(screen.getByText('🛩️')).toBeDefined();
    expect(screen.getByText('👩🏻')).toBeDefined();
  });
});

describe('AssistantOverviewBanner', () => {
  const assistants = [
    makeAssistantWithStats(),
    makeAssistantWithStats({
      id: 'ast-telecoms',
      category: 'telecoms',
      agent_name: 'Ziggy',
      agent_icon: '📡',
      agent_gradient_start: '#10b981',
      agent_gradient_end: '#059669',
      human_name: 'Priya',
      human_icon: '👩🏽',
      human_gradient_start: '#f59e0b',
      human_gradient_end: '#d97706',
    }),
  ];

  it('renders assistant count', () => {
    render(<AssistantOverviewBanner assistants={assistants} />);
    expect(screen.getByText('2 AI & Human Assistant Pairs')).toBeDefined();
  });

  it('renders description text', () => {
    render(<AssistantOverviewBanner assistants={assistants} />);
    expect(
      screen.getByText('Every category has a dedicated AI agent and human organiser to help.'),
    ).toBeDefined();
  });

  it('links to assistants page', () => {
    render(<AssistantOverviewBanner assistants={assistants} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/assistants');
  });

  it('renders "Meet them" CTA', () => {
    render(<AssistantOverviewBanner assistants={assistants} />);
    expect(screen.getByText('Meet them →')).toBeDefined();
  });

  it('renders preview icons', () => {
    render(<AssistantOverviewBanner assistants={assistants} />);
    expect(screen.getByText('🛩️')).toBeDefined();
    expect(screen.getByText('📡')).toBeDefined();
  });
});
