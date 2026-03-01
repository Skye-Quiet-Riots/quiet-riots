import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE_PATH = join(__dirname, 'page.tsx');
const pageSource = readFileSync(PAGE_PATH, 'utf8');

describe('Issue detail page', () => {
  it('exports force-dynamic to prevent SSG/CSP issues', () => {
    expect(pageSource).toContain("export const dynamic = 'force-dynamic'");
  });

  it('has sm:pb-24 on main wrapper for tablet CTA bar spacing', () => {
    expect(pageSource).toContain('sm:pb-24');
    expect(pageSource).toContain('lg:pb-0');
  });

  it('has inline CTA with sm:hidden for small screens', () => {
    // The inline CTA should only show on <sm screens
    // Class order: "mb-4 flex gap-3 sm:hidden"
    expect(pageSource).toContain('flex gap-3 sm:hidden');
  });

  it('hides sidebar join/follow on non-desktop', () => {
    // Sidebar buttons should only show on lg+ screens
    expect(pageSource).toContain('hidden space-y-2 lg:block');
  });

  it('renders MobileCTABar component', () => {
    expect(pageSource).toContain('MobileCTABar');
    expect(pageSource).toContain("from '@/components/interactive/mobile-cta-bar'");
  });
});
