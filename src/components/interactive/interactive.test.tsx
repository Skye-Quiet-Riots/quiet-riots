// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JoinButton } from './join-button';
import { FeedComposer } from './feed-composer';
import { FeedSection } from './feed-section';
import { PivotToggle } from './pivot-toggle';
import { TimeSkillFilter } from './time-skill-filter';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/issues',
}));

// Mock child components
vi.mock('@/components/data/pivot-table', () => ({
  PivotTable: ({ mode }: { mode: string }) => <div data-testid="pivot-table">{mode}</div>,
}));

describe('JoinButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows join text when not joined', () => {
    render(<JoinButton issueId={1} initialJoined={false} />);
    expect(screen.getByText(/Join this Quiet Riot/)).toBeDefined();
  });

  it('shows joined text when already joined', () => {
    render(<JoinButton issueId={1} initialJoined={true} />);
    expect(screen.getByText(/Joined this Quiet Riot/)).toBeDefined();
  });

  it('toggles to joined on click', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<JoinButton issueId={1} initialJoined={false} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/Joined this Quiet Riot/)).toBeDefined();
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/issues/1/join', { method: 'POST' });
  });

  it('toggles to unjoined on click', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<JoinButton issueId={1} initialJoined={true} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/Join this Quiet Riot/)).toBeDefined();
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/issues/1/join', { method: 'DELETE' });
  });

  it('shows loading state while toggling', async () => {
    let resolvePromise: () => void;
    const pending = new Promise<{ ok: boolean }>((resolve) => {
      resolvePromise = () => resolve({ ok: true });
    });
    global.fetch = vi.fn().mockReturnValue(pending);
    render(<JoinButton issueId={1} initialJoined={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('...')).toBeDefined();
    resolvePromise!();
    await waitFor(() => {
      expect(screen.queryByText('...')).toBeNull();
    });
  });

  it('stays unchanged if fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    render(<JoinButton issueId={1} initialJoined={false} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/Join this Quiet Riot/)).toBeDefined();
    });
  });
});

describe('FeedComposer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders text input and post button', () => {
    render(<FeedComposer issueId={1} />);
    expect(screen.getByPlaceholderText(/Share/i)).toBeDefined();
    expect(screen.getByText('Post')).toBeDefined();
  });

  it('calls onPost callback after successful submission', async () => {
    const mockPost = { id: 99, issue_id: 1, user_id: 1, content: 'Hello', likes: 0, created_at: new Date().toISOString() };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPost),
    });
    const onPost = vi.fn();
    render(<FeedComposer issueId={1} onPost={onPost} />);
    const input = screen.getByPlaceholderText(/Share/i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Post'));
    await waitFor(() => {
      expect(onPost).toHaveBeenCalledWith(mockPost);
    });
  });

  it('clears input after posting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    });
    render(<FeedComposer issueId={1} />);
    const input = screen.getByPlaceholderText(/Share/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test post' } });
    fireEvent.click(screen.getByText('Post'));
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
});

describe('FeedSection', () => {
  const posts = [
    { id: 1, issue_id: 1, user_id: 1, user_name: 'Alice', content: 'First post', likes: 3, created_at: new Date().toISOString() },
    { id: 2, issue_id: 1, user_id: 2, user_name: 'Bob', content: 'Second post', likes: 1, created_at: new Date().toISOString() },
  ];

  it('renders all feed posts', () => {
    render(<FeedSection issueId={1} initialPosts={posts} />);
    expect(screen.getByText('First post')).toBeDefined();
    expect(screen.getByText('Second post')).toBeDefined();
  });

  it('shows empty state when no posts', () => {
    render(<FeedSection issueId={1} initialPosts={[]} />);
    expect(screen.getByText(/No posts yet/i)).toBeDefined();
  });
});

describe('PivotToggle', () => {
  const issueRows = [
    { organisation_id: 1, organisation_name: 'Org A', logo_emoji: '🏢', rioter_count: 100, rank: 1 },
  ];
  const orgRows = [
    { issue_id: 1, issue_name: 'Issue A', rioter_count: 100, rank: 1 },
  ];

  it('renders with issue pivot by default', () => {
    render(<PivotToggle issuePivotRows={issueRows} orgPivotRows={orgRows} />);
    expect(screen.getByTestId('pivot-table')).toBeDefined();
  });

  it('has two toggle buttons', () => {
    render(<PivotToggle issuePivotRows={issueRows} orgPivotRows={orgRows} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('TimeSkillFilter', () => {
  it('renders time and type filter buttons', () => {
    const onChange = vi.fn();
    render(<TimeSkillFilter onFilterChange={onChange} />);
    expect(screen.getByText('1 min')).toBeDefined();
    expect(screen.getByText('10 min')).toBeDefined();
  });

  it('calls onFilterChange when time filter clicked', () => {
    const onChange = vi.fn();
    render(<TimeSkillFilter onFilterChange={onChange} />);
    fireEvent.click(screen.getByText('1 min'));
    expect(onChange).toHaveBeenCalled();
  });

  it('toggles filter off when clicked again', () => {
    const onChange = vi.fn();
    render(<TimeSkillFilter onFilterChange={onChange} />);
    fireEvent.click(screen.getByText('1 min'));
    fireEvent.click(screen.getByText('1 min'));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.time).toBeUndefined();
  });
});
