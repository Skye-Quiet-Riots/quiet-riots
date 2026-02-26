// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JoinButton } from './join-button';
import { FeedComposer } from './feed-composer';
import { FeedSection } from './feed-section';
import { PivotToggle } from './pivot-toggle';
import { TimeSkillFilter } from './time-skill-filter';
import { ReelsSection } from './reels-section';
import { TopUpForm } from './topup-form';
import { ContributeForm } from './contribute-form';
import { StatusFilter } from './status-filter';
import { EvidenceComposer } from './evidence-composer';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
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
    render(<JoinButton issueId={'issue-1'} initialJoined={false} />);
    expect(screen.getByText(/Join this Quiet Riot/)).toBeDefined();
  });

  it('shows joined text when already joined', () => {
    render(<JoinButton issueId={'issue-1'} initialJoined={true} />);
    expect(screen.getByText(/Joined this Quiet Riot/)).toBeDefined();
  });

  it('toggles to joined on click', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<JoinButton issueId={'issue-1'} initialJoined={false} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/Joined this Quiet Riot/)).toBeDefined();
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/issues/issue-1/join', { method: 'POST' });
  });

  it('toggles to unjoined on click', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<JoinButton issueId={'issue-1'} initialJoined={true} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/Join this Quiet Riot/)).toBeDefined();
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/issues/issue-1/join', { method: 'DELETE' });
  });

  it('shows loading state while toggling', async () => {
    let resolvePromise: () => void;
    const pending = new Promise<{ ok: boolean }>((resolve) => {
      resolvePromise = () => resolve({ ok: true });
    });
    global.fetch = vi.fn().mockReturnValue(pending);
    render(<JoinButton issueId={'issue-1'} initialJoined={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('...')).toBeDefined();
    resolvePromise!();
    await waitFor(() => {
      expect(screen.queryByText('...')).toBeNull();
    });
  });

  it('stays unchanged if fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    render(<JoinButton issueId={'issue-1'} initialJoined={false} />);
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
    render(<FeedComposer issueId={'issue-1'} />);
    expect(screen.getByPlaceholderText(/Share/i)).toBeDefined();
    expect(screen.getByText('Post')).toBeDefined();
  });

  it('calls onPost callback after successful submission', async () => {
    const mockPost = {
      id: 'feed-99',
      issue_id: 'issue-1',
      user_id: 'user-1',
      content: 'Hello',
      likes: 0,
      created_at: new Date().toISOString(),
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPost),
    });
    const onPost = vi.fn();
    render(<FeedComposer issueId={'issue-1'} onPost={onPost} />);
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
      json: () => Promise.resolve({ id: 'feed-1' }),
    });
    render(<FeedComposer issueId={'issue-1'} />);
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
    {
      id: 'feed-1',
      issue_id: 'issue-1',
      user_id: 'user-1',
      user_name: 'Alice',
      content: 'First post',
      likes: 3,
      created_at: new Date().toISOString(),
    },
    {
      id: 'feed-2',
      issue_id: 'issue-1',
      user_id: 'user-2',
      user_name: 'Bob',
      content: 'Second post',
      likes: 1,
      created_at: new Date().toISOString(),
    },
  ];

  it('renders all feed posts', () => {
    render(<FeedSection issueId={'issue-1'} initialPosts={posts} />);
    expect(screen.getByText('First post')).toBeDefined();
    expect(screen.getByText('Second post')).toBeDefined();
  });

  it('shows empty state when no posts', () => {
    render(<FeedSection issueId={'issue-1'} initialPosts={[]} />);
    expect(screen.getByText(/No posts yet/i)).toBeDefined();
  });
});

