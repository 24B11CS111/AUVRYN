import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default async function AuditPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;

  // Fetch real audit logs for this tenant
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select(`
      id,
      institution_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata,
      ip_address,
      user_agent,
      created_at,
      profiles:actor_user_id (
        id,
        email,
        full_name
      )
    `)
    .eq('institution_id', institution.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete security ledger of administrative, membership, and structure events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="purple">Tenant Scoped</Badge>
          <Badge variant="success">Read-Only Ledger</Badge>
        </div>
      </div>

      <Card className="overflow-hidden p-0 border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Target Entity</th>
                <th className="px-6 py-3.5">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((log: any) => {
                  const actor = log.profiles;
                  const actorName = actor?.full_name || 'System / Service';
                  const actorEmail = actor?.email || '';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <div className="font-medium text-slate-900">{actorName}</div>
                        {actorEmail && (
                          <div className="text-[11px] text-slate-400">{actorEmail}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="font-semibold">{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            ID: {log.entity_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
