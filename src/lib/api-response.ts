import { NextResponse } from 'next/server';

/**
 * Standard API response helpers.
 * All API routes should use these for consistent response shapes.
 *
 * Success: { ok: true, data: T }
 * Error:   { ok: false, error: string }
 */
export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
