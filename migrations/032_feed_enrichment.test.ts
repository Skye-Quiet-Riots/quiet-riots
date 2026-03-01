import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const migrationPath = join(__dirname, '032_feed_enrichment.sql');
const sql = readFileSync(migrationPath, 'utf8');

describe('032_feed_enrichment migration', () => {
  it('adds photo_urls column with default', () => {
    expect(sql).toContain("ADD COLUMN photo_urls TEXT NOT NULL DEFAULT '[]'");
  });

  it('adds comments_count column with check constraint', () => {
    expect(sql).toContain('ADD COLUMN comments_count INTEGER NOT NULL DEFAULT 0');
    expect(sql).toContain('CHECK(comments_count >= 0)');
  });

  it('adds shares column with check constraint', () => {
    expect(sql).toContain('ADD COLUMN shares INTEGER NOT NULL DEFAULT 0');
    expect(sql).toContain('CHECK(shares >= 0)');
  });

  it('creates feed_comments table', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS feed_comments');
  });

  it('feed_comments has ON DELETE CASCADE', () => {
    expect(sql).toContain('ON DELETE CASCADE');
  });

  it('feed_comments has content length constraints', () => {
    expect(sql).toContain('CHECK(length(content) > 0 AND length(content) <= 2000)');
  });

  it('creates indexes for feed_comments', () => {
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_feed_comments_feed_id');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_feed_comments_user_id');
  });

  it('creates index on feed(issue_id)', () => {
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_feed_issue_id');
  });
});
