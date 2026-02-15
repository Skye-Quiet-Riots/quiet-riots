import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserById, getUserIssues } from '@/lib/queries/users';

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const issues = await getUserIssues(userId);
  return NextResponse.json({ user, issues });
}
