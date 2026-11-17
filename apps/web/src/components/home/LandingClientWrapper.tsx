'use client';

import React from 'react';
import { BrandIntro } from '@/components/branding';

export function LandingClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BrandIntro />
      {children}
    </>
  );
}
