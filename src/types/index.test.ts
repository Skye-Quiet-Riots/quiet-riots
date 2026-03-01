import { describe, it, expect } from 'vitest';
import { safeProfile } from './index';
import type { User } from './index';

describe('safeProfile', () => {
  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+447700900001',
    time_available: '10min',
    skills: 'testing',
    created_at: '2026-01-01T00:00:00Z',
    first_name: 'Test',
    last_name: 'User',
    display_name: 'Testy',
    bio: 'I test things',
    avatar_url: null,
    date_of_birth: null,
    country_code: 'GB',
    language_code: 'en',
    email_verified: 1,
    phone_verified: 1,
    status: 'active',
    deactivated_at: null,
    session_version: 3,
    onboarding_completed: 1,
    password_hash: '$2b$10$hashedpassword',
    password_changed_at: '2026-01-01T00:00:00Z',
    merged_into_user_id: null,
  };

  it('excludes email', () => {
    const safe = safeProfile(mockUser);
    expect('email' in safe).toBe(false);
  });

  it('excludes phone', () => {
    const safe = safeProfile(mockUser);
    expect('phone' in safe).toBe(false);
  });

  it('excludes password_hash', () => {
    const safe = safeProfile(mockUser);
    expect('password_hash' in safe).toBe(false);
  });

  it('excludes password_changed_at', () => {
    const safe = safeProfile(mockUser);
    expect('password_changed_at' in safe).toBe(false);
  });

  it('excludes session_version', () => {
    const safe = safeProfile(mockUser);
    expect('session_version' in safe).toBe(false);
  });

  it('excludes merged_into_user_id', () => {
    const safe = safeProfile(mockUser);
    expect('merged_into_user_id' in safe).toBe(false);
  });

  it('preserves safe fields', () => {
    const safe = safeProfile(mockUser);
    expect(safe.id).toBe('user-123');
    expect(safe.name).toBe('Test User');
    expect(safe.language_code).toBe('en');
    expect(safe.country_code).toBe('GB');
    expect(safe.status).toBe('active');
    expect(safe.first_name).toBe('Test');
    expect(safe.avatar_url).toBeNull();
  });
});
