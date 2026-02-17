import { NextRequest } from 'next/server';
import { getFilteredActions } from '@/lib/queries/actions';
import { apiOk } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;

  const actions = await getFilteredActions(id, {
    type: searchParams.get('type') || undefined,
    time: searchParams.get('time') || undefined,
    skills: searchParams.get('skills') || undefined,
  });

  return apiOk(actions);
}