describe('PivotToggle', () => {
  const issueRows = [
    {
      organisation_id: 'org-1',
      organisation_name: 'Org A',
      logo_emoji: '🏢',
      rioter_count: 100,
      rank: 1,
    },
  ];
  const orgRows = [{ issue_id: 'issue-1', issue_name: 'Issue A', rioter_count: 100, rank: 1 }];

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

describe('ReelsSection', () => {
  const reels = [
    {
      id: 'reel-1',
      issue_id: 'issue-rail',
      youtube_url: 'https://www.youtube.com/watch?v=test1',
      youtube_video_id: 'test1',
      title: 'Reel One',
      thumbnail_url: 'https://img.youtube.com/vi/test1/hqdefault.jpg',
      duration_seconds: null,
      caption: 'Caption one',
      submitted_by: null,
      source: 'curated' as const,
      status: 'approved' as const,
      upvotes: 10,
      views: 50,
      created_at: '2026-01-01',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders reels from initialReels', () => {
    render(<ReelsSection issueId="issue-rail" initialReels={reels} />);
    expect(screen.getByText('Reel One')).toBeDefined();
  });

  it('shows empty state when no reels', () => {
    render(<ReelsSection issueId="issue-rail" initialReels={[]} />);
    expect(screen.getByText(/No reels yet/)).toBeDefined();
  });

  it('renders submit form with URL and caption inputs', () => {
    render(<ReelsSection issueId="issue-rail" initialReels={[]} />);
    expect(screen.getByPlaceholderText(/YouTube URL/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/caption/i)).toBeDefined();
    expect(screen.getByText('Submit')).toBeDefined();
  });

  it('shows success message after submission', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<ReelsSection issueId="issue-rail" initialReels={[]} />);
    const urlInput = screen.getByPlaceholderText(/YouTube URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=abc123' } });
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/submitted for review/)).toBeDefined();
    });
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

describe('TopUpForm', () => {
  it('renders preset amount buttons', () => {
    render(<TopUpForm />);
    expect(screen.getByText('£1')).toBeDefined();
    expect(screen.getByText('£5')).toBeDefined();
    expect(screen.getByText('£10')).toBeDefined();
    expect(screen.getByText('£20')).toBeDefined();
  });

  it('renders custom amount input and simulated disclaimer', () => {
    render(<TopUpForm />);
    expect(screen.getByPlaceholderText('Custom amount (£)')).toBeDefined();
    expect(screen.getByText(/Simulated top-up for testing/)).toBeDefined();
  });

  it('calls API and shows success on preset click', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { transaction: {}, wallet: {} } }),
    });
    global.fetch = mockFetch;

    render(<TopUpForm />);
    fireEvent.click(screen.getByText('£5'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/wallet/topup',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/£5 added to your wallet/)).toBeDefined();
    });
  });
});

describe('ContributeForm', () => {
  it('renders balance and preset amounts', () => {
    render(<ContributeForm campaignId="camp-1" campaignTitle="Test Campaign" userBalance={500} />);
    expect(screen.getByText(/£5/)).toBeDefined();
    expect(screen.getByText('50p')).toBeDefined();
    expect(screen.getByText('£2')).toBeDefined();
  });

  it('disables buttons when balance is too low', () => {
    render(<ContributeForm campaignId="camp-1" campaignTitle="Test Campaign" userBalance={0} />);
    const buttons = screen.getAllByRole('button');
    // Preset buttons should be disabled
    const presetButton = buttons.find((b) => b.textContent === '50p');
    expect(presetButton?.getAttribute('disabled')).toBe('');
  });

  it('shows low balance message when empty', () => {
    render(<ContributeForm campaignId="camp-1" campaignTitle="Test Campaign" userBalance={0} />);
    expect(screen.getByText(/wallet is empty/)).toBeDefined();
  });

  it('calls API and shows success on contribution', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            transaction: { type: 'contribute', amount_pence: 100 },
            campaign: {},
            wallet_balance_pence: 400,
          },
        }),
    });
    global.fetch = mockFetch;

    render(<ContributeForm campaignId="camp-1" campaignTitle="Test Campaign" userBalance={500} />);
    fireEvent.click(screen.getByText('£1'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/wallet/contribute',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Paid £1 towards Test Campaign/)).toBeDefined();
      expect(screen.getByText(/remaining balance: £4/)).toBeDefined();
    });
  });

  it('shows insufficient funds error for custom amount over balance', async () => {
    render(<ContributeForm campaignId="camp-1" campaignTitle="Test Campaign" userBalance={30} />);

    // Preset buttons are disabled, use custom amount form
    const input = screen.getByPlaceholderText('Custom amount (£)');
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Insufficient funds/)).toBeDefined();
    });
  });
});

