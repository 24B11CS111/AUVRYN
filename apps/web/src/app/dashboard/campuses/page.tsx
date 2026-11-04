import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { Building2, MapPin, Mail, Phone } from 'lucide-react';
import type { CampusRow } from '@edu-platform/database';

export default async function CampusesPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;

  const { data } = await supabase
    .from('campuses')
    .select('*')
    .eq('institution_id', institution.id)
    .order('is_primary', { ascending: false });

  const campuses = data as unknown as CampusRow[] | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Campuses & Locations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage central, branch, and constituent campuses under {institution.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campuses && campuses.length > 0 ? (
          campuses.map((campus) => (
            <Card key={campus.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  {campus.is_primary && (
                    <Badge variant="success">Primary Campus</Badge>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-base">{campus.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Code: {campus.code}</p>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {campus.address ? `${campus.address}, ` : ''}
                      {campus.city}, {campus.state}, {campus.country}
                    </span>
                  </div>
                  {campus.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{campus.email}</span>
                    </div>
                  )}
                  {campus.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{campus.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Created {formatDate(campus.created_at)}</span>
                <span className="font-mono">ID: {campus.id.slice(0, 8)}</span>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500">
            No campuses registered.
          </div>
        )}
      </div>
    </div>
  );
}
