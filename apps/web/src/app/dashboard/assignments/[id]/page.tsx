import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getHomeworkAssignmentByIdAction } from '../actions';
import { AssignmentDetailClient } from './AssignmentDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssignmentDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;
  const currentUserId = session.activeMembership!.userId;
  const supabase = createClient() as any;

  const res = await getHomeworkAssignmentByIdAction(id);
  if (!res.success || !res.data) {
    notFound();
  }

  let currentStudentId: string | null = null;
  if (userRole === 'student') {
    const { data: st } = await supabase
      .from('students')
      .select('id')
      .eq('institution_id', session.activeMembership!.institutionId)
      .eq('user_id', currentUserId)
      .single();

    if (st) {
      currentStudentId = st.id;
    }
  }

  return (
    <div className="container mx-auto py-6">
      <AssignmentDetailClient
        assignment={res.data.assignment}
        submissions={res.data.submissions}
        userRole={userRole}
        currentStudentId={currentStudentId}
      />
    </div>
  );
}
