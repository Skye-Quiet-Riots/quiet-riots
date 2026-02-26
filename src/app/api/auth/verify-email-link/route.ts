import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * GET /api/auth/verify-email-link?token=...
 * Verifies an email linking token (sent from WhatsApp bot's link_email action).
 * Updates the user's email and redirects to profile page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/error?error=Verification', request.url));
  }

  const db = getDb();

  // Find the token
  const result = await db.execute({
    sql: `SELECT identifier, token, expires FROM verification_tokens
          WHERE token = ? AND type = 'email_verify'`,
    args: [token],
  });

  if (result.rows.length === 0) {
    return NextResponse.redirect(new URL('/auth/error?error=Verification', request.url));
  }

  const row = result.rows[0];
  const expires = new Date(row.expires as string);

  if (expires < new Date()) {
    // Token expired — clean up and redirect to error
    await db.execute({
      sql: "DELETE FROM verification_tokens WHERE token = ? AND type = 'email_verify'",
      args: [token],
    });
    return NextResponse.redirect(new URL('/auth/error?error=Verification', request.url));
  }

  // Parse identifier: "userId:email"
  const identifier = row.identifier as string;
  const colonIdx = identifier.indexOf(':');
  if (colonIdx === -1) {
    return NextResponse.redirect(new URL('/auth/error?error=Verification', request.url));
  }

  const userId = identifier.substring(0, colonIdx);
  const newEmail = identifier.substring(colonIdx + 1);

  // Check that the email isn't already taken by another user
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?',
    args: [newEmail, userId],
  });

  if (existing.rows.length > 0) {
    // Email taken — delete token and redirect to error
    await db.execute({
      sql: "DELETE FROM verification_tokens WHERE token = ? AND type = 'email_verify'",
      args: [token],
    });
    return NextResponse.redirect(new URL('/auth/error?error=AccessDenied', request.url));
  }

  // Update user email
  await db.execute({
    sql: 'UPDATE users SET email = ? WHERE id = ?',
    args: [newEmail, userId],
  });

  // Delete the token
  await db.execute({
    sql: "DELETE FROM verification_tokens WHERE token = ? AND type = 'email_verify'",
    args: [token],
  });

  // Redirect to profile page with success
  return NextResponse.redirect(new URL('/en/profile', request.url));
}
