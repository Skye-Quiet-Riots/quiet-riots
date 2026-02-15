import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/queries/users';
import { setSession } from '@/lib/session';

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name?.trim() || !body.email?.trim()) {
    return NextResponse.json({ error: 'Name and email required' }, { status: 400 });
  }

  // Check if user already exists
  const existing = getUserByEmail(body.email.trim());
  if (existing) {
    await setSession(existing.id);
    return NextResponse.json(existing);
  }

  const user = createUser({
    name: body.name.trim(),
    email: body.email.trim(),
    time_available: body.time_available || '10min',
    skills: body.skills || '',
  });

  await setSession(user.id);
  return NextResponse.json(user);
}
