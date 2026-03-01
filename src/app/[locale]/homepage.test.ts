import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE_PATH = join(__dirname, 'page.tsx');
const pageSource = readFileSync(PAGE_PATH, 'utf8');

describe('Homepage', () => {
  it('exports force-dynamic to prevent SSG/CSP issues', () => {
    expect(pageSource).toContain("export const dynamic = 'force-dynamic'");
  });

  describe('Hero section — light gradient style', () => {
    it('does NOT use old dark gradient classes', () => {
      expect(pageSource).not.toContain('from-blue-600');
      expect(pageSource).not.toContain('via-blue-700');
      expect(pageSource).not.toContain('to-indigo-800');
    });

    it('uses light gradient background', () => {
      expect(pageSource).toContain('from-blue-50');
      expect(pageSource).toContain('to-white');
    });

    it('has dark mode gradient variants', () => {
      expect(pageSource).toContain('dark:from-zinc-900');
      expect(pageSource).toContain('dark:to-zinc-950');
    });

    it('uses dark text color with dark mode variant', () => {
      expect(pageSource).toContain('text-zinc-900');
      expect(pageSource).toContain('dark:text-white');
    });

    it('does NOT have the old radial overlay div', () => {
      expect(pageSource).not.toContain('radial-gradient');
    });

    it('has reduced padding compared to old hero', () => {
      expect(pageSource).toContain('py-16');
      expect(pageSource).toContain('sm:py-24');
      // Old values should not be present
      expect(pageSource).not.toContain('py-24 sm:py-32');
    });
  });

  describe('Hero CTA buttons', () => {
    it('primary CTA uses blue-700 (consistent with JoinButton)', () => {
      expect(pageSource).toContain('bg-blue-700');
      expect(pageSource).toContain('hover:bg-blue-800');
    });

    it('secondary CTA uses border outline style', () => {
      expect(pageSource).toContain('border-zinc-300');
      expect(pageSource).toContain('text-zinc-700');
    });

    it('secondary CTA has dark mode variants', () => {
      expect(pageSource).toContain('dark:border-zinc-600');
      expect(pageSource).toContain('dark:text-zinc-300');
    });
  });

  describe('Hero i18n', () => {
    it('uses i18n keys for tagline, headline, and description', () => {
      expect(pageSource).toContain("t('tagline')");
      expect(pageSource).toContain("t('headline')");
      expect(pageSource).toContain("t('description')");
    });

    it('uses i18n keys for CTA buttons', () => {
      expect(pageSource).toContain("t('browseIssues')");
      expect(pageSource).toContain("t('howItWorks')");
    });
  });

  describe('Baseline structure', () => {
    it('renders heading hierarchy with h1', () => {
      expect(pageSource).toContain('<h1');
    });

    it('has both CTA links (internal Link and anchor)', () => {
      // Browse Issues uses Link component
      expect(pageSource).toContain('href="/issues"');
      // How It Works uses anchor to section
      expect(pageSource).toContain('href="#how"');
    });

    it('renders trending issues section', () => {
      expect(pageSource).toContain("t('trendingIssues')");
    });

    it('renders how-it-works section with id for anchor', () => {
      expect(pageSource).toContain('id="how"');
    });

    it('renders mission section', () => {
      expect(pageSource).toContain("t('missionQuote')");
    });
  });

  describe('Tagline and description text colors', () => {
    it('tagline uses blue-600 with dark mode variant', () => {
      expect(pageSource).toContain('text-blue-600');
      expect(pageSource).toContain('dark:text-blue-400');
    });

    it('description uses zinc-600 with dark mode variant', () => {
      expect(pageSource).toContain('text-zinc-600');
      expect(pageSource).toContain('dark:text-zinc-400');
    });
  });
});
