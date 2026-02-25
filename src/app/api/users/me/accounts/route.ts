import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import {
  getUserConnectedAccounts,
  countUserAuthMethods,
  unlinkUserAccount,
} from '@/lib/queries/users';

const SUPPORTED_PROVIDERS = ['google', 'facebook'];

const unlinkSchema = z.object({
  provider: z.string().min(1),
});

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const accounts = await getUserConnectedAccounts(userId);
  return apiOk({ accounts });
}

export async function DELETE(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`unlink-account:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const parsed = unlinkSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { provider } = parsed.data;

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return apiError(
      `Unsupported provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
    );
  }

  // Safety check: can't unlink your last auth method
  const authMethodCount = await countUserAuthMethods(userId);
  if (authMethodCount <= 1) {
    return apiError('Cannot unlink your only connected account. Link another account first.', 409);
  }

  const removed = await unlinkUserAccount(userId, provider);
  if (!removed) {
    return apiError(`No ${provider} account is currently linked`, 404);
  }

  return apiOk({ provider, unlinked: true });
}
