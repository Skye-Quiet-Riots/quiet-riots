import { NextResponse } from 'next/server';
import { getAllAssistants } from '@/lib/queries/assistants';

export async function GET() {
  const assistants = await getAllAssistants();
  return NextResponse.json(
    { ok: true, data: assistants },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}
