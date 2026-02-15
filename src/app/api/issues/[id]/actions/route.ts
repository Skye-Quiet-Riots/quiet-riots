import { NextRequest, NextResponse } from 'next/server';
import { getFilteredActions } from '@/lib/queries/actions';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;

  const actions = getFilteredActions(Number(id), {
    type: searchParams.get('type') || undefined,
    time: searchParams.get('time') || undefined,
    skills: searchParams.get('skills') || undefined,
  });

  return NextResponse.json(actions);
}
