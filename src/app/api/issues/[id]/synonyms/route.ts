import { NextResponse } from 'next/server';
import { getSynonymsForIssue, addSynonym } from '@/lib/queries/synonyms';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const synonyms = getSynonymsForIssue(Number(id));
  return NextResponse.json(synonyms);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  if (!body.term?.trim()) {
    return NextResponse.json({ error: 'Term required' }, { status: 400 });
  }
  const synonym = addSynonym(Number(id), body.term.trim());
  return NextResponse.json(synonym);
}
