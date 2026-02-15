import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { joinIssue, leaveIssue } from '@/lib/queries/users';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }
  await joinIssue(userId, Number(id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }
  await leaveIssue(userId, Number(id));
  return NextResponse.json({ success: true });
}
