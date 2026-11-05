import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { FeeReceiptsClient } from './FeeReceiptsClient';

interface PageProps {
  searchParams: Promise<{ receipt?: string }>;
}

export default async function FeeReceiptsPage(props: PageProps) {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;
  const searchParams = await props.searchParams;
  const receiptNumber = searchParams?.receipt || '';

  return (
    <div className="container mx-auto py-6">
      <FeeReceiptsClient
        initialReceiptNumber={receiptNumber}
        userRole={userRole}
      />
    </div>
  );
}
