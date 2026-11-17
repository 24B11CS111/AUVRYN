import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  requireInstitution: vi.fn().mockResolvedValue({
    user: { id: 'test-admin-uuid' },
    activeInstitutionId: 'inst-test-uuid',
    activeMembership: {
      institutionId: 'inst-test-uuid',
      userId: 'test-admin-uuid',
      role: 'admin',
    },
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockReturnValue({}),
  createAdminClient: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/notifications', () => ({
  NotificationOutboxWorker: vi.fn().mockImplementation(() => ({
    processBatch: vi.fn().mockResolvedValue({ claimedCount: 0, results: [] }),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import {
  triggerOutboxWorkerAction,
  requeueDeadLetterDeliveryAction,
} from '../../apps/web/src/app/dashboard/communications/actions';

describe('Priority 2: Service Role Configuration & Protection', () => {
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });

  it('triggerOutboxWorkerAction returns clear configuration error and never falls back when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await triggerOutboxWorkerAction(25);

    expect(result.success).toBe(false);
    expect(result.error).toContain('SUPABASE_SERVICE_ROLE_KEY is required to execute administrative outbox worker operations');
  });

  it('requeueDeadLetterDeliveryAction returns clear configuration error and never falls back when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await requeueDeadLetterDeliveryAction('del-12345');

    expect(result.success).toBe(false);
    expect(result.error).toContain('SUPABASE_SERVICE_ROLE_KEY is required for dead-letter requeueing operations');
  });
});
