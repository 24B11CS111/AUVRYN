import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StaffDocumentsClient } from './StaffDocumentsClient';
import type {
  StaffProfileRow,
  StaffDocumentRow,
} from '@edu-platform/database';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StaffDocumentsPage({ params }: PageProps) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'hr_administrator'].includes(userRole);

  const { data: staffData } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('id', params.id)
    .eq('institution_id', institution.id)
    .single();

  if (!staffData) {
    notFound();
  }

  const staff = staffData as StaffProfileRow;

  const { data: documentsData } = await supabase
    .from('staff_documents')
    .select('*')
    .eq('staff_id', staff.id)
    .eq('institution_id', institution.id)
    .order('created_at', { ascending: false });

  return (
    <StaffDocumentsClient
      staff={staff}
      documents={(documentsData || []) as StaffDocumentRow[]}
      canManage={canManage}
    />
  );
}
