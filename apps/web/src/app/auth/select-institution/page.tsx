import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { AuvrynLogo } from '@/components/branding';
import { SelectInstitutionClient } from './SelectInstitutionClient';

export default async function SelectInstitutionPage() {
  const context = await requireAuth();

  const activeMemberships = context.memberships.filter((m) => m.status === 'active');

  if (activeMemberships.length === 0) {
    redirect('/onboarding');
  }

  // If user has only one membership, route to appropriate dashboard directly
  if (activeMemberships.length === 1) {
    const role = activeMemberships[0]?.role;
    if (role === 'parent' || (role as string) === 'guardian') {
      redirect('/portal/parent');
    } else if (role === 'student') {
      redirect('/portal/student');
    } else if (role === 'faculty' || (role as string) === 'teacher') {
      redirect('/portal/teacher');
    } else {
      redirect('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F5F7FB]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="flex justify-center mb-4">
          <AuvrynLogo variant="primary" size="md" showDescriptor={true} showTagline={true} href="/" />
        </div>
      </div>

      <SelectInstitutionClient
        memberships={activeMemberships}
        currentActiveId={context.activeInstitutionId}
        userName={context.profile.fullName || context.user.email}
      />
    </div>
  );
}
