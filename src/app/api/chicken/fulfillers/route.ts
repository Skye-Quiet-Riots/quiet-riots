import { NextRequest } from 'next/server';
import { getActiveFulfillers } from '@/lib/queries/chicken';
import { apiOk, apiError } from '@/lib/api-response';

const DEV_FALLBACK_KEY = 'qr-bot-dev-key-2026';
const BOT_API_KEY = process.env.BOT_API_KEY || DEV_FALLBACK_KEY;
const IS_DEV_KEY = !process.env.BOT_API_KEY || process.env.BOT_API_KEY === DEV_FALLBACK_KEY;

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${BOT_API_KEY}` || (IS_DEV_KEY && process.env.NODE_ENV === 'production')) {
    return apiError('Unauthorized', 401);
  }

  const { searchParams } = request.nextUrl;
  const country = searchParams.get('country') || undefined;

  const fulfillers = await getActiveFulfillers(country);
  return apiOk(fulfillers);
}
