import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDbEnvironment, requireRemoteDb } from './db-safety';

// Save and restore env between tests
const originalEnv = { ...process.env };

beforeEach(() => {
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('getDbEnvironment', () => {
  it('detects local environment when no env vars are set', () => {
    const env = getDbEnvironment();
    expect(env.dbUrl).toBe('file:quiet-riots.db');
    expect(env.isLocal).toBe(true);
    expect(env.isStaging).toBe(false);
    expect(env.isProduction).toBe(false);
    expect(env.label).toContain('LOCAL');
  });

  it('detects local environment for file: URLs', () => {
    process.env.TURSO_DATABASE_URL = 'file:test.db';
    const env = getDbEnvironment();
    expect(env.isLocal).toBe(true);
    expect(env.isStaging).toBe(false);
    expect(env.isProduction).toBe(false);
  });

  it('detects staging environment', () => {
    process.env.TURSO_DATABASE_URL =
      'libsql://quiet-riots-staging-skye-quiet-riots.aws-eu-west-1.turso.io';
    const env = getDbEnvironment();
    expect(env.isStaging).toBe(true);
    expect(env.isProduction).toBe(false);
    expect(env.isLocal).toBe(false);
    expect(env.label).toContain('STAGING');
  });

  it('detects production environment', () => {
    process.env.TURSO_DATABASE_URL = 'libsql://quiet-riots-skye-quiet-riots.aws-eu-west-1.turso.io';
    const env = getDbEnvironment();
    expect(env.isProduction).toBe(true);
    expect(env.isStaging).toBe(false);
    expect(env.isLocal).toBe(false);
    expect(env.label).toContain('PRODUCTION');
  });

  it('falls back to DATABASE_URL if TURSO_DATABASE_URL is not set', () => {
    process.env.DATABASE_URL =
      'libsql://quiet-riots-staging-skye-quiet-riots.aws-eu-west-1.turso.io';
    const env = getDbEnvironment();
    expect(env.isStaging).toBe(true);
    expect(env.dbUrl).toContain('staging');
  });

  it('prefers TURSO_DATABASE_URL over DATABASE_URL', () => {
    process.env.TURSO_DATABASE_URL = 'file:local.db';
    process.env.DATABASE_URL = 'libsql://quiet-riots-skye-quiet-riots.aws-eu-west-1.turso.io';
    const env = getDbEnvironment();
    expect(env.isLocal).toBe(true);
    expect(env.dbUrl).toBe('file:local.db');
  });

  it('returns the actual URL in dbUrl', () => {
    const url = 'libsql://quiet-riots-staging-skye-quiet-riots.aws-eu-west-1.turso.io';
    process.env.TURSO_DATABASE_URL = url;
    const env = getDbEnvironment();
    expect(env.dbUrl).toBe(url);
  });
});

describe('requireRemoteDb', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('exits with code 1 when no env vars are set (local fallback)', () => {
    delete process.env.TURSO_DATABASE_URL;
    expect(() => requireRemoteDb()).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 for file: URLs', () => {
    process.env.TURSO_DATABASE_URL = 'file:test.db';
    expect(() => requireRemoteDb()).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('allows staging database', () => {
    process.env.TURSO_DATABASE_URL =
      'libsql://quiet-riots-staging-skye-quiet-riots.aws-eu-west-1.turso.io';
    const env = requireRemoteDb();
    expect(env.isStaging).toBe(true);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('allows production database', () => {
    process.env.TURSO_DATABASE_URL = 'libsql://quiet-riots-skye-quiet-riots.aws-eu-west-1.turso.io';
    const env = requireRemoteDb();
    expect(env.isProduction).toBe(true);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe('blockProductionUnlessForced', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const originalArgv = process.argv;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
    process.argv = originalArgv;
  });

  it('exits with code 1 when production URL detected and no force flag', async () => {
    process.env.TURSO_DATABASE_URL = 'libsql://quiet-riots-skye-quiet-riots.aws-eu-west-1.turso.io';
    process.argv = ['node', 'seed.ts'];

    // Dynamic import to pick up the env var set above
    const { blockProductionUnlessForced } = await import('./db-safety');

    await expect(blockProductionUnlessForced('seed')).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does nothing for local database', async () => {
    delete process.env.TURSO_DATABASE_URL;
    process.argv = ['node', 'seed.ts'];

    const { blockProductionUnlessForced } = await import('./db-safety');
    // Should resolve without calling process.exit
    await blockProductionUnlessForced('seed');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('does nothing for staging database', async () => {
    process.env.TURSO_DATABASE_URL =
      'libsql://quiet-riots-staging-skye-quiet-riots.aws-eu-west-1.turso.io';
    process.argv = ['node', 'seed.ts'];

    const { blockProductionUnlessForced } = await import('./db-safety');
    await blockProductionUnlessForced('seed');
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
