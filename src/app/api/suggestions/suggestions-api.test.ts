import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET, POST } from './route';
import { POST as reviewSuggestion } from './[id]/review/route';
import { POST as goLiveSuggestion } from './[id]/go-live/route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

function mockLoggedIn(userId: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) =>
      name === 'qr_user_id' ? { name: 'qr_user_id', value: String(userId) } : undefined,
    ),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

function mockLoggedOut() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

describe('GET /api/suggestions', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockLoggedOut();
    const request = new NextRequest('http://localhost:3000/api/suggestions');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-guide users', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest('http://localhost:3000/api/suggestions');
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('returns suggestions for setup guide', async () => {
    mockLoggedIn('user-sarah');
    const request = new NextRequest('http://localhost:3000/api/suggestions');
    const response = await GET(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it('returns suggestions for administrator', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/suggestions');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it('filters by status', async () => {
    mockLoggedIn('user-sarah');
    const request = new NextRequest('http://localhost:3000/api/suggestions?status=pending_review');
    const response = await GET(request);
    const { data } = await response.json();
    expect(data.suggestions.every((s: { status: string }) => s.status === 'pending_review')).toBe(
      true,
    );
  });
});

describe('POST /api/suggestions (new Quiet Riot)', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockLoggedOut();
    const request = new NextRequest('http://localhost:3000/api/suggestions', {
      method: 'POST',
      body: JSON.stringify({
        suggested_name: 'Test Issue',
        original_text: 'test issue text',
        category: 'Tech',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('creates a new issue suggestion with pending issue', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest('http://localhost:3000/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggested_name: 'Pothole Crisis',
        original_text: 'there are potholes everywhere',
        category: 'Transport',
        suggested_type: 'issue',
        description: 'Roads are terrible',
        public_recognition: true,
      }),
    });
    const response = await POST(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(201);
    expect(ok).toBe(true);
    expect(data.suggestion.suggested_name).toBe('Pothole Crisis');
    expect(data.suggestion.status).toBe('pending_review');
    expect(data.entity_type).toBe('issue');
    expect(data.entity_id).toBeTruthy();
  });

  it('creates an organisation suggestion', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest('http://localhost:3000/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggested_name: 'BadCorp Ltd',
        original_text: 'badcorp is terrible',
        category: 'Tech',
        suggested_type: 'organisation',
      }),
    });
    const response = await POST(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(201);
    expect(ok).toBe(true);
    expect(data.entity_type).toBe('organisation');
  });

  it('returns validation error for missing category', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest('http://localhost:3000/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggested_name: 'No Category Issue',
        original_text: 'no category',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const { code } = await response.json();
    expect(code).toBe('VALIDATION_ERROR');
  });

  it('backward compatible: still handles idea suggestions for existing issues', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest('http://localhost:3000/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue_id: 'issue-rail',
        suggestion_text: 'We should organise a boycott of specific train services',
      }),
    });
    const response = await POST(request);
    const { ok } = await response.json();
    expect(response.status).toBe(201);
    expect(ok).toBe(true);
  });
});

describe('POST /api/suggestions/[id]/review', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockLoggedOut();
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/review',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      },
    );
    const response = await reviewSuggestion(request, {
      params: Promise.resolve({ id: 'suggestion-mobile' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-guide users', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/review',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      },
    );
    const response = await reviewSuggestion(request, {
      params: Promise.resolve({ id: 'suggestion-mobile' }),
    });
    expect(response.status).toBe(403);
  });

  it('allows setup guide to approve a suggestion (auto-transitions to translations_ready)', async () => {
    mockLoggedIn('user-sarah');
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/review',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve', category: 'Telecoms' }),
      },
    );
    const response = await reviewSuggestion(request, {
      params: Promise.resolve({ id: 'suggestion-mobile' }),
    });
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.decision).toBe('approved');
    // After approve, markTranslationsReady auto-transitions
    expect(data.suggestion.status).toBe('translations_ready');
  });

  it('returns 404 for non-existent suggestion', async () => {
    mockLoggedIn('user-sarah');
    const request = new NextRequest('http://localhost:3000/api/suggestions/non-existent/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approve' }),
    });
    const response = await reviewSuggestion(request, {
      params: Promise.resolve({ id: 'non-existent' }),
    });
    expect(response.status).toBe(404);
  });
});

describe('POST /api/suggestions/[id]/go-live', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockLoggedOut();
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/go-live',
      { method: 'POST' },
    );
    const response = await goLiveSuggestion(request, {
      params: Promise.resolve({ id: 'suggestion-mobile' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-guide users', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/go-live',
      { method: 'POST' },
    );
    const response = await goLiveSuggestion(request, {
      params: Promise.resolve({ id: 'suggestion-mobile' }),
    });
    expect(response.status).toBe(403);
  });

  it('makes a translations_ready suggestion live', async () => {
    mockLoggedIn('user-sarah');
    // suggestion-mobile should be translations_ready from the approve test above
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/go-live',
      { method: 'POST' },
    );
    const response = await goLiveSuggestion(request, {
      params: Promise.resolve({ id: 'suggestion-mobile' }),
    });
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.suggestion.status).toBe('live');
  });
});

