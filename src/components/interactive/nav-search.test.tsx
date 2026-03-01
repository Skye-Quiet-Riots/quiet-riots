// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NavSearch } from './nav-search';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => {
    const messages: Record<string, Record<string, string>> = {
      NavSearch: {
        placeholder: 'Search issues and organisations...',
        noResults: 'No results found',
        issues: 'Issues',
        organisations: 'Organisations',
        searching: 'Searching...',
        partialResults: 'Some results may be missing',
        minChars: 'Type at least {count} characters',
        close: 'Close search',
      },
      Categories: {
        Transport: 'Transport',
        Telecoms: 'Telecoms',
      },
    };
    return (key: string) => messages[ns]?.[key] ?? key;
  },
  useLocale: () => 'en',
}));

// Mock i18n navigation
const mockPush = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('NavSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    global.fetch = vi.fn();
    // jsdom doesn't implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders search input with placeholder', () => {
    render(<NavSearch />);
    expect(screen.getByPlaceholderText('Search issues and organisations...')).toBeDefined();
  });

  it('has combobox ARIA role', () => {
    render(<NavSearch />);
    const input = screen.getByRole('combobox');
    expect(input).toBeDefined();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not search for queries shorter than 3 chars (Latin locale)', async () => {
    render(<NavSearch />);
    const input = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'ab' } });
    });
    // Wait for debounce
    await new Promise((r) => setTimeout(r, 300));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches results after debounce for valid query', async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            issues: [
              {
                id: '1',
                name: 'Rail Cancellations',
                category: 'Transport',
                description: '',
                rioter_count: 100,
                country_count: 1,
                trending_delta: 10,
                created_at: '',
                agent_helps: null,
                human_helps: null,
                agent_focus: null,
                human_focus: null,
                country_scope: 'global',
                primary_country: null,
                status: 'active',
                first_rioter_id: null,
                approved_at: null,
                hero_image_url: null,
                hero_thumb_url: null,
              },
            ],
            organisations: [],
          },
        }),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    render(<NavSearch />);
    const input = screen.getByRole('combobox');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Rail' } });
      // Wait for debounce + fetch
      await new Promise((r) => setTimeout(r, 300));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=Rail'),
        expect.any(Object),
      );
    });

    await waitFor(() => {
      // Text is split by HighlightMatch into <mark> and <span> elements
      expect(screen.getByText((_, el) => el?.textContent === 'Rail Cancellations')).toBeDefined();
    });
  });

  it('shows no results message', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: { issues: [], organisations: [] } }),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    render(<NavSearch />);
    const input = screen.getByRole('combobox');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'xyznotfound' } });
      await new Promise((r) => setTimeout(r, 300));
    });

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeDefined();
    });
  });

  it('navigates on Enter key with active item', async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            issues: [
              {
                id: 'issue-1',
                name: 'Test Issue',
                category: 'Transport',
                description: '',
                rioter_count: 100,
                country_count: 1,
                trending_delta: 10,
                created_at: '',
                agent_helps: null,
                human_helps: null,
                agent_focus: null,
                human_focus: null,
                country_scope: 'global',
                primary_country: null,
                status: 'active',
                first_rioter_id: null,
                approved_at: null,
                hero_image_url: null,
                hero_thumb_url: null,
              },
            ],
            organisations: [],
          },
        }),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    render(<NavSearch />);
    const input = screen.getByRole('combobox');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Test' } });
      await new Promise((r) => setTimeout(r, 300));
    });

    await waitFor(() => {
      expect(screen.getByText((_, el) => el?.textContent === 'Test Issue')).toBeDefined();
    });

    // Arrow down to select (flush state), then Enter to navigate
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(mockPush).toHaveBeenCalledWith('/issues/issue-1');
  });

  it('renders in mobile overlay mode', () => {
    const onClose = vi.fn();
    render(<NavSearch mobile onClose={onClose} />);

    // Should have close button
    const closeBtn = screen.getByLabelText('Close search');
    expect(closeBtn).toBeDefined();

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not use dangerouslySetInnerHTML', () => {
    // Security check per plan: no dangerouslySetInnerHTML
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    const source = fs.readFileSync('src/components/interactive/nav-search.tsx', 'utf-8');
    expect(source.includes('dangerouslySetInnerHTML')).toBe(false);
  });
});
