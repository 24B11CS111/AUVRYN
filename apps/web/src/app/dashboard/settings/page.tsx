import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { INSTITUTION_TYPE_DEFINITIONS } from '@edu-platform/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { Globe, Mail, Phone, MapPin } from 'lucide-react';

export default async function SettingsPage() {
  const session = await requireInstitution();
  const institution = session.activeMembership!.institution!;
  const typeDef = INSTITUTION_TYPE_DEFINITIONS[institution.type];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Institution Profile & Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Identity, contact information, and tenant configuration parameters
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Institutional Identity</CardTitle>
              <CardDescription>
                Primary registration parameters and identifiers.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block mb-1">Legal Name</span>
                  <span className="font-semibold text-slate-900 text-sm">{institution.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Classification</span>
                  <Badge variant="purple">{typeDef.label}</Badge>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Code</span>
                  <span className="font-mono font-semibold text-slate-800">{institution.code}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">URL Slug</span>
                  <span className="font-mono font-semibold text-slate-800">/{institution.slug}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address & Communication</CardTitle>
              <CardDescription>Official institutional headquarters and contact details.</CardDescription>
            </CardHeader>

            <div className="space-y-3 mt-4 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>
                  {institution.address ? `${institution.address}, ` : ''}
                  {institution.city}, {institution.state}, {institution.country}
                </span>
              </div>
              {institution.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{institution.email}</span>
                </div>
              )}
              {institution.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{institution.phone}</span>
                </div>
              )}
              {institution.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>{institution.website}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant Metadata</CardTitle>
              <CardDescription>Security and database instance attributes.</CardDescription>
            </CardHeader>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Tenant UUID</span>
                <span className="font-mono text-[11px] text-slate-700 break-all">{institution.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Status</span>
                <Badge variant="success">{institution.status}</Badge>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Provisioned Date</span>
                <span className="font-medium text-slate-700">{formatDate(institution.createdAt)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
