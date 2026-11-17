import React from 'react';
import { requirePortalRole } from '@/lib/auth';
import { OwnerAIIntelligenceView } from '@/components/ai/OwnerAIIntelligenceView';

export default async function AIIntelligencePage() {
  await requirePortalRole(['owner', 'admin', 'academic_admin']);

  return (
    <div className="container mx-auto py-6">
      <OwnerAIIntelligenceView />
    </div>
  );
}
