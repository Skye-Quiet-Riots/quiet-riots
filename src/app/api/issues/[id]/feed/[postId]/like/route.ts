import { NextResponse } from 'next/server';
import { likeFeedPost } from '@/lib/queries/community';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; postId: string }> }) {
  const { postId } = await params;
  likeFeedPost(Number(postId));
  return NextResponse.json({ success: true });
}
