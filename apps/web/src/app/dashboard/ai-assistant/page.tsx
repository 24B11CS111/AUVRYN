import React from 'react';
import { requirePortalRole } from '@/lib/auth';
import { TeacherAssistantWorkspace } from '@/components/ai/TeacherAssistantWorkspace';

export default async function AIAssistantPage() {
  await requirePortalRole([
    'owner',
    'admin',
    'academic_admin',
    'department_head',
    'faculty',
  ]);

  return (
    <div className="container mx-auto py-6">
      <TeacherAssistantWorkspace />
    </div>
  );
}
