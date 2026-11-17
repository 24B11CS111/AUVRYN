import { describe, it, expect } from 'vitest';
import { mapToUserProfile, type ProfileRow } from '../../apps/web/src/lib/auth';

describe('Auth Profile Mapping & Defensive Avatar Resolution', () => {
  it('maps snake_case database profile row to camelCase Profile model correctly', () => {
    const user = {
      id: 'usr-123',
      email: 'john.doe@example.com',
      created_at: '2026-01-01T00:00:00Z',
    };
    const row: ProfileRow = {
      id: 'usr-123',
      email: 'john.doe@example.com',
      full_name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
      phone: '+1234567890',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };

    const profile = mapToUserProfile(user, row);

    expect(profile.id).toBe('usr-123');
    expect(profile.fullName).toBe('John Doe');
    expect(profile.email).toBe('john.doe@example.com');
    expect(profile.avatarUrl).toBe('https://example.com/avatar.jpg');
    expect(profile.phone).toBe('+1234567890');
    expect(profile.createdAt).toBe('2026-01-01T00:00:00Z');
    expect(profile.updatedAt).toBe('2026-01-02T00:00:00Z');

    // Safe avatar initial computation
    expect(profile.fullName.charAt(0).toUpperCase()).toBe('J');
  });

  it('falls back to user metadata when database full_name is null or empty', () => {
    const user = {
      id: 'usr-456',
      email: 'jane@example.com',
      user_metadata: {
        full_name: 'Jane Smith',
      },
    };
    const row: ProfileRow = {
      id: 'usr-456',
      email: 'jane@example.com',
      full_name: '',
      avatar_url: null,
      phone: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const profile = mapToUserProfile(user, row);
    expect(profile.fullName).toBe('Jane Smith');
    expect(profile.fullName.charAt(0).toUpperCase()).toBe('J');
  });

  it('falls back to email prefix when full_name is undefined across both row and metadata', () => {
    const user = {
      id: 'usr-789',
      email: 'admin.school@eduplatform.com',
    };
    const row: ProfileRow = {
      id: 'usr-789',
      email: 'admin.school@eduplatform.com',
      full_name: (null as unknown) as string,
      avatar_url: null,
      phone: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const profile = mapToUserProfile(user, row);
    expect(profile.fullName).toBe('admin.school');
    expect(profile.fullName.charAt(0).toUpperCase()).toBe('A');
  });

  it('handles completely missing profile row (null) gracefully during initial onboarding', () => {
    const user = {
      id: 'usr-new',
      email: 'principal@school.edu',
      created_at: '2026-03-01T00:00:00Z',
    };

    const profile = mapToUserProfile(user, null);
    expect(profile.id).toBe('usr-new');
    expect(profile.fullName).toBe('principal');
    expect(profile.email).toBe('principal@school.edu');
    expect(profile.avatarUrl).toBeNull();
    expect(profile.phone).toBeNull();
    expect(profile.fullName.charAt(0).toUpperCase()).toBe('P');
  });

  it('provides safe fallback when user has no email or metadata', () => {
    const user = {
      id: 'usr-anonymous',
    };

    const profile = mapToUserProfile(user, null);
    expect(profile.fullName).toBe('User');
    expect(profile.fullName.charAt(0).toUpperCase()).toBe('U');
  });
});
