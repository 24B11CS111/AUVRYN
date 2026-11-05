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
import { createAcademicYearAction } from '../actions';
import { Calendar, Plus, Search, CalendarDays } from 'lucide-react';
import type { AcademicYearRow } from '@edu-platform/database';

interface AcademicYearClientProps {
  initialYears: AcademicYearRow[];
  canManage: boolean;
}

export function AcademicYearClient({ initialYears, canManage }: AcademicYearClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    startDate: '',
    endDate: '',
    termSystem: 'annual' as 'annual' | 'semester' | 'trimester',
    isCurrent: false,
  });

  const filteredYears = initialYears.filter(
    (y) =>
      y.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      y.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await createAcademicYearAction(formData);
      if (!res.success) {
        setFormError(res.error || 'Failed to create academic year');
      } else {
        setIsModalOpen(false);
        setFormData({
          name: '',
          code: '',
          startDate: '',
          endDate: '',
          termSystem: 'annual',
          isCurrent: false,
        });
        router.refresh();
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search academic years..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Academic Year
          </Button>
        )}
      </div>

      {/* Grid of Years */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredYears.length > 0 ? (
          filteredYears.map((ay) => (
            <Card key={ay.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  {ay.is_current ? (
                    <Badge variant="success">Current Active Session</Badge>
                  ) : (
                    <Badge variant="outline">Session</Badge>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-base">{ay.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Code: {ay.code}</p>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Term System:</span>
                    <span className="font-semibold text-slate-800 capitalize">{ay.term_system}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Start Date:</span>
                    <span className="font-semibold text-slate-800">{ay.start_date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">End Date:</span>
                    <span className="font-semibold text-slate-800">{ay.end_date}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Recorded session</span>
                <span className="font-mono">ID: {ay.id.slice(0, 8)}</span>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No Academic Years Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No sessions match your search query.'
                : 'No academic years created yet. Add your first academic year to schedule classes and sessions.'}
            </p>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Academic Year"
        description="Define an academic session window for classes, terms, and grading."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Academic Year Name"
            placeholder="e.g. 2026-2027 Academic Session"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Year Code"
            placeholder="e.g. AY-2026-27"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Start Date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
            <Input
              type="date"
              label="End Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </div>

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
              { value: 'annual', label: 'Annual (Single Year-Long Term)' },
              { value: 'semester', label: 'Semesters (2 Terms per Year)' },
              { value: 'trimester', label: 'Trimesters (3 Terms per Year)' },
            ]}
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isCurrent"
              checked={formData.isCurrent}
              onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isCurrent" className="text-xs font-medium text-slate-700">
              Set as current active session for this institution
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Create Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