describe('StatusFilter', () => {
  it('renders all status options', () => {
    render(<StatusFilter />);
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
    expect(screen.getByText('Goal Reached')).toBeDefined();
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('updates URL on click', () => {
    render(<StatusFilter />);
    fireEvent.click(screen.getByText('Active'));
    expect(mockPush).toHaveBeenCalledWith('?status=active', { scroll: false });
  });

  it('clears status when All is clicked', () => {
    render(<StatusFilter />);
    fireEvent.click(screen.getByText('All'));
    expect(mockPush).toHaveBeenCalledWith('?', { scroll: false });
  });
});

// Mock analytics for EvidenceComposer
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('EvidenceComposer', () => {
  const defaultProps = {
    issueId: 'issue-1',
    organisations: [{ id: 'org-1', name: 'Org A' }],
  };

  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreateObjectURL = vi.fn(() => 'blob:mock-preview-url');
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  function mockUploadSuccess(url = 'https://blob.vercel-storage.com/evidence/test.jpg') {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, data: { url, mediaType: 'photo', size: 1234 } }),
    });
  }

  function mockUploadError(error = 'File too large (5.0MB). Maximum is 4MB') {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ ok: false, error }),
    });
  }

  it('shows file inputs when media section is toggled open', () => {
    render(<EvidenceComposer {...defaultProps} />);
    fireEvent.click(screen.getByText('📎 Add photos, video, links'));
    expect(screen.getByTestId('photo-input')).toBeDefined();
    expect(screen.getByTestId('video-input')).toBeDefined();
    expect(screen.getByText('+ Add photos')).toBeDefined();
    expect(screen.getByText('+ Add video')).toBeDefined();
  });

  it('photo input has correct accept attribute', () => {
    render(<EvidenceComposer {...defaultProps} />);
    fireEvent.click(screen.getByText('📎 Add photos, video, links'));
    const photoInput = screen.getByTestId('photo-input') as HTMLInputElement;
    expect(photoInput.accept).toBe('image/jpeg,image/png,image/webp,image/gif');
    expect(photoInput.multiple).toBe(true);
  });

  it('video input has correct accept attribute', () => {
    render(<EvidenceComposer {...defaultProps} />);
    fireEvent.click(screen.getByText('📎 Add photos, video, links'));
    const videoInput = screen.getByTestId('video-input') as HTMLInputElement;
    expect(videoInput.accept).toBe('video/mp4,video/quicktime,video/webm');
    expect(videoInput.multiple).toBeFalsy();
  });

  it('uploads photo and shows preview', async () => {
    mockUploadSuccess();
    render(<EvidenceComposer {...defaultProps} />);
    fireEvent.click(screen.getByText('📎 Add photos, video, links'));

    const file = new File(['photo-data'], 'test.jpg', { type: 'image/jpeg' });
    const photoInput = screen.getByTestId('photo-input');
    fireEvent.change(photoInput, { target: { files: [file] } });

    await waitFor(() => {
      // Preview image should be rendered
      const images = screen.getAllByRole('img');
      const preview = images.find((img) => img.getAttribute('alt') === 'test.jpg');
      expect(preview).toBeDefined();
    });

    // Upload endpoint was called
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/evidence/upload',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows server error message on upload failure', async () => {
    mockUploadError('File too large (5.0MB). Maximum is 4MB');
    render(<EvidenceComposer {...defaultProps} />);
    fireEvent.click(screen.getByText('📎 Add photos, video, links'));

    const file = new File(['big-data'], 'huge.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('File too large (5.0MB). Maximum is 4MB')).toBeDefined();
    });
  });

  it('removes uploaded photo on remove button click', async () => {
    mockUploadSuccess();
    render(<EvidenceComposer {...defaultProps} />);
    fireEvent.click(screen.getByText('📎 Add photos, video, links'));

    const file = new File(['photo-data'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } });

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.getByLabelText('Remove test.jpg')).toBeDefined();
    });

    // Click remove
    fireEvent.click(screen.getByLabelText('Remove test.jpg'));

    // Preview should be gone and object URL revoked
    expect(screen.queryByLabelText('Remove test.jpg')).toBeNull();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('disables submit during upload and shows Uploading text', async () => {
    let resolveUpload: (value: Response) => void;
    const pendingUpload = new Promise<Response>((resolve) => {
      resolveUpload = resolve;
    });
    global.fetch = vi.fn().mockReturnValue(pendingUpload);

    render(<EvidenceComposer {...defaultProps} />);

    // Type content first so button would normally be enabled
    fireEvent.change(screen.getByPlaceholderText('Say what you think...'), {
      target: { value: 'My evidence' },
    });

    fireEvent.click(screen.getByText('📎 Add photos, video, links'));
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } });

    // Submit should be disabled with "Uploading..." text
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeDefined();
    });
    const submitBtn = screen.getByText('Uploading...');
    expect(submitBtn.closest('button')?.disabled).toBe(true);

    // Resolve upload
    resolveUpload!({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          data: { url: 'https://blob.vercel-storage.com/test.jpg', mediaType: 'photo', size: 100 },
        }),
    } as Response);

    await waitFor(() => {
      expect(screen.getByText('Submit Evidence')).toBeDefined();
    });
  });

  it('includes blob URLs in evidence submission', async () => {
    const blobUrl = 'https://blob.vercel-storage.com/evidence/uploaded.jpg';

    // First call = upload, second call = submit evidence
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ ok: true, data: { url: blobUrl, mediaType: 'photo', size: 1234 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: 'ev-1',
              content: 'test',
              photo_urls: `["${blobUrl}"]`,
              media_type: 'photo',
            },
          }),
      });
    global.fetch = mockFetch;

    render(<EvidenceComposer {...defaultProps} />);

    // Type content
    fireEvent.change(screen.getByPlaceholderText('Say what you think...'), {
      target: { value: 'Check this out' },
    });

    // Upload photo
    fireEvent.click(screen.getByText('📎 Add photos, video, links'));
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } });

    // Wait for upload to finish
    await waitFor(() => {
      expect(screen.getByLabelText('Remove photo.jpg')).toBeDefined();
    });

    // Submit
    fireEvent.click(screen.getByText('Submit Evidence'));

    await waitFor(() => {
      // Second fetch call should be the evidence submission
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const submitCall = mockFetch.mock.calls[1];
      expect(submitCall[0]).toBe('/api/issues/issue-1/evidence');
      const body = JSON.parse(submitCall[1].body);
      expect(body.photo_urls).toEqual([blobUrl]);
      expect(body.media_type).toBe('photo');
    });
  });

  it('uploads video and shows filename preview', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          data: {
            url: 'https://blob.vercel-storage.com/evidence/clip.mp4',
            mediaType: 'video',
            size: 2000,
          },
        }),
    });

    render(<EvidenceComposer {...defaultProps} />);
    fireEvent.click(screen.getByText('📎 Add photos, video, links'));

    const file = new File(['video-data'], 'my-clip.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('video-input'), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('my-clip.mp4')).toBeDefined();
      expect(screen.getByLabelText('Remove video')).toBeDefined();
    });

    // Add video button should be hidden
    expect(screen.queryByText('+ Add video')).toBeNull();
  });

  it('keeps external URL input as text input', () => {
    render(<EvidenceComposer {...defaultProps} />);
    fireEvent.click(screen.getByText('📎 Add photos, video, links'));
    const urlInput = screen.getByPlaceholderText(
      'https://news-article.com/...',
    ) as HTMLInputElement;
    expect(urlInput.type).toBe('url');
  });

  it('renders org selector when organisations provided', () => {
    render(<EvidenceComposer {...defaultProps} />);
    expect(screen.getByText('Org A')).toBeDefined();
    expect(screen.getByText('General (no specific organisation)')).toBeDefined();
  });
});
