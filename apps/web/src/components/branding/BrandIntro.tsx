'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export interface BrandIntroProps {
  onComplete?: () => void;
  durationMs?: number;
  forcePlay?: boolean;
  storageKey?: string;
  staticFallback?: boolean;
  className?: string;
}

type AnimationStage =
  | 'stage0_opening'    // 0.0 - 0.5s: White background, flowing navy wave
  | 'stage1_orbit'      // 0.5 - 1.0s: Orbital line drawing, small blue nodes
  | 'stage2_book'       // 1.0 - 1.8s: Open book sweeps form
  | 'stage3_bars'       // 1.8 - 2.4s: Rising analytics bars
  | 'stage4_cap'        // 2.4 - 3.0s: Graduation cap forms
  | 'stage5_spark'      // 3.0 - 3.5s: Orbit completes, spark appears
  | 'stage6_wordmark'   // 3.5 - 4.2s: AUVRYN wordmark reveals
  | 'stage7_tagline'    // 4.2 - 5.0s: Tagline fades in
  | 'completed';

export function BrandIntro({
  onComplete,
  durationMs = 4800,
  forcePlay = false,
  storageKey = 'auvryn_intro_seen_v1',
  staticFallback = false,
  className,
}: BrandIntroProps) {
  const [stage, setStage] = useState<AnimationStage>('stage0_opening');
  const [hasFinished, setHasFinished] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout[]>([]);

  const handleFinish = useCallback(() => {
    if (hasFinished) return;
    setHasFinished(true);
    setIsFadingOut(true);

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(storageKey, 'true');
      }
    } catch {
      // Ignore sessionStorage errors (e.g. incognito)
    }

    const t = setTimeout(() => {
      onComplete?.();
    }, 450);
    timeoutRef.current.push(t);
  }, [hasFinished, onComplete, storageKey]);

  useEffect(() => {
    // 1. Session check: if already seen in current browser session and not forcePlay, skip immediately
    if (!forcePlay && typeof window !== 'undefined') {
      try {
        const seen = window.sessionStorage.getItem(storageKey);
        if (seen === 'true') {
          onComplete?.();
          return;
        }
      } catch {}
    }

    // 2. Reduced motion check or staticFallback
    if (staticFallback || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      setStage('stage7_tagline');
      const t = setTimeout(() => {
        handleFinish();
      }, 700);
      timeoutRef.current.push(t);
      return;
    }

    // 3. Keyframe choreography based on durationMs (default 4800ms)
    const factor = durationMs / 4800;

    const schedule = [
      { s: 'stage0_opening' as AnimationStage, ms: 0 },
      { s: 'stage1_orbit' as AnimationStage, ms: Math.round(500 * factor) },
      { s: 'stage2_book' as AnimationStage, ms: Math.round(1000 * factor) },
      { s: 'stage3_bars' as AnimationStage, ms: Math.round(1800 * factor) },
      { s: 'stage4_cap' as AnimationStage, ms: Math.round(2400 * factor) },
      { s: 'stage5_spark' as AnimationStage, ms: Math.round(3000 * factor) },
      { s: 'stage6_wordmark' as AnimationStage, ms: Math.round(3500 * factor) },
      { s: 'stage7_tagline' as AnimationStage, ms: Math.round(4200 * factor) },
      { s: 'completed' as AnimationStage, ms: durationMs },
    ];

    schedule.forEach(({ s, ms }) => {
      const t = setTimeout(() => {
        if (s === 'completed') {
          handleFinish();
        } else {
          setStage(s);
        }
      }, ms);
      timeoutRef.current.push(t);
    });

    // 4. Fallback watchdog timer (never get stuck)
    const watchdog = setTimeout(() => {
      handleFinish();
    }, durationMs + 800);
    timeoutRef.current.push(watchdog);

    // 5. Keyboard listener for Escape to skip
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const timeoutsToClear = timeoutRef.current;

    return () => {
      timeoutsToClear.forEach(clearTimeout);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [durationMs, forcePlay, handleFinish, onComplete, staticFallback, storageKey]);

  if (hasFinished && !isFadingOut) {
    return null;
  }

  // Stage flags for progressive element reveals
  const showWave = true;
  const showOrbit = stage !== 'stage0_opening';
  const showBook = !['stage0_opening', 'stage1_orbit'].includes(stage);
  const showBars = !['stage0_opening', 'stage1_orbit', 'stage2_book'].includes(stage);
  const showCap = !['stage0_opening', 'stage1_orbit', 'stage2_book', 'stage3_bars'].includes(stage);
  const showSpark = ['stage5_spark', 'stage6_wordmark', 'stage7_tagline', 'completed'].includes(stage);
  const showWordmark = ['stage6_wordmark', 'stage7_tagline', 'completed'].includes(stage);
  const showTagline = ['stage7_tagline', 'completed'].includes(stage);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-500 select-none overflow-hidden',
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="AUVRYN introduction animation"
    >
      {/* Skip Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={handleFinish}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-100/80 hover:bg-slate-200/80 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          aria-label="Skip introduction animation"
        >
          <span>Skip Intro</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Animated Emblem */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-lg text-center">
        {/* SVG Hero Emblem */}
        <div className="w-36 h-36 sm:w-44 sm:h-44 relative flex items-center justify-center mb-6">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-sm"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="intro-navy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0B1E3F" />
                <stop offset="100%" stopColor="#142C4C" />
              </linearGradient>
              <linearGradient id="intro-blue-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>

            {/* Stage 1: Orbital Line and Connected Nodes */}
            <ellipse
              cx="50"
              cy="54"
              rx="44"
              ry="19"
              transform="rotate(-12 50 54)"
              stroke="#2563EB"
              strokeWidth="1.8"
              strokeDasharray="4 4"
              className={cn(
                'transition-all duration-700 ease-out origin-center',
                showOrbit ? 'opacity-50 scale-100' : 'opacity-0 scale-75'
              )}
            />
            {showOrbit && (
              <>
                <circle cx="8" cy="62" r="3" fill="#2563EB" className="animate-pulse" />
                <circle cx="92" cy="46" r="3" fill="#2563EB" className="animate-pulse" />
                <circle cx="50" cy="73" r="2.5" fill="#2563EB" opacity="0.8" />
              </>
            )}

            {/* Stage 2: Open Book Base */}
            <g
              className={cn(
                'transition-all duration-700 ease-out origin-bottom',
                showBook ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
              )}
            >
              {/* Left Wing */}
              <path
                d="M 50 78 C 37 78 21 73 14 65 C 14 54 14 42 14 42 C 22 49 37 53 50 55 Z"
                fill="url(#intro-navy-grad)"
              />
              {/* Right Wing */}
              <path
                d="M 50 78 C 63 78 79 73 86 65 C 86 54 86 42 86 42 C 78 49 63 53 50 55 Z"
                fill="#0B1E3F"
              />
              {/* Spine */}
              <line
                x1="50"
                y1="55"
                x2="50"
                y2="78"
                stroke="#E2E8F0"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>

            {/* Stage 3: Rising Analytics Bars (Staggered upward reveal) */}
            <rect
              x="36"
              y="44"
              width="5.5"
              height="15"
              rx="2.75"
              fill="url(#intro-blue-grad)"
              className={cn(
                'transition-all duration-500 ease-out origin-bottom',
                showBars ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
              )}
            />
            <rect
              x="47.25"
              y="36"
              width="5.5"
              height="23"
              rx="2.75"
              fill="#2563EB"
              style={{ transitionDelay: '120ms' }}
              className={cn(
                'transition-all duration-500 ease-out origin-bottom',
                showBars ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
              )}
            />
            <rect
              x="58.5"
              y="27"
              width="5.5"
              height="32"
              rx="2.75"
              fill="url(#intro-blue-grad)"
              style={{ transitionDelay: '240ms' }}
              className={cn(
                'transition-all duration-500 ease-out origin-bottom',
                showBars ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
              )}
            />

            {/* Stage 4: Graduation Cap (Smooth drop & landing) */}
            <g
              className={cn(
                'transition-all duration-600 ease-out origin-top',
                showCap ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-3'
              )}
            >
              <polygon
                points="50,11 74,21 50,31 26,21"
                fill="#07152B"
                stroke="#2563EB"
                strokeWidth="1.2"
              />
              <path
                d="M 37 26.5 C 37 34 63 34 63 26.5"
                fill="none"
                stroke="#07152B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 74 21 L 79 28 L 79 34"
                fill="none"
                stroke="#2563EB"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="79" cy="35" r="1.5" fill="#2563EB" />
            </g>

            {/* Stage 5: Intelligent Spark (AI & Innovation) */}
            <g
              className={cn(
                'transition-all duration-500 ease-out origin-center',
                showSpark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 rotate-45'
              )}
            >
              <path
                d="M 80 8 Q 80 14 86 14 Q 80 14 80 20 Q 80 14 74 14 Q 80 14 80 8 Z"
                fill="#2563EB"
              />
              <circle cx="80" cy="14" r="1.2" fill="#FFFFFF" />
            </g>
          </svg>
        </div>

        {/* Stage 6: Wordmark AUVRYN */}
        <div
          className={cn(
            'transition-all duration-700 ease-out',
            showWordmark
              ? 'opacity-100 transform translate-y-0'
              : 'opacity-0 transform translate-y-3'
          )}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-widest text-[#0B1E3F] font-sans">
              AUVRYN
            </h1>
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] mb-2 animate-pulse" />
          </div>
        </div>

        {/* Stage 7: Tagline & Descriptor */}
        <div
          className={cn(
            'transition-all duration-700 ease-out space-y-2',
            showTagline
              ? 'opacity-100 transform translate-y-0'
              : 'opacity-0 transform translate-y-2'
          )}
        >
          <p className="text-xs sm:text-sm font-bold tracking-widest text-[#2563EB] uppercase">
            THE INTELLIGENT EDUCATION ECOSYSTEM
          </p>
          <p className="text-xs text-slate-500 font-medium">
            One institution. One intelligent system.
          </p>
        </div>
      </div>

      {/* Stage 0: Subtle Flowing Navy Wave at the Bottom */}
      {showWave && (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none opacity-40">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-16 sm:h-24 object-cover"
          >
            <path
              d="M0,32L48,42.7C96,53,192,75,288,80C384,85,480,75,576,64C672,53,768,43,864,48C960,53,1056,75,1152,74.7C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
              fill="#0B1E3F"
              opacity="0.15"
            />
            <path
              d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
              fill="#2563EB"
              opacity="0.08"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
