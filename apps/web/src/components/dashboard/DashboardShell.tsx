'use client';

import React, { useState } from 'react';
import type { UserSessionContext } from '@edu-platform/types';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

interface DashboardShellProps {
  sessionContext: UserSessionContext;
  children: React.ReactNode;
}

export function DashboardShell({ sessionContext, children }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F5F7FB]">
      {/* Sidebar */}
      <Sidebar
        memberships={sessionContext.memberships}
        activeInstitutionId={sessionContext.activeInstitutionId || ''}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          profile={sessionContext.profile}
          activeMembership={sessionContext.activeMembership}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
