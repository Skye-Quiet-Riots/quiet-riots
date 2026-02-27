import { NextRequest } from 'next/server';
import { getFilteredActions } from '@/lib/queries/actions';
import { translateActions } from '@/lib/queries/translate';
import { isValidLocale } from '@/i18n/locales';
import { apiOk } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;

  const rawLocale = searchParams.get('locale');
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : undefined;

  const rawActions = await getFilteredActions(id, {
    type: searchParams.get('type') || undefined,
    time: searchParams.get('time') || undefined,
    skills: searchParams.get('skills') || undefined,
  });

  const actions = locale ? await translateActions(rawActions, locale) : rawActions;

  return apiOk(actions);
}
