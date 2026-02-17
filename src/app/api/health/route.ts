import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const start = Date.now();

  try {
    const db = getDb();
    await db.execute('SELECT 1');
    const dbMs = Date.now() - start;

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      dbLatencyMs: dbMs,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        db: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
