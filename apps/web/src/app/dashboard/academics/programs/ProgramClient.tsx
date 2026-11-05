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
  createProgramAction,
  updateProgramAction,
  archiveProgramAction,
} from '../actions';
import { GraduationCap, Plus, Search, Archive, Edit3, Clock, Layers } from 'lucide-react';
import type { AcademicProgramRow, AcademicDepartmentRow } from '@edu-platform/database';
import type { InstitutionType, AcademicLevelType } from '@edu-platform/types';
import { getAcademicTerminology } from '@edu-platform/types';

interface ProgramClientProps {
  initialPrograms: AcademicProgramRow[];
  departments: AcademicDepartmentRow[];
  institutionType: InstitutionType;
  canManage: boolean;
}

export function ProgramClient({
  initialPrograms,
  departments,
  institutionType,
  canManage,
}: ProgramClientProps) {
  const router = useRouter();
  const terminology = getAcademicTerminology(institutionType);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProg, setEditingProg] = useState<AcademicProgramRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const defaultLevel =
    institutionType === 'school'
      ? 'secondary'
      : institutionType === 'junior_college'
      ? 'higher_secondary'
      : 'undergraduate';

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    departmentId: '',
    level: defaultLevel as AcademicLevelType,
    durationYears: 4,
    termSystem: 'semester' as 'semester' | 'trimester' | 'annual',
    totalTerms: 8,
    description: '',
  });

  const filteredPrograms = initialPrograms.filter((prog) => {
    const matchesSearch =
      prog.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prog.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'all' || prog.department_id === selectedDept;
    const matchesStatus = statusFilter === 'all' || prog.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await createProgramAction({
        name: formData.name,
        code: formData.code,
        departmentId: formData.departmentId || undefined,
        level: formData.level,
        durationYears: Number(formData.durationYears),
        termSystem: formData.termSystem,
        totalTerms: Number(formData.totalTerms),
        description: formData.description || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create program');
      } else {
        setIsCreateOpen(false);
        setFormData({
          name: '',
          code: '',
          departmentId: '',
          level: defaultLevel as AcademicLevelType,
          durationYears: 4,
          termSystem: 'semester',
          totalTerms: 8,
          description: '',
        });
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
    if (!editingProg) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await updateProgramAction(editingProg.id, {
        name: formData.name,
        departmentId: formData.departmentId || undefined,
        level: formData.level,
        durationYears: Number(formData.durationYears),
        termSystem: formData.termSystem,
        totalTerms: Number(formData.totalTerms),
        description: formData.description || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update program');
      } else {
        setEditingProg(null);
        router.refresh();
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this program? Active classes will not be deleted.')) {
      return;
    }

    try {
      const res = await archiveProgramAction(id);
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
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${terminology.programTitle.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {departments.length > 0 && (
            <div className="w-44">
              <Select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                options={[
                  { value: 'all', label: `All ${terminology.departmentTitle}` },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
          )}

          <div className="w-32">
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
              setFormData({
                name: '',
                code: '',
                departmentId: departments[0]?.id || '',
                level: defaultLevel as AcademicLevelType,
                durationYears: institutionType === 'junior_college' ? 2 : 4,
                termSystem: institutionType === 'school' ? 'annual' : 'semester',
                totalTerms: institutionType === 'junior_college' ? 2 : 8,
                description: '',
              });
              setFormError(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add {terminology.programTitle.split(' ')[0]}
          </Button>
        )}
      </div>

      {/* Grid of Programs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrograms.length > 0 ? (
          filteredPrograms.map((prog) => {
            const dept = departments.find((d) => d.id === prog.department_id);

            return (
              <Card key={prog.id} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    {prog.status === 'active' ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="outline">Archived</Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{prog.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Code: {prog.code}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> {terminology.departmentTitle.split(' ')[0]}:
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {dept ? dept.name : 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Duration & Terms:
                      </span>
                      <span className="font-medium text-slate-700">
                        {prog.duration_years} yr ({prog.total_terms} {prog.term_system}s)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Level:</span>
                      <span className="font-medium text-slate-700 capitalize">
                        {prog.level.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">ID: {prog.id.slice(0, 8)}</span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingProg(prog);
                          setFormData({
                            name: prog.name,
                            code: prog.code,
                            departmentId: prog.department_id || '',
                            level: prog.level,
                            durationYears: prog.duration_years,
                            termSystem: prog.term_system,
                            totalTerms: prog.total_terms,
                            description: prog.description || '',
                          });
                          setFormError(null);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {prog.status === 'active' && (
                        <button
                          onClick={() => handleArchive(prog.id)}
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
            <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">
              No {terminology.programTitle} Found
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No items match your filter criteria.'
                : `No ${terminology.programTitle.toLowerCase()} configured yet. Add one to start defining student classes.`}
            </p>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={`Add ${terminology.programTitle.split(' ')[0]}`}
        description={`Configure a new curriculum or degree program.`}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Program Name"
            placeholder="e.g. Bachelor of Technology in Computer Science"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Program Code"
            placeholder="e.g. BTECH-CSE, MPC-INT"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
          />

          {departments.length > 0 && (
            <Select
              label={terminology.departmentTitle}
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              options={[
                { value: '', label: 'None (Standalone Program)' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Academic Level"
              value={formData.level}
              onChange={(e) =>
                setFormData({ ...formData, level: e.target.value as AcademicLevelType })
              }
              options={[
                { value: 'primary', label: 'Primary (K-5)' },
                { value: 'middle_school', label: 'Middle School (6-8)' },
                { value: 'secondary', label: 'Secondary (9-10)' },
                { value: 'higher_secondary', label: 'Higher Secondary (11-12 / +2)' },
                { value: 'diploma', label: 'Diploma / Polytechnic' },
                { value: 'undergraduate', label: 'Undergraduate Degree (Bachelor)' },
                { value: 'postgraduate', label: 'Postgraduate Degree (Master)' },
                { value: 'doctoral', label: 'Doctoral (PhD)' },
              ]}
            />

            <Select
              label="Term System"
              value={formData.termSystem}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  termSystem: e.target.value as 'annual' | 'semester' | 'trimester',
                })
              }
              options={[
                { value: 'annual', label: 'Annual' },
                { value: 'semester', label: 'Semester' },
                { value: 'trimester', label: 'Trimester' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Duration (Years)"
              min={1}
              max={10}
              value={formData.durationYears}
              onChange={(e) =>
                setFormData({ ...formData, durationYears: parseInt(e.target.value, 10) || 1 })
              }
              required
            />
            <Input
              type="number"
              label="Total Terms"
              min={1}
              max={20}
              value={formData.totalTerms}
              onChange={(e) =>
                setFormData({ ...formData, totalTerms: parseInt(e.target.value, 10) || 1 })
              }
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Description (Optional)</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Outline objectives, specializations..."
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
              Create Program
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingProg}
        onClose={() => setEditingProg(null)}
        title={`Edit ${editingProg?.name}`}
        description="Update program configuration."
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Program Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input label="Program Code" value={formData.code} disabled />

          {departments.length > 0 && (
            <Select
              label={terminology.departmentTitle}
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              options={[
                { value: '', label: 'None (Standalone Program)' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Academic Level"
              value={formData.level}
              onChange={(e) =>
                setFormData({ ...formData, level: e.target.value as AcademicLevelType })
              }
              options={[
                { value: 'primary', label: 'Primary (K-5)' },
                { value: 'middle_school', label: 'Middle School (6-8)' },
                { value: 'secondary', label: 'Secondary (9-10)' },
                { value: 'higher_secondary', label: 'Higher Secondary (11-12 / +2)' },
                { value: 'diploma', label: 'Diploma / Polytechnic' },
                { value: 'undergraduate', label: 'Undergraduate Degree' },
                { value: 'postgraduate', label: 'Postgraduate Degree' },
                { value: 'doctoral', label: 'Doctoral (PhD)' },
              ]}
            />

            <Select
              label="Term System"
              value={formData.termSystem}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  termSystem: e.target.value as 'annual' | 'semester' | 'trimester',
                })
              }
              options={[
                { value: 'annual', label: 'Annual' },
                { value: 'semester', label: 'Semester' },
                { value: 'trimester', label: 'Trimester' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingProg(null)}
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
