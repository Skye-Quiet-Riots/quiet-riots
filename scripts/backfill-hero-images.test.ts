import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';

// Mock image generation
const mockGenerateHeroImage = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ success: true, heroUrl: 'https://blob/hero.webp', thumbUrl: 'https://blob/thumb.webp' }),
);

vi.mock('../src/lib/image-generation', () => ({
  generateHeroImage: mockGenerateHeroImage,
}));

// Mock logger
vi.mock('../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { parseArgs, getEntitiesWithoutHero } from './backfill-hero-images';

describe('backfill-hero-images', () => {
  describe('parseArgs', () => {
    const originalArgv = process.argv;

    beforeEach(() => {
      process.argv = ['node', 'backfill-hero-images.ts'];
    });

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('returns defaults when no args provided', () => {
      const result = parseArgs();
      expect(result.dryRun).toBe(false);
      expect(result.limit).toBe(Infinity);
      expect(result.entityType).toBeNull();
      expect(result.delayMs).toBe(2000);
    });

    it('parses --dry-run flag', () => {
      process.argv = ['node', 'script.ts', '--dry-run'];
      const result = parseArgs();
      expect(result.dryRun).toBe(true);
    });

    it('parses --limit N', () => {
      process.argv = ['node', 'script.ts', '--limit', '5'];
      const result = parseArgs();
      expect(result.limit).toBe(5);
    });

    it('parses --entity-type issue', () => {
      process.argv = ['node', 'script.ts', '--entity-type', 'issue'];
      const result = parseArgs();
      expect(result.entityType).toBe('issue');
    });

    it('parses --entity-type organisation', () => {
      process.argv = ['node', 'script.ts', '--entity-type', 'organisation'];
      const result = parseArgs();
      expect(result.entityType).toBe('organisation');
    });

    it('parses --delay-ms N', () => {
      process.argv = ['node', 'script.ts', '--delay-ms', '500'];
      const result = parseArgs();
      expect(result.delayMs).toBe(500);
    });

    it('parses multiple flags together', () => {
      process.argv = ['node', 'script.ts', '--dry-run', '--limit', '10', '--entity-type', 'issue', '--delay-ms', '100'];
      const result = parseArgs();
      expect(result.dryRun).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.entityType).toBe('issue');
      expect(result.delayMs).toBe(100);
    });

    it('exits on invalid --entity-type', () => {
      process.argv = ['node', 'script.ts', '--entity-type', 'invalid'];
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });
      expect(() => parseArgs()).toThrow('process.exit');
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('exits on invalid --limit', () => {
      process.argv = ['node', 'script.ts', '--limit', '-1'];
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });
      expect(() => parseArgs()).toThrow('process.exit');
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('exits on invalid --delay-ms', () => {
      process.argv = ['node', 'script.ts', '--delay-ms', '-5'];
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });
      expect(() => parseArgs()).toThrow('process.exit');
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });

  describe('getEntitiesWithoutHero', () => {
    beforeEach(async () => {
      const db = createClient({ url: ':memory:' });
      _setTestDb(db);
      await dropTables();
      await createTables();
    });

    it('returns issues without hero images', async () => {
      const db = (await import('@/lib/db')).getDb();
      await db.execute({
        sql: `INSERT INTO issues (id, name, category, status) VALUES (?, ?, ?, ?)`,
        args: ['issue-1', 'Train Delays', 'Transport', 'active'],
      });
      await db.execute({
        sql: `INSERT INTO issues (id, name, category, status, hero_image_url) VALUES (?, ?, ?, ?, ?)`,
        args: ['issue-2', 'Bus Fares', 'Transport', 'active', 'https://blob/hero.webp'],
      });

      const entities = await getEntitiesWithoutHero('issue');
      expect(entities).toHaveLength(1);
      expect(entities[0]).toEqual({ id: 'issue-1', name: 'Train Delays', type: 'issue' });
    });

    it('returns organisations without hero images', async () => {
      const db = (await import('@/lib/db')).getDb();
      await db.execute({
        sql: `INSERT INTO organisations (id, name, category, status) VALUES (?, ?, ?, ?)`,
        args: ['org-1', 'Acme Corp', 'Transport', 'active'],
      });

      const entities = await getEntitiesWithoutHero('organisation');
      expect(entities).toHaveLength(1);
      expect(entities[0]).toEqual({ id: 'org-1', name: 'Acme Corp', type: 'organisation' });
    });

    it('excludes inactive/pending entities', async () => {
      const db = (await import('@/lib/db')).getDb();
      await db.execute({
        sql: `INSERT INTO issues (id, name, category, status) VALUES (?, ?, ?, ?)`,
        args: ['issue-pending', 'Pending Issue', 'Transport', 'pending_review'],
      });
      await db.execute({
        sql: `INSERT INTO issues (id, name, category, status) VALUES (?, ?, ?, ?)`,
        args: ['issue-rejected', 'Rejected Issue', 'Transport', 'rejected'],
      });

      const entities = await getEntitiesWithoutHero('issue');
      expect(entities).toHaveLength(0);
    });

    it('returns empty array when all entities have images', async () => {
      const db = (await import('@/lib/db')).getDb();
      await db.execute({
        sql: `INSERT INTO issues (id, name, category, status, hero_image_url, hero_thumb_url) VALUES (?, ?, ?, ?, ?, ?)`,
        args: ['issue-1', 'Train Delays', 'Transport', 'active', 'https://hero.webp', 'https://thumb.webp'],
      });

      const entities = await getEntitiesWithoutHero('issue');
      expect(entities).toHaveLength(0);
    });

    it('orders results by name', async () => {
      const db = (await import('@/lib/db')).getDb();
      await db.execute({
        sql: `INSERT INTO issues (id, name, category, status) VALUES (?, ?, ?, ?)`,
        args: ['issue-z', 'Zebra Crossings', 'Transport', 'active'],
      });
      await db.execute({
        sql: `INSERT INTO issues (id, name, category, status) VALUES (?, ?, ?, ?)`,
        args: ['issue-a', 'Air Quality', 'Environment', 'active'],
      });

      const entities = await getEntitiesWithoutHero('issue');
      expect(entities).toHaveLength(2);
      expect(entities[0].name).toBe('Air Quality');
      expect(entities[1].name).toBe('Zebra Crossings');
    });
  });
});
