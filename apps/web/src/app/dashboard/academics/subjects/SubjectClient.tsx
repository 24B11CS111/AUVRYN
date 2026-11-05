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
  createSubjectAction,
  updateSubjectAction,
  archiveSubjectAction,
} from '../actions';
import { BookOpen, Plus, Search, Archive, Edit3, Award, Layers } from 'lucide-react';
import type { AcademicSubjectRow, AcademicDepartmentRow } from '@edu-platform/database';
import type { InstitutionType, SubjectCategoryType } from '@edu-platform/types';
import { getAcademicTerminology } from '@edu-platform/types';

interface SubjectClientProps {
  initialSubjects: AcademicSubjectRow[];
  departments: AcademicDepartmentRow[];
  institutionType: InstitutionType;
  canManage: boolean;
}

export function SubjectClient({
  initialSubjects,
  departments,
  institutionType,
  canManage,
}: SubjectClientProps) {
  const router = useRouter();
  const terminology = getAcademicTerminology(institutionType);

  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AcademicSubjectRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    departmentId: '',
    subjectType: 'theory' as SubjectCategoryType,
    creditHours: 3.0,
    description: '',
  });

  const filteredSubjects = initialSubjects.filter((subj) => {
    const matchesSearch =
      subj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subj.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDeptId === 'all' || subj.department_id === selectedDeptId;
    const matchesType = selectedType === 'all' || subj.subject_type === selectedType;
    const matchesStatus = statusFilter === 'all' || subj.status === statusFilter;

    return matchesSearch && matchesDept && matchesType && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await createSubjectAction({
        name: formData.name,
        code: formData.code,
        departmentId: formData.departmentId || undefined,
        subjectType: formData.subjectType,
        creditHours: Number(formData.creditHours),
        description: formData.description || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create subject');
      } else {
        setIsCreateOpen(false);
        setFormData({
          name: '',
          code: '',
          departmentId: '',
          subjectType: 'theory',
          creditHours: 3.0,
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
    if (!editingSubject) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await updateSubjectAction(editingSubject.id, {
        name: formData.name,
        departmentId: formData.departmentId || undefined,
        subjectType: formData.subjectType,
        creditHours: Number(formData.creditHours),
        description: formData.description || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update subject');
      } else {
        setEditingSubject(null);
        router.refresh();
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this subject? Historical records will be retained.')) {
      return;
    }

    try {
      const res = await archiveSubjectAction(id);
      if (!res.success) {
        alert(res.error || 'Failed to archive');
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while archiving');
    }
  };

  const getSubjectTypeBadge = (type: string) => {
    switch (type) {
      case 'theory':
        return <Badge variant="default">Theory</Badge>;
      case 'lab':
      case 'practical':
        return <Badge variant="success">Lab / Practical</Badge>;
      case 'elective':
        return <Badge variant="outline">Elective</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
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
              placeholder={`Search ${terminology.subjectTitle.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {departments.length > 0 && (
            <div className="w-44">
              <Select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                options={[
                  { value: 'all', label: `All ${terminology.departmentTitle}` },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
          )}

          <div className="w-36">
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'theory', label: 'Theory' },
                { value: 'lab', label: 'Lab' },
                { value: 'practical', label: 'Practical' },
                { value: 'elective', label: 'Elective' },
                { value: 'project', label: 'Project' },
                { value: 'vocational', label: 'Vocational' },
              ]}
            />
          </div>

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
                subjectType: 'theory',
                creditHours: 3.0,
                description: '',
              });
              setFormError(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add {terminology.subjectTitle.split(' ')[0]}
          </Button>
        )}
      </div>

      {/* Grid of Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.length > 0 ? (
          filteredSubjects.map((subj) => {
            const dept = departments.find((d) => d.id === subj.department_id);

            return (
              <Card key={subj.id} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getSubjectTypeBadge(subj.subject_type)}
                      {subj.status === 'archived' && <Badge variant="outline">Archived</Badge>}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{subj.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Code: {subj.code}</p>

                  {subj.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{subj.description}</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> Department:
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {dept ? dept.name : 'General / Interdisciplinary'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> Credits / Weight:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {subj.credit_hours} Credits
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">ID: {subj.id.slice(0, 8)}</span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingSubject(subj);
                          setFormData({
                            name: subj.name,
                            code: subj.code,
                            departmentId: subj.department_id || '',
                            subjectType: subj.subject_type,
                            creditHours: Number(subj.credit_hours),
                            description: subj.description || '',
                          });
                          setFormError(null);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {subj.status === 'active' && (
                        <button
                          onClick={() => handleArchive(subj.id)}
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
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">
              No {terminology.subjectTitle} Found
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No subjects match your search or filter options.'
                : `No ${terminology.subjectTitle.toLowerCase()} registered in the course catalog yet. Add subjects to assign faculty and offerings.`}
            </p>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={`Add ${terminology.subjectTitle.split(' ')[0]}`}
        description="Register a course, subject, or practical lab in the academic catalog."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Subject Name"
            placeholder="e.g. Data Structures & Algorithms, Physics I, English Literature"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Subject Code"
            placeholder="e.g. CS201, PHY101, ENG01"
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
                { value: '', label: 'General / Interdisciplinary' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Subject Category"
              value={formData.subjectType}
              onChange={(e) =>
                setFormData({ ...formData, subjectType: e.target.value as SubjectCategoryType })
              }
              options={[
                { value: 'theory', label: 'Theory' },
                { value: 'lab', label: 'Laboratory' },
                { value: 'practical', label: 'Practical' },
                { value: 'elective', label: 'Elective' },
                { value: 'vocational', label: 'Vocational' },
                { value: 'project', label: 'Project / Thesis' },
              ]}
            />

            <Input
              type="number"
              step="0.5"
              min={0}
              max={20}
              label="Credits / Credit Hours"
              value={formData.creditHours}
              onChange={(e) =>
                setFormData({ ...formData, creditHours: parseFloat(e.target.value) || 0 })
              }
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Course Syllabus / Notes</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Overview of syllabus, modules, or prerequisites..."
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
              Create {terminology.subjectTitle.split(' ')[0]}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingSubject}
        onClose={() => setEditingSubject(null)}
        title={`Edit ${editingSubject?.name}`}
        description="Update subject definition."
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Subject Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input label="Subject Code" value={formData.code} disabled />

          {departments.length > 0 && (
            <Select
              label={terminology.departmentTitle}
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              options={[
                { value: '', label: 'General / Interdisciplinary' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Subject Category"
              value={formData.subjectType}
              onChange={(e) =>
                setFormData({ ...formData, subjectType: e.target.value as SubjectCategoryType })
              }
              options={[
                { value: 'theory', label: 'Theory' },
                { value: 'lab', label: 'Laboratory' },
                { value: 'practical', label: 'Practical' },
                { value: 'elective', label: 'Elective' },
                { value: 'vocational', label: 'Vocational' },
                { value: 'project', label: 'Project / Thesis' },
              ]}
            />

            <Input
              type="number"
              step="0.5"
              min={0}
              max={20}
              label="Credit Hours"
              value={formData.creditHours}
              onChange={(e) =>
                setFormData({ ...formData, creditHours: parseFloat(e.target.value) || 0 })
              }
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingSubject(null)}
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
