// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CategoryBadge } from './category-badge';
import { CountryList } from './country-list';
import { HealthMeter } from './health-meter';
import { PivotTable } from './pivot-table';
import { StatBadge } from './stat-badge';
import { TrendingIndicator } from './trending-indicator';

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
    { id: 1, issue_id: 1, country_code: 'GB', country_name: 'United Kingdom', rioter_count: 500 },
    { id: 2, issue_id: 1, country_code: 'US', country_name: 'United States', rioter_count: 300 },
  ];

  it('renders country names and counts', () => {
    render(<CountryList countries={countries} />);
    expect(screen.getByText('United Kingdom')).toBeDefined();
    expect(screen.getByText('500')).toBeDefined();
    expect(screen.getByText('United States')).toBeDefined();
    expect(screen.getByText('300')).toBeDefined();
  });

  it('renders country flags', () => {
    render(<CountryList countries={countries} />);
    expect(screen.getByText('🇬🇧')).toBeDefined();
    expect(screen.getByText('🇺🇸')).toBeDefined();
  });

  it('renders nothing when empty', () => {
    const { container } = render(<CountryList countries={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders fallback flag for unknown country code', () => {
    const unknown = [
      { id: 1, issue_id: 1, country_code: 'ZZ', country_name: 'Unknown', rioter_count: 1 },
    ];
    render(<CountryList countries={unknown} />);
    expect(screen.getByText('🏳️')).toBeDefined();
  });
});

describe('HealthMeter', () => {
  const healthy = {
    id: 1,
    issue_id: 1,
    needs_met: 85,
    membership: 90,
    influence: 80,
    connection: 75,
  };

  const struggling = {
    id: 1,
    issue_id: 1,
    needs_met: 40,
    membership: 35,
    influence: 50,
    connection: 45,
  };

  it('renders all four metric labels', () => {
    render(<HealthMeter health={healthy} />);
    expect(screen.getByText('Needs Met')).toBeDefined();
    expect(screen.getByText('Membership')).toBeDefined();
    expect(screen.getByText('Influence')).toBeDefined();
    expect(screen.getByText('Connection')).toBeDefined();
  });

  it('renders scores', () => {
    render(<HealthMeter health={healthy} />);
    expect(screen.getByText('85/100')).toBeDefined();
    expect(screen.getByText('90/100')).toBeDefined();
    expect(screen.getByText('80/100')).toBeDefined();
    expect(screen.getByText('75/100')).toBeDefined();
  });

  it('shows Healthy status for high scores', () => {
    render(<HealthMeter health={healthy} />);
    expect(screen.getByText('Healthy')).toBeDefined();
  });

  it('shows Needs Attention status for low scores', () => {
    render(<HealthMeter health={struggling} />);
    expect(screen.getByText('Needs Attention')).toBeDefined();
  });

  it('shows Growing status for medium scores', () => {
    const medium = {
      id: 1,
      issue_id: 1,
      needs_met: 65,
      membership: 70,
      influence: 60,
      connection: 65,
    };
    render(<HealthMeter health={medium} />);
    expect(screen.getByText('Growing')).toBeDefined();
  });
});

describe('PivotTable', () => {
  const issueRows = [
    {
      organisation_id: 1,
      organisation_name: 'Network Rail',
      logo_emoji: '🚂',
      rioter_count: 500,
      rank: 1,
    },
    { organisation_id: 2, organisation_name: 'TfL', logo_emoji: '🚇', rioter_count: 300, rank: 2 },
  ];

  const orgRows = [
    { issue_id: 1, issue_name: 'Train Delays', rioter_count: 500, rank: 1 },
    { issue_id: 2, issue_name: 'Bus Routes', rioter_count: 200, rank: 2 },
  ];

  it('renders issue pivot rows', () => {
    render(<PivotTable mode="issue" rows={issueRows} />);
    expect(screen.getByText('Network Rail')).toBeDefined();
    expect(screen.getByText('TfL')).toBeDefined();
    expect(screen.getByText('#1')).toBeDefined();
    expect(screen.getByText('#2')).toBeDefined();
  });

  it('links to organisation pages in issue mode', () => {
    render(<PivotTable mode="issue" rows={issueRows} />);
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/organisations/1');
  });

  it('shows YOU badge for current org', () => {
    render(<PivotTable mode="issue" rows={issueRows} currentOrgId={1} />);
    expect(screen.getByText('YOU')).toBeDefined();
  });

  it('renders org pivot rows', () => {
    render(<PivotTable mode="org" rows={orgRows} />);
    expect(screen.getByText('Train Delays')).toBeDefined();
    expect(screen.getByText('Bus Routes')).toBeDefined();
  });

  it('links to issue pages in org mode', () => {
    render(<PivotTable mode="org" rows={orgRows} />);
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/issues/1');
  });

  it('shows YOU badge for current issue', () => {
    render(<PivotTable mode="org" rows={orgRows} currentIssueId={2} />);
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
