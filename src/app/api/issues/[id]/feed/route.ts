import { NextResponse } from 'next/server';
import { getFeedPosts, createFeedPost } from '@/lib/queries/community';
import { getSession } from '@/lib/session';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const posts = await getFeedPosts(Number(id));
  return NextResponse.json(posts);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const body = await request.json();
  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  const post = await createFeedPost(Number(id), userId, body.content.trim());
  return NextResponse.json(post);
}
