'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import {
  createDepartmentAction,
  updateDepartmentAction,
  archiveDepartmentAction,
} from '../actions';
import { Layers, Plus, Search, Archive, Edit3, Building } from 'lucide-react';
import type { AcademicDepartmentRow, CampusRow } from '@edu-platform/database';
import type { InstitutionType } from '@edu-platform/types';
import { getAcademicTerminology } from '@edu-platform/types';

interface DepartmentClientProps {
  initialDepartments: AcademicDepartmentRow[];
  campuses: CampusRow[];
  institutionType: InstitutionType;
  canManage: boolean;
}

export function DepartmentClient({
  initialDepartments,
  campuses,
  institutionType,
  canManage,
}: DepartmentClientProps) {
  const router = useRouter();
  const terminology = getAcademicTerminology(institutionType);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<AcademicDepartmentRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    campusId: '',
  });

  const filteredDepts = initialDepartments.filter((dept) => {
    const matchesSearch =
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : dept.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await createDepartmentAction({
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        campusId: formData.campusId || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create department');
      } else {
        setIsCreateOpen(false);
        setFormData({ name: '', code: '', description: '', campusId: '' });
        router.refresh();
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await updateDepartmentAction(editingDept.id, {
        name: formData.name,
        description: formData.description || undefined,
        campusId: formData.campusId || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update department');
      } else {
        setEditingDept(null);
        router.refresh();
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this entry? It will be deactivated from active selection.')) {
      return;
    }

    try {
      const res = await archiveDepartmentAction(id);
      if (!res.success) {
        alert(res.error || 'Failed to archive');
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while archiving');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${terminology.departmentTitle.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div className="w-36">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active Only' },
                { value: 'archived', label: 'Archived' },
                { value: 'all', label: 'All Statuses' },
              ]}
            />
          </div>
        </div>

        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              setFormData({ name: '', code: '', description: '', campusId: '' });
              setFormError(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add {terminology.departmentTitle.split(' ')[0]}
          </Button>
        )}
      </div>

      {/* Grid of Departments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDepts.length > 0 ? (
          filteredDepts.map((dept) => {
            const campus = campuses.find((c) => c.id === dept.campus_id);

            return (
              <Card key={dept.id} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    {dept.status === 'active' ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="outline">Archived</Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{dept.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Code: {dept.code}</p>

                  {dept.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{dept.description}</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" /> Campus:
                      </span>
                      <span className="font-medium text-slate-700">
                        {campus ? campus.name : 'All Campuses'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">ID: {dept.id.slice(0, 8)}</span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDept(dept);
                          setFormData({
                            name: dept.name,
                            code: dept.code,
                            description: dept.description || '',
                            campusId: dept.campus_id || '',
                          });
                          setFormError(null);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {dept.status === 'active' && (
                        <button
                          onClick={() => handleArchive(dept.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">
              No {terminology.departmentTitle} Found
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No items match your search filter.'
                : `No ${terminology.departmentTitle.toLowerCase()} registered yet. Add one to structure your academic programs.`}
            </p>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={`Add ${terminology.departmentTitle.split(' ')[0]}`}
        description={`Register a new ${terminology.departmentTitle.toLowerCase()} unit.`}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Name"
            placeholder={`e.g. ${
              institutionType === 'school'
                ? 'Senior Secondary Wing'
                : institutionType === 'junior_college'
                ? 'Science Stream'
                : 'Computer Science & Engineering'
            }`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Code"
            placeholder="e.g. CSE, SCI, HIGH_SCH"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
          />

          {campuses.length > 0 && (
            <Select
              label="Assigned Campus (Optional)"
              value={formData.campusId}
              onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
              options={[
                { value: '', label: 'All Campuses (Universal)' },
                ...campuses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Description (Optional)</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Short description of this department..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Create {terminology.departmentTitle.split(' ')[0]}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingDept}
        onClose={() => setEditingDept(null)}
        title={`Edit ${editingDept?.name}`}
        description="Update details for this entry."
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input label="Code" value={formData.code} disabled />

          {campuses.length > 0 && (
            <Select
              label="Campus"
              value={formData.campusId}
              onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
              options={[
                { value: '', label: 'All Campuses (Universal)' },
                ...campuses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingDept(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