describe('Suggestion full lifecycle', () => {
  let createdSuggestionId: string;

  it('creates a suggestion → approves → goes live', async () => {
    // Step 1: Create suggestion
    mockLoggedIn('user-new');
    const createRequest = new NextRequest('http://localhost:3000/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggested_name: 'Lifecycle Test Issue',
        original_text: 'testing the full lifecycle',
        category: 'Education',
      }),
    });
    const createRes = await POST(createRequest);
    const { data: createData } = await createRes.json();
    expect(createRes.status).toBe(201);
    createdSuggestionId = createData.suggestion.id;

    // Step 2: Approve (as guide)
    mockLoggedIn('user-sarah');
    const approveRequest = new NextRequest(
      `http://localhost:3000/api/suggestions/${createdSuggestionId}/review`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      },
    );
    const approveRes = await reviewSuggestion(approveRequest, {
      params: Promise.resolve({ id: createdSuggestionId }),
    });
    const { data: approveData } = await approveRes.json();
    expect(approveRes.status).toBe(200);
    expect(approveData.suggestion.status).toBe('translations_ready');

    // Step 3: Go live (as guide)
    const goLiveRequest = new NextRequest(
      `http://localhost:3000/api/suggestions/${createdSuggestionId}/go-live`,
      { method: 'POST' },
    );
    const goLiveRes = await goLiveSuggestion(goLiveRequest, {
      params: Promise.resolve({ id: createdSuggestionId }),
    });
    const { data: goLiveData } = await goLiveRes.json();
    expect(goLiveRes.status).toBe(200);
    expect(goLiveData.suggestion.status).toBe('live');
  });

  it('creates a suggestion → rejects it', async () => {
    // Create
    mockLoggedIn('user-new');
    const createRequest = new NextRequest('http://localhost:3000/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggested_name: 'Reject Test Issue',
        original_text: 'this will be rejected',
        category: 'Other',
      }),
    });
    const createRes = await POST(createRequest);
    const { data: createData } = await createRes.json();
    expect(createRes.status).toBe(201);
    const rejId = createData.suggestion.id;

    // Reject (as guide)
    mockLoggedIn('user-sarah');
    const rejectRequest = new NextRequest(`http://localhost:3000/api/suggestions/${rejId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'reject',
        rejection_reason: 'about_people',
        rejection_detail: 'Targets a specific individual',
      }),
    });
    const rejectRes = await reviewSuggestion(rejectRequest, {
      params: Promise.resolve({ id: rejId }),
    });
    const { data: rejectData } = await rejectRes.json();
    expect(rejectRes.status).toBe(200);
    expect(rejectData.decision).toBe('rejected');
    expect(rejectData.suggestion.rejection_reason).toBe('about_people');
  });

  it('creates a suggestion → merges it', async () => {
    // Create
    mockLoggedIn('user-new');
    const createRequest = new NextRequest('http://localhost:3000/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggested_name: 'Train Delays Are Bad',
        original_text: 'trains are always late',
        category: 'Transport',
      }),
    });
    const createRes = await POST(createRequest);
    const { data: createData } = await createRes.json();
    expect(createRes.status).toBe(201);
    const mergeId = createData.suggestion.id;

    // Merge into existing issue (as guide)
    mockLoggedIn('user-sarah');
    const mergeRequest = new NextRequest(
      `http://localhost:3000/api/suggestions/${mergeId}/review`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'merge',
          merge_into_issue_id: 'issue-rail',
        }),
      },
    );
    const mergeRes = await reviewSuggestion(mergeRequest, {
      params: Promise.resolve({ id: mergeId }),
    });
    const { data: mergeData } = await mergeRes.json();
    expect(mergeRes.status).toBe(200);
    expect(mergeData.decision).toBe('merged');
  });

  it('creates a suggestion → asks for more info', async () => {
    // Create
    mockLoggedIn('user-new');
    const createRequest = new NextRequest('http://localhost:3000/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggested_name: 'Vague Issue',
        original_text: 'something is wrong',
        category: 'Other',
      }),
    });
    const createRes = await POST(createRequest);
    const { data: createData } = await createRes.json();
    const infoId = createData.suggestion.id;

    // Ask for more info (as guide)
    mockLoggedIn('user-sarah');
    const infoRequest = new NextRequest(`http://localhost:3000/api/suggestions/${infoId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'more_info',
        reviewer_notes: 'Can you be more specific about what issue you mean?',
      }),
    });
    const infoRes = await reviewSuggestion(infoRequest, {
      params: Promise.resolve({ id: infoId }),
    });
    const { data: infoData } = await infoRes.json();
    expect(infoRes.status).toBe(200);
    expect(infoData.decision).toBe('more_info');
  });
});
