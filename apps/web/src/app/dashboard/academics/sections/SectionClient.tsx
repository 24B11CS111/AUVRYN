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
  createSectionAction,
  updateSectionAction,
  archiveSectionAction,
} from '../actions';
import { Users2, Plus, Search, Archive, Edit3, UserCheck, DoorClosed, BookmarkCheck } from 'lucide-react';
import type { AcademicSectionRow, AcademicClassRow, ProfileRow } from '@edu-platform/database';
import type { InstitutionType } from '@edu-platform/types';
import { getAcademicTerminology } from '@edu-platform/types';

interface SectionClientProps {
  initialSections: AcademicSectionRow[];
  classes: AcademicClassRow[];
  teachers: ProfileRow[];
  institutionType: InstitutionType;
  canManage: boolean;
}

export function SectionClient({
  initialSections,
  classes,
  teachers,
  institutionType,
  canManage,
}: SectionClientProps) {
  const router = useRouter();
  const terminology = getAcademicTerminology(institutionType);

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<AcademicSectionRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    classId: classes[0]?.id || '',
    name: '',
    code: '',
    capacity: 40,
    roomNumber: '',
    classTeacherProfileId: '',
  });

  const filteredSections = initialSections.filter((sec) => {
    const matchesSearch =
      sec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sec.room_number && sec.room_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesClass = selectedClassId === 'all' || sec.class_id === selectedClassId;
    const matchesStatus = statusFilter === 'all' || sec.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await createSectionAction({
        classId: formData.classId,
        name: formData.name,
        code: formData.code,
        capacity: Number(formData.capacity),
        roomNumber: formData.roomNumber || undefined,
        classTeacherProfileId: formData.classTeacherProfileId || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create section');
      } else {
        setIsCreateOpen(false);
        setFormData({
          classId: classes[0]?.id || '',
          name: '',
          code: '',
          capacity: 40,
          roomNumber: '',
          classTeacherProfileId: '',
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
    if (!editingSection) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await updateSectionAction(editingSection.id, {
        name: formData.name,
        capacity: Number(formData.capacity),
        roomNumber: formData.roomNumber || undefined,
        classTeacherProfileId: formData.classTeacherProfileId || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update section');
      } else {
        setEditingSection(null);
        router.refresh();
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this section? Historical associations will be preserved.')) {
      return;
    }

    try {
      const res = await archiveSectionAction(id);
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
              placeholder={`Search ${terminology.sectionTitle.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {classes.length > 0 && (
            <div className="w-48">
              <Select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                options={[
                  { value: 'all', label: `All ${terminology.classTitle}` },
                  ...classes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
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
                classId: classes[0]?.id || '',
                name: '',
                code: '',
                capacity: 40,
                roomNumber: '',
                classTeacherProfileId: '',
              });
              setFormError(null);
              setIsCreateOpen(true);
            }}
            disabled={classes.length === 0}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add {terminology.sectionTitle.split(' ')[0]}
          </Button>
        )}
      </div>

      {classes.length === 0 && (
        <Alert variant="warning">
          No classes/batches exist yet. Please create a {terminology.classTitle.split(' ')[0]} before adding sections.
        </Alert>
      )}

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSections.length > 0 ? (
          filteredSections.map((sec) => {
            const parentClass = classes.find((c) => c.id === sec.class_id);
            const teacher = teachers.find((t) => t.id === sec.class_teacher_profile_id);

            return (
              <Card key={sec.id} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                      <Users2 className="w-5 h-5" />
                    </div>
                    {sec.status === 'active' ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="outline">Archived</Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{sec.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Code: {sec.code}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <BookmarkCheck className="w-3.5 h-3.5" /> {terminology.classTitle.split(' ')[0]}:
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {parentClass ? parentClass.name : 'Unknown Class'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> {terminology.teacherTitle}:
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {teacher ? teacher.full_name : 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <DoorClosed className="w-3.5 h-3.5" /> Room & Capacity:
                      </span>
                      <span className="font-medium text-slate-700">
                        {sec.room_number || 'TBD'} • Max {sec.capacity} students
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">ID: {sec.id.slice(0, 8)}</span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingSection(sec);
                          setFormData({
                            classId: sec.class_id,
                            name: sec.name,
                            code: sec.code,
                            capacity: sec.capacity,
                            roomNumber: sec.room_number || '',
                            classTeacherProfileId: sec.class_teacher_profile_id || '',
                          });
                          setFormError(null);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {sec.status === 'active' && (
                        <button
                          onClick={() => handleArchive(sec.id)}
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
            <Users2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">
              No {terminology.sectionTitle} Found
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No items match your filter criteria.'
                : `No ${terminology.sectionTitle.toLowerCase()} registered. Add a section to manage student rosters and classroom allocations.`}
            </p>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={`Add ${terminology.sectionTitle.split(' ')[0]}`}
        description="Create a section division with room and teacher mentor allocation."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Select
            label={`Parent ${terminology.classTitle.split(' ')[0]}`}
            value={formData.classId}
            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
            options={classes.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.code})`,
            }))}
            required
          />

          <Input
            label="Section Name"
            placeholder="e.g. Section A, Group 1, Lab Batch 1"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Section Code"
            placeholder="e.g. A, B, G1, B1"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Student Capacity"
              min={1}
              max={500}
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 40 })
              }
              required
            />

            <Input
              label="Room / Hall Number"
              placeholder="e.g. Room 102, Lab 3"
              value={formData.roomNumber}
              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
            />
          </div>

          <Select
            label={`Assigned ${terminology.teacherTitle} (Optional)`}
            value={formData.classTeacherProfileId}
            onChange={(e) => setFormData({ ...formData, classTeacherProfileId: e.target.value })}
            options={[
              { value: '', label: 'Unassigned' },
              ...teachers.map((t) => ({ value: t.id, label: `${t.full_name} (${t.email})` })),
            ]}
          />

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
              Create {terminology.sectionTitle.split(' ')[0]}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingSection}
        onClose={() => setEditingSection(null)}
        title={`Edit ${editingSection?.name}`}
        description="Update section parameters."
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Section Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input label="Section Code" value={formData.code} disabled />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Student Capacity"
              min={1}
              max={500}
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 40 })
              }
              required
            />

            <Input
              label="Room Number"
              value={formData.roomNumber}
              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
            />
          </div>

          <Select
            label={`Assigned ${terminology.teacherTitle}`}
            value={formData.classTeacherProfileId}
            onChange={(e) => setFormData({ ...formData, classTeacherProfileId: e.target.value })}
            options={[
              { value: '', label: 'Unassigned' },
              ...teachers.map((t) => ({ value: t.id, label: `${t.full_name} (${t.email})` })),
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(null)}
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
