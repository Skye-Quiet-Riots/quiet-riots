import { NextResponse } from 'next/server';

/**
 * Standard API response helpers.
 * All API routes should use these for consistent response shapes.
 *
 * Success: { ok: true, data: T }
 * Error:   { ok: false, error: string, code: ErrorCode }
 * Validation: { ok: false, error: string, code: 'VALIDATION_ERROR', details: [...] }
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(message: string, status = 400, code?: ErrorCode) {
  // Infer code from status if not explicitly provided
  const errorCode =
    code ??
    (status === 404
      ? 'NOT_FOUND'
      : status === 401
        ? 'UNAUTHORIZED'
        : status === 429
          ? 'RATE_LIMITED'
          : status >= 500
            ? 'INTERNAL_ERROR'
            : 'VALIDATION_ERROR');

  return NextResponse.json({ ok: false, error: message, code: errorCode }, { status });
}

/**
 * Return a structured validation error with field-level details.
 * Accepts Zod-style issues with path and message.
 */
export function apiValidationError(
  issues: { path: (string | number | symbol)[]; message: string }[],
  status = 400,
) {
  const details = issues.map((i) => ({
    field: i.path.map(String).join('.'),
    message: i.message,
  }));
  const summary = details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join(', ');

  return NextResponse.json(
    { ok: false, error: summary, code: 'VALIDATION_ERROR' as const, details },
    { status },
  );
}
