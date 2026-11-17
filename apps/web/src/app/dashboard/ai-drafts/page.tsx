import React from 'react';
import { requirePortalRole } from '@/lib/auth';
import { AIDraftReviewHub } from '@/components/ai/AIDraftReviewHub';

export default async function AIDraftsPage() {
  await requirePortalRole([
    'owner',
    'admin',
    'academic_admin',
    'department_head',
    'faculty',
  ]);

  return (
    <div className="container mx-auto py-6">
      <AIDraftReviewHub />
    </div>
  );
}
