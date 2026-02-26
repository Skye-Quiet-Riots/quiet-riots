import { NextResponse } from 'next/server';
import { getActionInitiativeById } from '@/lib/queries/action-initiatives';
import { apiError } from '@/lib/api-response';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actionInitiative = await getActionInitiativeById(id);
  if (!actionInitiative) {
    return apiError('Action initiative not found', 404);
  }
  return NextResponse.json(
    { ok: true, data: actionInitiative },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}
