'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type LogoVariant = 'symbol' | 'horizontal' | 'primary' | 'white' | 'monochrome';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AuvrynLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  showDescriptor?: boolean;
  showTagline?: boolean;
  href?: string;
}

export function AuvrynLogoSymbol({
  className,
  variant = 'horizontal',
  size = 32,
}: {
  className?: string;
  variant?: LogoVariant;
  size?: number;
}) {
  const isWhite = variant === 'white';
  const isMonochrome = variant === 'monochrome';

  const navyFill = isWhite ? '#FFFFFF' : '#0B1E3F';
  const deepNavyFill = isWhite ? '#FFFFFF' : '#07152B';
  const secondNavyFill = isWhite ? '#F1F5F9' : (isMonochrome ? '#0B1E3F' : '#142C4C');
  const blueFill = isWhite ? '#60A5FA' : (isMonochrome ? '#0B1E3F' : '#2563EB');
  const lightBlueFill = isWhite ? '#93C5FD' : (isMonochrome ? '#0B1E3F' : '#60A5FA');
  const orbitStroke = isWhite ? '#60A5FA' : (isMonochrome ? '#0B1E3F' : '#2563EB');
  const spineStroke = isWhite ? '#0B1E3F' : '#FFFFFF';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 select-none', className)}
      aria-label="AUVRYN symbol"
    >
      {/* Orbital Ring */}
      <ellipse
        cx="50"
        cy="54"
        rx="44"
        ry="19"
        transform="rotate(-12 50 54)"
        stroke={orbitStroke}
        strokeWidth="2"
        strokeDasharray="3 3"
        opacity={isWhite ? 0.7 : 0.45}
      />
      {/* Orbit Nodes */}
      <circle cx="8" cy="62" r="3" fill={blueFill} />
      <circle cx="92" cy="46" r="3" fill={blueFill} />
      <circle cx="50" cy="73" r="2.5" fill={blueFill} opacity="0.75" />

      {/* Open Book (Education & Knowledge) */}
      <path
        d="M 50 78 C 37 78 21 73 14 65 C 14 54 14 42 14 42 C 22 49 37 53 50 55 Z"
        fill={navyFill}
      />
      <path
        d="M 50 78 C 63 78 79 73 86 65 C 86 54 86 42 86 42 C 78 49 63 53 50 55 Z"
        fill={secondNavyFill}
      />
      {/* Spine */}
      <line x1="50" y1="55" x2="50" y2="78" stroke={spineStroke} strokeWidth="1.5" strokeLinecap="round" />

      {/* Rising Analytics Bars (Progress & Analytics) */}
      <rect x="36" y="44" width="5.5" height="15" rx="2.75" fill={lightBlueFill} />
      <rect x="47.25" y="36" width="5.5" height="23" rx="2.75" fill={blueFill} />
      <rect x="58.5" y="27" width="5.5" height="32" rx="2.75" fill={blueFill} />

      {/* Graduation Cap (Academic Achievement) */}
      <polygon
        points="50,11 74,21 50,31 26,21"
        fill={deepNavyFill}
        stroke={blueFill}
        strokeWidth="1.2"
      />
      <path
        d="M 37 26.5 C 37 34 63 34 63 26.5"
        fill="none"
        stroke={deepNavyFill}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Tassel */}
      <path
        d="M 74 21 L 79 28 L 79 34"
        fill="none"
        stroke={blueFill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="79" cy="35" r="1.5" fill={blueFill} />

      {/* Intelligent Spark (AI & Innovation) */}
      <path
        d="M 80 8 Q 80 14 86 14 Q 80 14 80 20 Q 80 14 74 14 Q 80 14 80 8 Z"
        fill={blueFill}
      />
      <circle cx="80" cy="14" r="1.2" fill="#FFFFFF" />
    </svg>
  );
}

export function AuvrynLogo({
  variant = 'horizontal',
  size = 'md',
  className,
  showDescriptor = true,
  showTagline = false,
  href,
}: AuvrynLogoProps) {
  const sizeMap: Record<LogoSize, { symbol: number; text: string; desc: string }> = {
    xs: { symbol: 24, text: 'text-sm tracking-wider', desc: 'text-[6px] tracking-widest' },
    sm: { symbol: 28, text: 'text-base tracking-wider', desc: 'text-[7px] tracking-widest' },
    md: { symbol: 36, text: 'text-lg tracking-wider', desc: 'text-[8px] tracking-widest' },
    lg: { symbol: 44, text: 'text-2xl tracking-wider', desc: 'text-[9px] tracking-widest' },
    xl: { symbol: 56, text: 'text-3xl tracking-widest', desc: 'text-[11px] tracking-widest' },
  };

  const isWhite = variant === 'white';
  const isMonochrome = variant === 'monochrome';

  const textColor = isWhite
    ? 'text-white'
    : isMonochrome
    ? 'text-[#0B1E3F]'
    : 'text-[#0B1E3F]';

  const descColor = isWhite
    ? 'text-[#93C5FD]'
    : isMonochrome
    ? 'text-[#0B1E3F]/80'
    : 'text-[#2563EB]';

  const content = (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 transition-opacity hover:opacity-95',
        variant === 'primary' && 'flex-col text-center gap-3',
        className
      )}
      role="banner"
      aria-label="AUVRYN — The Intelligent Education Ecosystem"
    >
      <AuvrynLogoSymbol
        variant={variant}
        size={sizeMap[size].symbol}
        className={variant === 'primary' ? 'mx-auto' : ''}
      />

      {variant !== 'symbol' && (
        <div className={cn('flex flex-col', variant === 'primary' ? 'items-center' : 'items-start')}>
          <div className="flex items-center gap-1 leading-none">
            <span
              className={cn(
                'font-extrabold uppercase font-sans select-none',
                textColor,
                sizeMap[size].text
              )}
            >
              AUVRYN
            </span>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full mb-1',
                isWhite ? 'bg-[#60A5FA]' : 'bg-[#2563EB]'
              )}
            />
          </div>

          {showDescriptor && (
            <span
              className={cn(
                'font-semibold uppercase font-sans mt-0.5 select-none leading-none',
                descColor,
                sizeMap[size].desc
              )}
            >
              THE INTELLIGENT EDUCATION ECOSYSTEM
            </span>
          )}

          {showTagline && (
            <span className="text-[10px] text-slate-500 font-medium mt-1 select-none">
              One institution. One intelligent system.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
