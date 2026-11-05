'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { createGuardianAction, linkGuardianAction } from '../../actions';
import { ArrowLeft, UserPlus, Users, Phone, Mail, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { StudentRow, GuardianRow, StudentGuardianRow } from '@edu-platform/database';

interface GuardianWithLink extends GuardianRow {
  link: StudentGuardianRow;
}

interface GuardianManagerClientProps {
  student: StudentRow;
  guardians: GuardianWithLink[];
  allInstitutionGuardians: GuardianRow[];
  canManage: boolean;
}

export function GuardianManagerClient({
  student,
  guardians,
  allInstitutionGuardians,
  canManage,
}: GuardianManagerClientProps) {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'linkExisting'>('create');

  const [createData, setCreateData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    relationship: 'Mother',
    occupation: '',
    isPrimary: guardians.length === 0,
    isEmergencyContact: true,
    canPickup: true,
  });

  const [existingData, setExistingData] = useState({
    guardianId: allInstitutionGuardians[0]?.id || '',
    relationship: 'Father',
    isPrimary: false,
    isEmergencyContact: false,
    canPickup: true,
  });

  const handleAddGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const guardRes = await createGuardianAction({
          firstName: createData.firstName,
          lastName: createData.lastName,
          email: createData.email || undefined,
          phone: createData.phone,
          relationshipDefault: createData.relationship,
          occupation: createData.occupation || undefined,
        });

        if (!guardRes.success || !guardRes.data) {
          setFormError(guardRes.error || 'Failed to create guardian record.');
          setIsSubmitting(false);
          return;
        }

        const newGuardian = guardRes.data as GuardianRow;

        const linkRes = await linkGuardianAction({
          studentId: student.id,
          guardianId: newGuardian.id,
          relationship: createData.relationship,
          isPrimary: createData.isPrimary,
          isEmergencyContact: createData.isEmergencyContact,
          canPickup: createData.canPickup,
        });

        if (!linkRes.success) {
          setFormError(linkRes.error || 'Failed to link guardian to student.');
          setIsSubmitting(false);
          return;
        }
      } else {
        const linkRes = await linkGuardianAction({
          studentId: student.id,
          guardianId: existingData.guardianId,
          relationship: existingData.relationship,
          isPrimary: existingData.isPrimary,
          isEmergencyContact: existingData.isEmergencyContact,
          canPickup: existingData.canPickup,
        });

        if (!linkRes.success) {
          setFormError(linkRes.error || 'Failed to link guardian.');
          setIsSubmitting(false);
          return;
        }
      }

      setIsAddModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/students/${student.id}`}
            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Student Profile
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Parents & Guardians
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage family relations, authorized pickups, and emergency contacts for {student.first_name}{' '}
            {student.last_name} ({student.admission_number})
          </p>
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Link Parent / Guardian
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guardians.length > 0 ? (
          guardians.map((g) => (
            <Card key={g.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {g.link.is_primary && <Badge variant="success">Primary Guardian</Badge>}
                    <Badge variant="outline">{g.link.relationship}</Badge>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base">
                  {g.first_name} {g.last_name}
                </h3>
                {g.occupation && <p className="text-xs text-slate-500 mt-0.5">{g.occupation}</p>}

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{g.phone}</span>
                  </div>

                  {g.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700">{g.email}</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                    {g.link.can_pickup ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Authorized for Pickup
                      </span>
                    ) : (
                      <span className="text-slate-400">Not authorized for pickup</span>
                    )}

                    {g.link.is_emergency_contact && (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">
                        <ShieldAlert className="w-3 h-3" /> Emergency Contact
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No Guardians Linked</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              This student currently has no parents or guardians recorded. Link a guardian to authorize pickups and receive communications.
            </p>
          </div>
        )}
      </div>

      {/* Add / Link Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add or Link Guardian"
        description="Register a new guardian or link an existing parent in the institution."
      >
        <form onSubmit={handleAddGuardian} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          {allInstitutionGuardians.length > 0 && (
            <div className="flex rounded-lg bg-slate-100 p-1 mb-2">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'create' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Create New Guardian
              </button>
              <button
                type="button"
                onClick={() => setMode('linkExisting')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'linkExisting' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Link Existing Parent
              </button>
            </div>
          )}

          {mode === 'create' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="First name"
                  value={createData.firstName}
                  onChange={(e) => setCreateData({ ...createData, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="Last name"
                  value={createData.lastName}
                  onChange={(e) => setCreateData({ ...createData, lastName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 555-0199"
                  value={createData.phone}
                  onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                  required
                />
                <Input
                  label="Email (Optional)"
                  type="email"
                  placeholder="parent@example.com"
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Relationship to Student"
                  placeholder="e.g. Mother, Father, Legal Guardian"
                  value={createData.relationship}
                  onChange={(e) => setCreateData({ ...createData, relationship: e.target.value })}
                  required
                />
                <Input
                  label="Occupation (Optional)"
                  placeholder="e.g. Engineer, Doctor"
                  value={createData.occupation}
                  onChange={(e) => setCreateData({ ...createData, occupation: e.target.value })}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createData.isPrimary}
                    onChange={(e) => setCreateData({ ...createData, isPrimary: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Mark as Primary Guardian
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createData.isEmergencyContact}
                    onChange={(e) =>
                      setCreateData({ ...createData, isEmergencyContact: e.target.checked })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Emergency Contact
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createData.canPickup}
                    onChange={(e) => setCreateData({ ...createData, canPickup: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Authorized for Campus Pickup
                </label>
              </div>
            </>
          ) : (
            <>
              <Select
                label="Select Guardian"
                value={existingData.guardianId}
                onChange={(e) => setExistingData({ ...existingData, guardianId: e.target.value })}
                options={allInstitutionGuardians.map((g) => ({
                  value: g.id,
                  label: `${g.first_name} ${g.last_name} (${g.phone})`,
                }))}
                required
              />

              <Input
                label="Relationship to this Student"
                value={existingData.relationship}
                onChange={(e) => setExistingData({ ...existingData, relationship: e.target.value })}
                required
              />

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={existingData.isPrimary}
                    onChange={(e) => setExistingData({ ...existingData, isPrimary: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Mark as Primary Guardian
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={existingData.isEmergencyContact}
                    onChange={(e) =>
                      setExistingData({ ...existingData, isEmergencyContact: e.target.checked })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Emergency Contact
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={existingData.canPickup}
                    onChange={(e) => setExistingData({ ...existingData, canPickup: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Authorized for Campus Pickup
                </label>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Link Guardian
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
