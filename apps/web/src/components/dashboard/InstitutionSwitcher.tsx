'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { InstitutionMembership } from '@edu-platform/types';
import { INSTITUTION_TYPE_DEFINITIONS } from '@edu-platform/types';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';

interface InstitutionSwitcherProps {
  memberships: InstitutionMembership[];
  activeInstitutionId: string;
}

export function InstitutionSwitcher({
  memberships,
  activeInstitutionId,
}: InstitutionSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const activeMembership =
    memberships.find((m) => m.institutionId === activeInstitutionId) || memberships[0];
  const activeInstitution = activeMembership?.institution;

  const handleSelectInstitution = (institutionId: string) => {
    setIsOpen(false);
    // In a cookie-based context, set cookie or query param
    document.cookie = `active_institution_id=${institutionId}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  if (!activeInstitution) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
        <Building2 className="w-4 h-4" />
        <span>No Institution Selected</span>
      </div>
    );
  }

  const typeDef = INSTITUTION_TYPE_DEFINITIONS[activeInstitution.type];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 transition-colors text-left border border-slate-200"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {activeInstitution.name.charAt(0).toUpperCase()}
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {activeInstitution.name}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {typeDef?.label || activeInstitution.type} &bull; {activeMembership.role}
            </div>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50">
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Your Institutions
            </div>

            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {memberships.map((m) => {
                const inst = m.institution;
                if (!inst) return null;
                const isSelected = inst.id === activeInstitution.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectInstitution(inst.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-slate-50 font-semibold text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {inst.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="truncate">{inst.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {inst.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 mt-1 pt-1">
              <Link
                href="/onboarding"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium transition-colors"
              >
                <Plus className="w-4 h-4 text-slate-500" />
                <span>Register Another Institution</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
