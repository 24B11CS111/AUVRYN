'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import {
  createFacultyAllocationAction,
  deleteFacultyAllocationAction,
} from '../../actions';
import {
  ArrowLeft,
  GraduationCap,
  Plus,
  Trash2,
  Calendar,
  School,
} from 'lucide-react';
import type {
  StaffProfileRow,
  FacultyAllocationRow,
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
  AcademicSectionRow,
  AcademicSubjectRow,
} from '@edu-platform/database';

interface AllocationWithRelations extends FacultyAllocationRow {
  academic_year?: AcademicYearRow;
  program?: AcademicProgramRow;
  class?: AcademicClassRow | null;
  section?: AcademicSectionRow | null;
  subject?: AcademicSubjectRow | null;
}

interface FacultyAssignmentsClientProps {
  staff: StaffProfileRow;
  allocations: AllocationWithRelations[];
  years: AcademicYearRow[];
  programs: AcademicProgramRow[];
  classes: AcademicClassRow[];
  sections: AcademicSectionRow[];
  subjects: AcademicSubjectRow[];
  canManage: boolean;
}

export function FacultyAssignmentsClient({
  staff,
  allocations,
  years,
  programs,
  classes,
  sections,
  subjects,
  canManage,
}: FacultyAssignmentsClientProps) {
  const router = useRouter();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    academicYearId: years[0]?.id || '',
    programId: programs[0]?.id || '',
    classId: '',
    sectionId: '',
    subjectId: '',
    isClassTeacher: false,
    isCoordinator: false,
  });

  // Dependent cascading options
  const availableClasses = classes.filter((c) =>
    formData.programId ? c.program_id === formData.programId : true
  );

  const availableSections = sections.filter((s) =>
    formData.classId ? s.class_id === formData.classId : true
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await createFacultyAllocationAction({
        staffId: staff.id,
        academicYearId: formData.academicYearId,
        programId: formData.programId,
        classId: formData.classId || undefined,
        sectionId: formData.sectionId || undefined,
        subjectId: formData.subjectId || undefined,
        isClassTeacher: formData.isClassTeacher,
        isCoordinator: formData.isCoordinator,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to allocate faculty.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Academic allocation successfully recorded.');
      setIsAddModalOpen(false);
      setFormData({
        academicYearId: years[0]?.id || '',
        programId: programs[0]?.id || '',
        classId: '',
        sectionId: '',
        subjectId: '',
        isClassTeacher: false,
        isCoordinator: false,
      });
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (allocationId: string) => {
    if (!confirm('Are you sure you want to remove this academic assignment?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await deleteFacultyAllocationAction(allocationId, staff.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to remove allocation.');
        return;
      }
      setSuccessMsg('Academic assignment removed.');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/staff/${staff.id}`}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Staff Profile
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Faculty Academic Allocations
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Subject offerings, class teachers, and coordinator roles for <span className="font-semibold text-slate-900">{staff.first_name} {staff.last_name}</span> ({staff.employee_id}).
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Academic Allocation
          </Button>
        )}
      </div>

      {errorMsg && (
        <Alert variant="error">
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success">
          {successMsg}
        </Alert>
      )}

      {/* Allocations Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4">Program & Class</th>
                <th className="py-3 px-4">Section / Cohort</th>
                <th className="py-3 px-4">Allocated Subject</th>
                <th className="py-3 px-4">Roles & Responsibilities</th>
                <th className="py-3 px-4">Status</th>
                {canManage && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {allocations.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {alloc.academic_year?.name || 'Academic Session'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">
                      {alloc.program?.name || 'General Program'}
                    </div>
                    {alloc.class && (
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <School className="w-3 h-3 text-slate-400" />
                        Class: {alloc.class.name}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono">
                    {alloc.section ? `Section ${alloc.section.name}` : 'All Sections'}
                  </td>
                  <td className="py-3.5 px-4">
                    {alloc.subject ? (
                      <div>
                        <span className="font-medium text-slate-800">{alloc.subject.name}</span>
                        <span className="text-xs text-slate-500 block font-mono">Code: {alloc.subject.code}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No specific subject (General Role)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {alloc.is_class_teacher && (
                        <Badge variant="purple">Class Teacher</Badge>
                      )}
                      {alloc.is_coordinator && (
                        <Badge variant="info">Coordinator</Badge>
                      )}
                      {!alloc.is_class_teacher && !alloc.is_coordinator && (
                        <Badge variant="default">Subject Faculty</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={alloc.status === 'active' ? 'success' : 'outline'}>
                      {alloc.status}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(alloc.id)}
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}

              {allocations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium">No faculty allocations recorded</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Assign this faculty member to teach specific subjects, mentor sections as Class Teacher, or coordinate classes.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Allocation Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Assign Faculty Academic Allocation"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Select
            label="Academic Year *"
            value={formData.academicYearId}
            onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
            options={years.map((y) => ({ value: y.id, label: y.name }))}
            required
          />

          <Select
            label="Academic Program *"
            value={formData.programId}
            onChange={(e) => setFormData({ ...formData, programId: e.target.value, classId: '', sectionId: '' })}
            options={programs.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Class / Grade (Optional)"
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value, sectionId: '' })}
              options={[
                { value: '', label: 'Select Class' },
                ...availableClasses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            <Select
              label="Section (Optional)"
              value={formData.sectionId}
              onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
              options={[
                { value: '', label: 'All / Unspecified Section' },
                ...availableSections.map((s) => ({ value: s.id, label: `Section ${s.name}` })),
              ]}
            />
          </div>

          <Select
            label="Subject (Optional if purely Class Teacher/Coordinator role)"
            value={formData.subjectId}
            onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
            options={[
              { value: '', label: 'No specific subject (Role Assignment)' },
              ...subjects.map((sub) => ({ value: sub.id, label: `${sub.name} (${sub.code})` })),
            ]}
          />

          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isClassTeacher}
                onChange={(e) => setFormData({ ...formData, isClassTeacher: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-800">Assign as Official Class Teacher / Mentor</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isCoordinator}
                onChange={(e) => setFormData({ ...formData, isCoordinator: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-800">Assign as Academic Program / Cohort Coordinator</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.academicYearId || !formData.programId}
            >
              {isSubmitting ? 'Allocating...' : 'Confirm Allocation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
