import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import type { AcademicYearRow } from '@edu-platform/database';

export default async function AcademicsPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;

  const { data } = await supabase
    .from('academic_years')
    .select('*')
    .eq('institution_id', institution.id)
    .order('start_date', { ascending: false });

  const academicYears = data as unknown as AcademicYearRow[] | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Academic Calendar & Sessions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage academic years, terms, and session windows for {institution.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {academicYears && academicYears.length > 0 ? (
          academicYears.map((ay) => (
            <Card key={ay.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  {ay.is_current ? (
                    <Badge variant="success">Current Active Session</Badge>
                  ) : (
                    <Badge variant="default">Past Session</Badge>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-base">{ay.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Code: {ay.code}</p>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Term System:</span>
                    <span className="font-semibold text-slate-800 capitalize">{ay.term_system}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Start Date:</span>
                    <span className="font-semibold text-slate-800">{formatDate(ay.start_date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">End Date:</span>
                    <span className="font-semibold text-slate-800">{formatDate(ay.end_date)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Recorded {formatDate(ay.created_at)}</span>
                <span className="font-mono">ID: {ay.id.slice(0, 8)}</span>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500">
            No academic years recorded.
          </div>
        )}
      </div>
    </div>
  );
}
