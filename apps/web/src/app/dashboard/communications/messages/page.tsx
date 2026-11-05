import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getCommunicationThreadsAction } from '../actions';
import { MessagesClient } from './MessagesClient';

export default async function MessagesPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;
  const currentUserId = session.activeMembership!.userId;
  const supabase = createClient() as any;

  const [threadsRes, membersRes] = await Promise.all([
    getCommunicationThreadsAction(),
    supabase
      .from('institution_memberships')
      .select('user_id, role, profile:profiles(id, full_name, email)')
      .eq('institution_id', session.activeMembership!.institutionId)
      .neq('user_id', currentUserId)
      .limit(30),
  ]);

  const threads = threadsRes.success && threadsRes.data ? threadsRes.data : [];
  const potentialRecipients = (membersRes.data || [])
    .filter((m: any) => m.profile)
    .map((m: any) => ({
      id: m.profile.id,
      fullName: m.profile.full_name,
      role: m.role,
    }));

  return (
    <div className="container mx-auto py-6">
      <MessagesClient
        initialThreads={threads}
        currentUserId={currentUserId}
        userRole={userRole}
        potentialRecipients={potentialRecipients}
      />
    </div>
  );
}
