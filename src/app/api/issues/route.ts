import { NextRequest, NextResponse } from 'next/server';
import { getAllIssues } from '@/lib/queries/issues';
import type { Category } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') as Category | undefined;
  const search = searchParams.get('search') || undefined;

  const issues = await getAllIssues(category || undefined, search);
  return NextResponse.json(issues);
}
