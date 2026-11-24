'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InstitutionMembership, EducationType } from '@edu-platform/types';
import { resolveEducationType, EDUCATION_TYPE_DEFINITIONS } from '@edu-platform/types';
import { setActiveInstitutionAction } from '@/app/auth/actions';
import {
  Building2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Baby,
  GraduationCap,
  BookOpen,
  Landmark,
  Loader2,
} from 'lucide-react';

interface SelectInstitutionClientProps {
  memberships: InstitutionMembership[];
  currentActiveId: string | null;
  userName: string;
}

const EDUCATION_ICONS: Record<EducationType, React.ComponentType<{ className?: string }>> = {
  preschool: Baby,
  primary_school: GraduationCap,
  intermediate: BookOpen,
  university: Landmark,
};

export function SelectInstitutionClient({
  memberships,
  currentActiveId,
  userName,
}: SelectInstitutionClientProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelect = async (institutionId: string) => {
    setSelectedId(institutionId);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await setActiveInstitutionAction(institutionId);
      if (res.success && res.destination) {
        router.push(res.destination);
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to switch institution context');
        setIsSubmitting(false);
        setSelectedId(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network or session error');
      setIsSubmitting(false);
      setSelectedId(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-[#0B1E3F]">
          Select Institution Context
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Welcome back, <strong className="text-slate-800">{userName}</strong>. You have verified
          memberships in {memberships.length} institutions. Select the workspace you wish to enter.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium text-center">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5">
        {memberships.map((m) => {
          const inst = m.institution;
          if (!inst) return null;

          const eduType = resolveEducationType(inst);
          const eduDef = EDUCATION_TYPE_DEFINITIONS[eduType];
          const EduIcon = EDUCATION_ICONS[eduType] || Building2;
          const isCurrent = inst.id === currentActiveId;
          const isPendingThis = selectedId === inst.id;

          return (
            <button
              key={m.id}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSelect(inst.id)}
              className={`group w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 bg-white shadow-xs hover:shadow-md ${
                isCurrent
                  ? 'border-[#2563EB] ring-2 ring-[#2563EB]/15'
                  : 'border-slate-200/80 hover:border-[#2563EB]/60 hover:bg-slate-50/50'
              } ${isSubmitting && !isPendingThis ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                  style={{
                    backgroundColor: eduDef.theme.softBg,
                    color: eduDef.theme.primary,
                  }}
                >
                  <EduIcon className="w-6 h-6" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-[#0B1E3F] truncate">
                      {inst.name}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Current Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-700">Code: {inst.code}</span>
                    <span>&bull;</span>
                    <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                      Role: {m.role.replace('_', ' ')}
                    </span>
                    <span>&bull;</span>
                    <span className="text-[11px] text-slate-400">
                      {eduDef.label}
                    </span>
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                {isPendingThis ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-[#2563EB] group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-200/80 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Context switching enforces strict multi-tenant database isolation</span>
      </div>
    </div>
  );
}
