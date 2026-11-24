import React from 'react';

// Force dynamic rendering for all authenticated portal routes
export const dynamic = 'force-dynamic';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
