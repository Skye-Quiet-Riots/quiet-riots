import { NextResponse } from 'next/server';
import { getUserById, updateUser, getUserIssues } from '@/lib/queries/users';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = getUserById(Number(id));
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const issues = getUserIssues(user.id);
  return NextResponse.json({ user, issues });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const user = updateUser(Number(id), body);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(user);
}
