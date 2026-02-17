// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionCard } from './action-card';
import { ExpertCard } from './expert-card';
import { FeedPostCard } from './feed-post-card';
import { IssueCard } from './issue-card';
import { OrgCard } from './org-card';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock child components used by cards
vi.mock('@/components/data/category-badge', () => ({
  CategoryBadge: ({ category }: { category: string }) => (
    <span data-testid="category-badge">{category}</span>
  ),
}));
vi.mock('@/components/data/trending-indicator', () => ({
  TrendingIndicator: ({ delta }: { delta: number }) => <span data-testid="trending">{delta}</span>,
}));

describe('ActionCard', () => {
  const action = {
    id: 'action-1',
    issue_id: 'issue-1',
    title: 'Sign the petition',
    description: 'Add your voice',
    type: 'action' as const,
    time_required: '1min' as const,
    skills_needed: 'none',
    external_url: 'https://example.com',
    provider_name: 'Change.org',
  };

  it('renders action title and description', () => {
    render(<ActionCard action={action} />);
    expect(screen.getByText('Sign the petition')).toBeDefined();
    expect(screen.getByText('Add your voice')).toBeDefined();
  });

  it('renders time label', () => {
    render(<ActionCard action={action} />);
    expect(screen.getByText('1 min')).toBeDefined();
  });

  it('renders provider link when present', () => {
    render(<ActionCard action={action} />);
    const link = screen.getByText(/Change\.org/);
    expect(link.closest('a')?.getAttribute('href')).toBe('https://example.com');
  });

  it('renders skills when present', () => {
    render(<ActionCard action={action} />);
    expect(screen.getByText(/Skills: none/)).toBeDefined();
  });

  it('hides provider link when not present', () => {
    const noProvider = { ...action, provider_name: null, external_url: null };
    render(<ActionCard action={noProvider} />);
    expect(screen.queryByText(/↗/)).toBeNull();
  });

  it('renders type emoji', () => {
    render(<ActionCard action={action} />);
    expect(screen.getByText('⚡')).toBeDefined();
  });
});

describe('ExpertCard', () => {
  const expert = {
    id: 'expert-1',
    issue_id: 'issue-1',
    name: 'Dr. Jane Smith',
    role: 'Researcher',
    speciality: 'Public policy',
    achievement: 'Published 50 papers',
    avatar_emoji: '👩‍🔬',
  };

  it('renders expert name and role', () => {
    render(<ExpertCard expert={expert} />);
    expect(screen.getByText('Dr. Jane Smith')).toBeDefined();
    expect(screen.getByText('Researcher')).toBeDefined();
  });

  it('renders speciality and achievement', () => {
    render(<ExpertCard expert={expert} />);
    expect(screen.getByText('Public policy')).toBeDefined();
    expect(screen.getByText('Published 50 papers')).toBeDefined();
  });

  it('renders avatar emoji', () => {
    render(<ExpertCard expert={expert} />);
    expect(screen.getByText('👩‍🔬')).toBeDefined();
  });

  it('hides speciality when empty', () => {
    const noSpec = { ...expert, speciality: '' };
    render(<ExpertCard expert={noSpec} />);
    expect(screen.queryByText('Public policy')).toBeNull();
  });
});

describe('FeedPostCard', () => {
  const post = {
    id: 'feed-1',
    issue_id: 'issue-1',
    user_id: 'user-1',
    user_name: 'Alice',
    content: 'Great discussion today!',
    likes: 5,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders post content and user name', () => {
    render(<FeedPostCard post={post} />);
    expect(screen.getByText('Great discussion today!')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('shows Anonymous when no user name', () => {
    const anon = { ...post, user_name: undefined };
    render(<FeedPostCard post={anon} />);
    expect(screen.getByText('Anonymous')).toBeDefined();
  });

  it('shows like count', () => {
    render(<FeedPostCard post={post} />);
    expect(screen.getByText(/5/)).toBeDefined();
  });

  it('increments like count on click', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<FeedPostCard post={post} />);
    const likeButton = screen.getByRole('button');
    fireEvent.click(likeButton);
    await waitFor(() => {
      expect(screen.getByText(/6/)).toBeDefined();
    });
  });

  it('prevents double-liking', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<FeedPostCard post={post} />);
    const likeButton = screen.getByRole('button');
    fireEvent.click(likeButton);
    fireEvent.click(likeButton);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('shows relative time', () => {
    render(<FeedPostCard post={post} />);
    expect(screen.getByText('1h ago')).toBeDefined();
  });
});

describe('IssueCard', () => {
  const issue = {
    id: 'issue-1',
    name: 'Train Delays',
    category: 'Transport' as const,
    description: 'Chronic delays on commuter lines',
    rioter_count: 1234,
    country_count: 5,
    trending_delta: 42,
    created_at: '2026-01-01',
  };

  it('renders issue name and description', () => {
    render(<IssueCard issue={issue} />);
    expect(screen.getByText('Train Delays')).toBeDefined();
    expect(screen.getByText('Chronic delays on commuter lines')).toBeDefined();
  });

  it('links to issue detail page', () => {
    render(<IssueCard issue={issue} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/issues/issue-1');
  });

  it('renders rioter count with locale formatting', () => {
    render(<IssueCard issue={issue} />);
    expect(screen.getByText(/1,234 rioters/)).toBeDefined();
  });

  it('renders singular country label', () => {
    const oneCountry = { ...issue, country_count: 1 };
    render(<IssueCard issue={oneCountry} />);
    expect(screen.getByText('1 country')).toBeDefined();
  });

  it('renders plural countries label', () => {
    render(<IssueCard issue={issue} />);
    expect(screen.getByText('5 countries')).toBeDefined();
  });

  it('renders category badge and trending indicator', () => {
    render(<IssueCard issue={issue} />);
    expect(screen.getByTestId('category-badge')).toBeDefined();
    expect(screen.getByTestId('trending')).toBeDefined();
  });
});

describe('OrgCard', () => {
  const org = {
    id: 'org-1',
    name: 'Network Rail',
    category: 'Transport' as const,
    logo_emoji: '🚂',
    description: 'UK rail infrastructure',
  };

  it('renders org name and logo', () => {
    render(<OrgCard org={org} />);
    expect(screen.getByText('Network Rail')).toBeDefined();
    expect(screen.getByText('🚂')).toBeDefined();
  });

  it('links to org detail page', () => {
    render(<OrgCard org={org} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/organisations/org-1');
  });

  it('shows issue count when provided', () => {
    render(<OrgCard org={org} issueCount={3} />);
    expect(screen.getByText('3 issues')).toBeDefined();
  });

  it('shows rioter count when provided', () => {
    render(<OrgCard org={org} totalRioters={500} />);
    expect(screen.getByText(/500 rioters/)).toBeDefined();
  });

  it('hides metadata when not provided', () => {
    render(<OrgCard org={org} />);
    expect(screen.queryByText(/issues/)).toBeNull();
    expect(screen.queryByText(/rioters/)).toBeNull();
  });
});
