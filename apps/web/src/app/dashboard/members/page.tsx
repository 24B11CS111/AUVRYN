import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { Mail, CheckCircle } from 'lucide-react';

export default async function MembersPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;

  const { data: members } = await supabase
    .from('institution_memberships')
    .select(`
      id,
      institution_id,
      user_id,
      role,
      status,
      title,
      department,
      joined_at,
      profiles:user_id (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('institution_id', institution.id)
    .order('joined_at', { ascending: false });

  const roleBadgeVariant: Record<string, 'purple' | 'success' | 'info' | 'warning' | 'default'> = {
    owner: 'purple',
    admin: 'info',
    academic_admin: 'warning',
    faculty: 'success',
    staff: 'default',
    student: 'default',
    parent: 'default',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Members & Roles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorized administrators, academic heads, faculty, staff, and students
          </p>
        </div>
      </div>

      <Card className="overflow-hidden p-0 border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Department / Title</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members && members.length > 0 ? (
                members.map((member: any) => {
                  const prof = member.profiles;
                  const fullName = prof?.full_name || 'Member';
                  const email = prof?.email || 'Unknown';
                  const isCurrentUser = member.user_id === session.user.id;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span>{fullName}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={roleBadgeVariant[member.role] || 'default'}>
                          {member.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {member.title || member.department ? (
                          <div>
                            <div className="font-medium text-slate-900">{member.title || '—'}</div>
                            <div className="text-[11px] text-slate-400">{member.department || '—'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="capitalize font-medium">{member.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(member.joined_at)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No members found.
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
