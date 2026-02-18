import { describe, it, expect } from 'vitest';
import { apiOk, apiError, apiValidationError } from './api-response';

describe('apiOk', () => {
  it('returns ok: true with data', async () => {
    const response = apiOk({ name: 'test' });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.name).toBe('test');
  });

  it('supports custom status', async () => {
    const response = apiOk({ created: true }, 201);
    expect(response.status).toBe(201);
  });
});

describe('apiError', () => {
  it('returns ok: false with error message and inferred code', async () => {
    const response = apiError('Bad request');
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Bad request');
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('infers NOT_FOUND code from 404 status', async () => {
    const response = apiError('Not found', 404);
    const body = await response.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('infers UNAUTHORIZED code from 401 status', async () => {
    const response = apiError('Unauthorized', 401);
    const body = await response.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('infers RATE_LIMITED code from 429 status', async () => {
    const response = apiError('Too many requests', 429);
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMITED');
  });

  it('infers INTERNAL_ERROR code from 500 status', async () => {
    const response = apiError('Server error', 500);
    const body = await response.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('allows explicit code override', async () => {
    const response = apiError('Custom', 400, 'INTERNAL_ERROR');
    const body = await response.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });
});

describe('apiValidationError', () => {
  it('returns structured validation errors', async () => {
    const response = apiValidationError([
      { path: ['name'], message: 'Required' },
      { path: ['email'], message: 'Invalid email' },
    ]);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveLength(2);
    expect(body.details[0]).toEqual({ field: 'name', message: 'Required' });
    expect(body.details[1]).toEqual({ field: 'email', message: 'Invalid email' });
    expect(body.error).toContain('name: Required');
    expect(body.error).toContain('email: Invalid email');
  });

  it('handles empty path', async () => {
    const response = apiValidationError([{ path: [], message: 'General error' }]);
    const body = await response.json();
    expect(body.details[0]).toEqual({ field: '', message: 'General error' });
    expect(body.error).toBe('General error');
  });
});
