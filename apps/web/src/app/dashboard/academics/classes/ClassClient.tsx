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
  createClassAction,
  updateClassAction,
  archiveClassAction,
} from '../actions';
import { BookmarkCheck, Plus, Search, Archive, Edit3, Calendar, GraduationCap } from 'lucide-react';
import type {
  AcademicClassRow,
  AcademicProgramRow,
  AcademicYearRow,
  CampusRow,
} from '@edu-platform/database';
import type { InstitutionType } from '@edu-platform/types';
import { getAcademicTerminology } from '@edu-platform/types';

interface ClassClientProps {
  initialClasses: AcademicClassRow[];
  programs: AcademicProgramRow[];
  academicYears: AcademicYearRow[];
  campuses: CampusRow[];
  institutionType: InstitutionType;
  canManage: boolean;
}

export function ClassClient({
  initialClasses,
  programs,
  academicYears,
  campuses,
  institutionType,
  canManage,
}: ClassClientProps) {
  const router = useRouter();
  const terminology = getAcademicTerminology(institutionType);

  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];
  const [selectedYearId, setSelectedYearId] = useState<string>(currentYear?.id || 'all');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<AcademicClassRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    programId: programs[0]?.id || '',
    academicYearId: currentYear?.id || '',
    campusId: '',
    levelNumber: 1,
  });

  const filteredClasses = initialClasses.filter((cls) => {
    const matchesSearch =
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesYear = selectedYearId === 'all' || cls.academic_year_id === selectedYearId;
    const matchesProgram = selectedProgramId === 'all' || cls.program_id === selectedProgramId;
    const matchesStatus = statusFilter === 'all' || cls.status === statusFilter;

    return matchesSearch && matchesYear && matchesProgram && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await createClassAction({
        name: formData.name,
        code: formData.code,
        programId: formData.programId,
        academicYearId: formData.academicYearId,
        campusId: formData.campusId || undefined,
        levelNumber: Number(formData.levelNumber),
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create class');
      } else {
        setIsCreateOpen(false);
        setFormData({
          name: '',
          code: '',
          programId: programs[0]?.id || '',
          academicYearId: currentYear?.id || '',
          campusId: '',
          levelNumber: 1,
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
    if (!editingClass) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await updateClassAction(editingClass.id, {
        name: formData.name,
        campusId: formData.campusId || undefined,
        levelNumber: Number(formData.levelNumber),
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update class');
      } else {
        setEditingClass(null);
        router.refresh();
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this class? Sections and past records will be preserved.')) {
      return;
    }

    try {
      const res = await archiveClassAction(id);
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
              placeholder={`Search ${terminology.classTitle.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div className="w-48">
            <Select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              options={[
                { value: 'all', label: 'All Academic Sessions' },
                ...academicYears.map((y) => ({
                  value: y.id,
                  label: `${y.name} ${y.is_current ? '(Current)' : ''}`,
                })),
              ]}
            />
          </div>

          {programs.length > 0 && (
            <div className="w-44">
              <Select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                options={[
                  { value: 'all', label: `All ${terminology.programTitle}` },
                  ...programs.map((p) => ({ value: p.id, label: p.name })),
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
                programId: programs[0]?.id || '',
                academicYearId: currentYear?.id || academicYears[0]?.id || '',
                campusId: '',
                levelNumber: 1,
              });
              setFormError(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add {terminology.classTitle.split(' ')[0]}
          </Button>
        )}
      </div>

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((cls) => {
            const prog = programs.find((p) => p.id === cls.program_id);
            const year = academicYears.find((y) => y.id === cls.academic_year_id);

            return (
              <Card key={cls.id} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                      <BookmarkCheck className="w-5 h-5" />
                    </div>
                    {cls.status === 'active' ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="outline">Archived</Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{cls.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Code: {cls.code}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" /> Program:
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {prog ? prog.name : 'Unknown Program'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Session:
                      </span>
                      <span className="font-medium text-slate-700">
                        {year ? year.code : 'Unknown Session'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Level / Grade Rank:</span>
                      <span className="font-medium text-slate-700">Level {cls.level_number}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">ID: {cls.id.slice(0, 8)}</span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingClass(cls);
                          setFormData({
                            name: cls.name,
                            code: cls.code,
                            programId: cls.program_id,
                            academicYearId: cls.academic_year_id,
                            campusId: cls.campus_id || '',
                            levelNumber: cls.level_number,
                          });
                          setFormError(null);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {cls.status === 'active' && (
                        <button
                          onClick={() => handleArchive(cls.id)}
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
            <BookmarkCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">
              No {terminology.classTitle} Found
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No items match your filter criteria.'
                : `No ${terminology.classTitle.toLowerCase()} created for this session yet. Create a class/batch to divide into sections.`}
            </p>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={`Add ${terminology.classTitle.split(' ')[0]}`}
        description="Create an academic class cohort tied to an academic session."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Class / Batch Name"
            placeholder={
              institutionType === 'school'
                ? 'e.g. Grade 10'
                : institutionType === 'junior_college'
                ? 'e.g. 1st Year Intermediate'
                : 'e.g. B.Tech CSE 2024-28 Batch'
            }
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Code"
            placeholder="e.g. G10-2026, 1YR-MPC, CSE24"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
          />

          <Select
            label="Academic Year Session"
            value={formData.academicYearId}
            onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
            options={academicYears.map((y) => ({
              value: y.id,
              label: `${y.name} (${y.code}) ${y.is_current ? '• Current' : ''}`,
            }))}
            required
          />

          <Select
            label="Curriculum / Program Track"
            value={formData.programId}
            onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
            options={programs.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.code})`,
            }))}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Level / Year Number"
              min={1}
              max={20}
              value={formData.levelNumber}
              onChange={(e) =>
                setFormData({ ...formData, levelNumber: parseInt(e.target.value, 10) || 1 })
              }
              required
            />

            {campuses.length > 0 && (
              <Select
                label="Campus (Optional)"
                value={formData.campusId}
                onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                options={[
                  { value: '', label: 'All Campuses' },
                  ...campuses.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            )}
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
              Create {terminology.classTitle.split(' ')[0]}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingClass}
        onClose={() => setEditingClass(null)}
        title={`Edit ${editingClass?.name}`}
        description="Update class configuration."
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Class Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input label="Class Code" value={formData.code} disabled />

          <Input
            type="number"
            label="Level Number"
            min={1}
            max={20}
            value={formData.levelNumber}
            onChange={(e) =>
              setFormData({ ...formData, levelNumber: parseInt(e.target.value, 10) || 1 })
            }
            required
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingClass(null)}
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
