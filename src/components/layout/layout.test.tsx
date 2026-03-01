// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Footer } from './footer';
import { NavBar } from './nav-bar';
import { PageHeader } from './page-header';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/image
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: Record<string, unknown>) => <img alt="" {...props} />,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/issues',
}));

describe('Footer', () => {
  it('renders mission statement', async () => {
    const el = await Footer();
    render(el);
    expect(screen.getByText(/change more for the better/i)).toBeDefined();
  });

  it('renders brand name and powered text', async () => {
    const el = await Footer();
    render(el);
    expect(screen.getAllByText(/Quiet Riots/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders logo image', async () => {
    const el = await Footer();
    render(el);
    expect(screen.getByAltText('Quiet Riots logo')).toBeDefined();
  });
});

describe('NavBar', () => {
  it('renders logo text', () => {
    render(<NavBar />);
    expect(screen.getByText('Quiet Riots')).toBeDefined();
  });

  it('renders navigation links', () => {
    render(<NavBar />);
    expect(screen.getAllByText('Issues').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Organisations').length).toBeGreaterThan(0);
    // Profile is now behind the avatar dropdown — check avatar button exists instead
    expect(screen.getByLabelText('Profile')).toBeDefined();
  });

  it('links to home page', () => {
    render(<NavBar />);
    const homeLink = screen.getByText('Quiet Riots').closest('a');
    expect(homeLink?.getAttribute('href')).toBe('/');
  });

  it('toggles mobile menu', () => {
    render(<NavBar />);
    const hamburger = screen.getByLabelText('Toggle menu');
    // Mobile menu should be hidden initially
    const mobileLinks = screen.getAllByText('Issues');
    expect(mobileLinks.length).toBe(1); // Only desktop link
    // Click hamburger
    fireEvent.click(hamburger);
    // Now mobile links should be visible too
    const allLinks = screen.getAllByText('Issues');
    expect(allLinks.length).toBe(2); // Desktop + mobile
  });

  it('closes mobile menu on link click', () => {
    render(<NavBar />);
    const hamburger = screen.getByLabelText('Toggle menu');
    fireEvent.click(hamburger);
    const mobileLinks = screen.getAllByText('Issues');
    fireEvent.click(mobileLinks[1]); // Click mobile link
    // Menu should close — back to 1 link
    const linksAfter = screen.getAllByText('Issues');
    expect(linksAfter.length).toBe(1);
  });
});

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="All Issues" />);
    expect(screen.getByText('All Issues')).toBeDefined();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Issues" subtitle="Browse all issues" />);
    expect(screen.getByText('Browse all issues')).toBeDefined();
  });

  it('hides subtitle when not provided', () => {
    render(<PageHeader title="Issues" />);
    expect(screen.queryByText('Browse all issues')).toBeNull();
  });

  it('renders breadcrumbs with links', () => {
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Issues', href: '/issues' },
      { label: 'Current Issue' },
    ];
    render(<PageHeader title="Train Delays" breadcrumbs={breadcrumbs} />);
    expect(screen.getByText('Home')).toBeDefined();
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink?.getAttribute('href')).toBe('/');
    expect(screen.getByText('Current Issue')).toBeDefined();
    const issuesLink = screen.getByText('Issues').closest('a');
    expect(issuesLink?.getAttribute('href')).toBe('/issues');
  });

  it('renders breadcrumb separators', () => {
    const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Issues' }];
    render(<PageHeader title="Issues" breadcrumbs={breadcrumbs} />);
    expect(screen.getByText('/')).toBeDefined();
  });

  it('skips breadcrumbs when not provided', () => {
    const { container } = render(<PageHeader title="Issues" />);
    expect(container.querySelector('nav')).toBeNull();
  });
});
