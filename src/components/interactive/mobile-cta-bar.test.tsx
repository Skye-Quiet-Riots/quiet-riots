// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileCTABar } from './mobile-cta-bar';

// Mock JoinButton and FollowButton to isolate MobileCTABar tests
vi.mock('./join-button', () => ({
  JoinButton: ({ issueId, initialJoined }: { issueId: string; initialJoined: boolean }) => (
    <button data-testid="join-button" data-issue-id={issueId} data-joined={initialJoined}>
      {initialJoined ? 'Joined' : 'Join'}
    </button>
  ),
}));

vi.mock('./follow-button', () => ({
  FollowButton: ({ issueId, initialFollowed }: { issueId: string; initialFollowed: boolean }) => (
    <button data-testid="follow-button" data-issue-id={issueId} data-followed={initialFollowed}>
      {initialFollowed ? 'Following' : 'Follow'}
    </button>
  ),
}));

describe('MobileCTABar', () => {
  it('renders both join and follow buttons', () => {
    render(
      <MobileCTABar issueId="issue-1" initialJoined={false} initialFollowed={false} />,
    );
    expect(screen.getByTestId('join-button')).toBeDefined();
    expect(screen.getByTestId('follow-button')).toBeDefined();
  });

  it('passes props correctly to child buttons', () => {
    render(
      <MobileCTABar issueId="issue-rail" initialJoined={true} initialFollowed={true} />,
    );
    const joinBtn = screen.getByTestId('join-button');
    expect(joinBtn.getAttribute('data-issue-id')).toBe('issue-rail');
    expect(joinBtn.getAttribute('data-joined')).toBe('true');

    const followBtn = screen.getByTestId('follow-button');
    expect(followBtn.getAttribute('data-issue-id')).toBe('issue-rail');
    expect(followBtn.getAttribute('data-followed')).toBe('true');
  });

  it('has hidden sm:flex lg:hidden classes for correct breakpoint visibility', () => {
    const { container } = render(
      <MobileCTABar issueId="issue-1" initialJoined={false} initialFollowed={false} />,
    );
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toContain('hidden');
    expect(bar.className).toContain('sm:flex');
    expect(bar.className).toContain('lg:hidden');
  });

  it('has dark mode classes', () => {
    const { container } = render(
      <MobileCTABar issueId="issue-1" initialJoined={false} initialFollowed={false} />,
    );
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toContain('dark:bg-zinc-900/95');
    expect(bar.className).toContain('dark:border-zinc-800');
  });

  it('has aria-label attribute', () => {
    render(
      <MobileCTABar issueId="issue-1" initialJoined={false} initialFollowed={false} />,
    );
    const bar = screen.getByRole('group');
    expect(bar.getAttribute('aria-label')).toBe('Join or follow this issue');
  });

  it('has fixed bottom positioning and z-40', () => {
    const { container } = render(
      <MobileCTABar issueId="issue-1" initialJoined={false} initialFollowed={false} />,
    );
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toContain('fixed');
    expect(bar.className).toContain('inset-x-0');
    expect(bar.className).toContain('bottom-0');
    expect(bar.className).toContain('z-40');
  });

  it('does not coexist with MobileBottomNav at the same breakpoint', () => {
    // MobileCTABar: hidden sm:flex lg:hidden → visible at sm-lg only
    // MobileBottomNav: sm:hidden → visible at <sm only
    // They never render simultaneously because:
    // - <sm: MobileCTABar hidden, MobileBottomNav visible
    // - sm-lg: MobileCTABar visible, MobileBottomNav hidden
    // - lg+: both hidden
    const { container } = render(
      <MobileCTABar issueId="issue-1" initialJoined={false} initialFollowed={false} />,
    );
    const bar = container.firstElementChild as HTMLElement;
    // MobileCTABar must NOT use sm:hidden (that's MobileBottomNav's pattern)
    expect(bar.className).not.toContain('sm:hidden');
    // MobileCTABar must use hidden + sm:flex (invisible below sm)
    expect(bar.className).toContain('hidden');
    expect(bar.className).toContain('sm:flex');
  });
});
