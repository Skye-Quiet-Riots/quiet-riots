// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionCard } from './action-card';
import { ActionInitiativeCard } from './action-initiative-card';
import { EvidenceCard } from './evidence-card';
import { ExpertCard } from './expert-card';
import { FeedPostCard } from './feed-post-card';
import { IssueCard } from './issue-card';
import { OrgCard } from './org-card';
import { ReelCard } from './reel-card';
import type { ActionInitiative, Evidence } from '@/types';

// Mock next/link (kept for safety — some components may still import it)
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
    comments_count: 3,
    shares: 2,
    photo_urls: '[]',
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

  it('renders avatar with initials when no avatar_url', () => {
    render(<FeedPostCard post={post} />);
    // Should show "A" for Alice (initials)
    const avatarElements = screen.getAllByText('A');
    expect(avatarElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders avatar image when user_avatar is set', () => {
    const withAvatar = { ...post, user_avatar: 'https://example.com/avatar.jpg' };
    const { container } = render(<FeedPostCard post={withAvatar} />);
    const img = container.querySelector('img[aria-hidden="true"]');
    expect(img).toBeDefined();
    expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('renders country flag when user_country_code is set', () => {
    const withCountry = { ...post, user_country_code: 'gb' };
    const { container } = render(<FeedPostCard post={withCountry} />);
    const flag = container.querySelector('img[alt="gb"]');
    expect(flag).toBeDefined();
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

  it('shows comment count button with aria attributes', () => {
    render(<FeedPostCard post={post} />);
    // Comment button is the second button, has aria attributes
    const buttons = screen.getAllByRole('button');
    const commentButton = buttons[1];
    expect(commentButton).toBeDefined();
    expect(commentButton.getAttribute('aria-controls')).toBe('comments-feed-1');
    expect(commentButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows share button', () => {
    render(<FeedPostCard post={post} />);
    // next-intl mock returns the key directly: "share"
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3); // like, comments, share
  });

  it('increments like count on click', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<FeedPostCard post={post} />);
    const buttons = screen.getAllByRole('button');
    const likeButton = buttons[0]; // First button is like
    fireEvent.click(likeButton);
    await waitFor(() => {
      expect(screen.getByText(/6/)).toBeDefined();
    });
  });

  it('prevents double-liking', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<FeedPostCard post={post} />);
    const buttons = screen.getAllByRole('button');
    const likeButton = buttons[0];
    fireEvent.click(likeButton);
    fireEvent.click(likeButton);
    await waitFor(() => {
      // Like API should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('shows relative time', () => {
    render(<FeedPostCard post={post} />);
    expect(screen.getByText('1h ago')).toBeDefined();
  });

  it('renders photo grid for posts with photos', () => {
    const withPhotos = {
      ...post,
      photo_urls: JSON.stringify([
        'https://abc.public.blob.vercel-storage.com/photo1.jpg',
        'https://abc.public.blob.vercel-storage.com/photo2.jpg',
      ]),
    };
    const { container } = render(<FeedPostCard post={withPhotos} />);
    const imgs = container.querySelectorAll('img.aspect-square');
    expect(imgs.length).toBe(2);
  });

  it('renders no photo grid for empty photo_urls', () => {
    const { container } = render(<FeedPostCard post={post} />);
    const imgs = container.querySelectorAll('img.aspect-square');
    expect(imgs.length).toBe(0);
  });

  it('parses photo_urls defensively — handles null', () => {
    const nullPhotos = { ...post, photo_urls: undefined };
    const { container } = render(<FeedPostCard post={nullPhotos} />);
    const imgs = container.querySelectorAll('img.aspect-square');
    expect(imgs.length).toBe(0);
  });

  it('parses photo_urls defensively — handles malformed JSON', () => {
    const badJson = { ...post, photo_urls: 'not-json' };
    const { container } = render(<FeedPostCard post={badJson} />);
    const imgs = container.querySelectorAll('img.aspect-square');
    expect(imgs.length).toBe(0);
  });

  it('filters out non-HTTPS photo URLs', () => {
    const withBadUrls = {
      ...post,
      photo_urls: JSON.stringify(['http://insecure.com/photo.jpg', 'not-a-url']),
    };
    const { container } = render(<FeedPostCard post={withBadUrls} />);
    const imgs = container.querySelectorAll('img.aspect-square');
    expect(imgs.length).toBe(0);
  });

  it('action buttons have min 44px touch targets', () => {
    const { container } = render(<FeedPostCard post={post} />);
    const buttons = container.querySelectorAll('button[class*="min-h-"]');
    expect(buttons.length).toBe(3); // like, comments, share
  });

  it('comment toggle starts collapsed', () => {
    const { container } = render(<FeedPostCard post={post} />);
    // Comments section (role="region") should not be visible initially
    const region = container.querySelector('[role="region"]');
    expect(region).toBeNull();
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

  it('renders issue name and description', async () => {
    const el = await IssueCard({ issue });
    render(el);
    expect(screen.getByText('Train Delays')).toBeDefined();
    expect(screen.getByText('Chronic delays on commuter lines')).toBeDefined();
  });

  it('links to issue detail page', async () => {
    const el = await IssueCard({ issue });
    render(el);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/issues/issue-1');
  });

  it('renders rioter count with locale formatting', async () => {
    const el = await IssueCard({ issue });
    render(el);
    expect(screen.getByText(/1,234 rioters/)).toBeDefined();
  });

  it('renders country count with translation key', async () => {
    const oneCountry = { ...issue, country_count: 1 };
    const el = await IssueCard({ issue: oneCountry });
    render(el);
    // ICU plural format is not parsed by the simple mock — check the count and raw ICU text
    expect(screen.getByText(/1.*plural.*country/)).toBeDefined();
  });

  it('renders plural country count', async () => {
    const el = await IssueCard({ issue });
    render(el);
    // ICU plural format is not parsed by the simple mock — check the count and raw ICU text
    expect(screen.getByText(/5.*plural.*country/)).toBeDefined();
  });

  it('renders category badge and trending indicator', async () => {
    const el = await IssueCard({ issue });
    render(el);
    expect(screen.getByTestId('category-badge')).toBeDefined();
    expect(screen.getByTestId('trending')).toBeDefined();
  });
});

describe('ReelCard', () => {
  const reel = {
    id: 'reel-1',
    issue_id: 'issue-rail',
    youtube_url: 'https://www.youtube.com/watch?v=test123',
    youtube_video_id: 'test123',
    title: 'When the train is cancelled again',
    thumbnail_url: 'https://img.youtube.com/vi/test123/hqdefault.jpg',
    duration_seconds: null,
    caption: 'Every Monday morning',
    submitted_by: null,
    source: 'curated' as const,
    status: 'approved' as const,
    upvotes: 42,
    views: 100,
    created_at: '2026-01-01',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title and caption', () => {
    render(<ReelCard reel={reel} />);
    expect(screen.getByText('When the train is cancelled again')).toBeDefined();
    expect(screen.getByText(/Every Monday morning/)).toBeDefined();
  });

  it('renders upvote count', () => {
    render(<ReelCard reel={reel} />);
    expect(screen.getByText(/42/)).toBeDefined();
  });

  it('renders source label', () => {
    render(<ReelCard reel={reel} />);
    expect(screen.getByText('Curated')).toBeDefined();
  });

  it('increments upvote on click', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<ReelCard reel={reel} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/43/)).toBeDefined();
    });
  });

  it('prevents double voting', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<ReelCard reel={reel} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('hides caption when empty', () => {
    const noCap = { ...reel, caption: '' };
    render(<ReelCard reel={noCap} />);
    expect(screen.queryByText(/\u201c/)).toBeNull(); // no opening quote
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

  it('renders org name and logo', async () => {
    const el = await OrgCard({ org });
    render(el);
    expect(screen.getByText('Network Rail')).toBeDefined();
    expect(screen.getByText('🚂')).toBeDefined();
  });

  it('links to org detail page', async () => {
    const el = await OrgCard({ org });
    render(el);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/organisations/org-1');
  });

  it('shows issue count when provided', async () => {
    const el = await OrgCard({ org, issueCount: 3 });
    render(el);
    expect(screen.getByText('3 issues')).toBeDefined();
  });

  it('shows rioter count when provided', async () => {
    const el = await OrgCard({ org, totalRioters: 500 });
    render(el);
    expect(screen.getByText(/500 rioters/)).toBeDefined();
  });

  it('hides metadata when not provided', async () => {
    const el = await OrgCard({ org });
    render(el);
    expect(screen.queryByText(/issues/)).toBeNull();
    expect(screen.queryByText(/rioters/)).toBeNull();
  });
});

const makeActionInitiative = (overrides: Partial<ActionInitiative> = {}): ActionInitiative => ({
  id: 'ai-1',
  issue_id: 'issue-1',
  org_id: null,
  title: 'Avanti Legal Review',
  description: '',
  target_pence: 100000,
  committed_pence: 31000,
  supporter_count: 155,
  recipient: null,
  recipient_url: null,
  status: 'active',
  service_fee_pct: 15,
  goal_reached_at: null,
  delivered_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('ActionInitiativeCard', () => {
  it('renders action initiative title as a link', async () => {
    const el = await ActionInitiativeCard({ actionInitiative: makeActionInitiative() });
    render(el);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/action-initiatives/ai-1');
    expect(screen.getByText('Avanti Legal Review')).toBeDefined();
  });

  it('shows progress and participant count', async () => {
    const el = await ActionInitiativeCard({ actionInitiative: makeActionInitiative() });
    render(el);
    expect(screen.getByText(/£310.*£1,000/)).toBeDefined();
    // ICU plural format is not parsed by the simple mock — check the count is present
    expect(screen.getByText(/155/)).toBeDefined();
  });

  it('shows goal_reached badge', async () => {
    const el = await ActionInitiativeCard({
      actionInitiative: makeActionInitiative({ status: 'goal_reached' }),
    });
    render(el);
    expect(screen.getByText('Goal Reached')).toBeDefined();
  });

  it('shows issue name when provided', async () => {
    const el = await ActionInitiativeCard({
      actionInitiative: makeActionInitiative(),
      issueName: 'Train Cancellations',
      issueCategory: 'Transport',
    });
    render(el);
    expect(screen.getByText('Train Cancellations')).toBeDefined();
  });
});

const makeEvidence = (overrides: Partial<Evidence> = {}): Evidence => ({
  id: 'ev-1',
  issue_id: 'issue-1',
  org_id: null,
  user_id: 'user-1',
  user_name: 'Sarah',
  org_name: undefined,
  issue_name: 'Train Delays',
  content: 'Platform 4 was empty again',
  media_type: 'text',
  photo_urls: '[]',
  video_url: null,
  external_urls: '[]',
  live: 0,
  likes: 3,
  comments_count: 1,
  shares: 0,
  created_at: new Date(Date.now() - 7200000).toISOString(),
  ...overrides,
});

describe('EvidenceCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders content and user name', () => {
    render(<EvidenceCard evidence={makeEvidence()} issueId="issue-1" />);
    expect(screen.getByText('Platform 4 was empty again')).toBeDefined();
    expect(screen.getByText('Sarah')).toBeDefined();
  });

  it('renders inline video player for Vercel Blob URL', () => {
    const evidence = makeEvidence({
      media_type: 'video',
      video_url: 'https://abc.public.blob.vercel-storage.com/evidence/clip.mp4',
    });
    render(<EvidenceCard evidence={evidence} issueId="issue-1" />);
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.controls).toBe(true);
    expect(video?.playsInline).toBe(true);
    expect(video?.crossOrigin).toBe('anonymous');
    // Source element carries the URL and type hint
    const source = video?.querySelector('source');
    expect(source?.getAttribute('src')).toBe(
      'https://abc.public.blob.vercel-storage.com/evidence/clip.mp4#t=0.001',
    );
    expect(source?.getAttribute('type')).toBe('video/mp4');
    // Should NOT show "Watch video" link
    expect(screen.queryByText('Watch video')).toBeNull();
  });

  it('renders inline video player for direct .mp4 URL', () => {
    const evidence = makeEvidence({
      media_type: 'video',
      video_url: 'https://cdn.example.com/videos/clip.mp4',
    });
    render(<EvidenceCard evidence={evidence} issueId="issue-1" />);
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    const source = video?.querySelector('source');
    expect(source?.getAttribute('src')).toBe('https://cdn.example.com/videos/clip.mp4#t=0.001');
    expect(source?.getAttribute('type')).toBe('video/mp4');
  });

  it('renders "Watch video" link for YouTube URL', () => {
    const evidence = makeEvidence({
      media_type: 'video',
      video_url: 'https://www.youtube.com/watch?v=abc123',
    });
    render(<EvidenceCard evidence={evidence} issueId="issue-1" />);
    expect(screen.getByText('Watch video')).toBeDefined();
    const link = screen.getByText('Watch video').closest('a');
    expect(link?.getAttribute('href')).toBe('https://www.youtube.com/watch?v=abc123');
    // Should NOT render a <video> element
    expect(document.querySelector('video')).toBeNull();
  });

  it('renders "Watch video" link for non-video external URL', () => {
    const evidence = makeEvidence({
      media_type: 'video',
      video_url: 'https://vimeo.com/123456',
    });
    render(<EvidenceCard evidence={evidence} issueId="issue-1" />);
    expect(screen.getByText('Watch video')).toBeDefined();
    expect(document.querySelector('video')).toBeNull();
  });

  it('renders photos in a grid', () => {
    const evidence = makeEvidence({
      media_type: 'photo',
      photo_urls: JSON.stringify(['https://example.com/a.jpg', 'https://example.com/b.jpg']),
    });
    render(<EvidenceCard evidence={evidence} issueId="issue-1" />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute('alt')).toBe('Evidence photo 1');
  });

  it('shows LIVE badge when live', () => {
    const evidence = makeEvidence({ live: 1, media_type: 'live_stream' });
    render(<EvidenceCard evidence={evidence} issueId="issue-1" />);
    expect(screen.getByText('LIVE')).toBeDefined();
  });

  it('does not render video section when video_url is null', () => {
    render(<EvidenceCard evidence={makeEvidence()} issueId="issue-1" />);
    expect(document.querySelector('video')).toBeNull();
    expect(screen.queryByText('Watch video')).toBeNull();
  });

  it('falls back to "Watch video" link for malformed URL', () => {
    const evidence = makeEvidence({
      media_type: 'video',
      video_url: 'not-a-valid-url',
    });
    render(<EvidenceCard evidence={evidence} issueId="issue-1" />);
    expect(screen.getByText('Watch video')).toBeDefined();
    expect(document.querySelector('video')).toBeNull();
  });

  it('renders inline video player for .mov URL with quicktime type', () => {
    const evidence = makeEvidence({
      media_type: 'video',
      video_url: 'https://cdn.example.com/clip.mov',
    });
    render(<EvidenceCard evidence={evidence} issueId="issue-1" />);
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.querySelector('source')?.getAttribute('type')).toBe('video/quicktime');
  });

  it('renders inline video player for .webm URL with webm type', () => {
    const evidence = makeEvidence({
      media_type: 'video',
      video_url: 'https://cdn.example.com/clip.webm',
    });
    render(<EvidenceCard evidence={evidence} issueId="issue-1" />);
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.querySelector('source')?.getAttribute('type')).toBe('video/webm');
  });
});
