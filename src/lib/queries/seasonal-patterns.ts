import { getDb } from '../db';
import type { SeasonalPattern } from '@/types';

export async function getSeasonalPattern(issueId: string): Promise<SeasonalPattern | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM seasonal_patterns WHERE issue_id = ?',
    args: [issueId],
  });
  return (result.rows[0] as unknown as SeasonalPattern) ?? null;
}

export async function getSeasonalPatternsByMonth(month: number): Promise<SeasonalPattern[]> {
  const db = getDb();
  const result = await db.execute('SELECT * FROM seasonal_patterns');
  const all = result.rows as unknown as SeasonalPattern[];
  return all.filter((sp) => {
    const months: number[] = JSON.parse(sp.peak_months);
    return months.includes(month);
  });
}

export async function getAllSeasonalPatterns(): Promise<SeasonalPattern[]> {
  const db = getDb();
  const result = await db.execute('SELECT * FROM seasonal_patterns');
  return result.rows as unknown as SeasonalPattern[];
}
