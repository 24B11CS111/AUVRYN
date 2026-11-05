'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Search, UserPlus, UserCheck, Calendar, Phone, Mail, ArrowRight, ShieldAlert } from 'lucide-react';
import type { StudentRow, StudentEnrollmentRow, AcademicClassRow } from '@edu-platform/database';
import type { StudentStatus } from '@edu-platform/types';

interface StudentWithEnrollment extends StudentRow {
  currentEnrollment?: (StudentEnrollmentRow & {
    class?: AcademicClassRow | null;
  }) | null;
}

interface StudentListClientProps {
  initialStudents: StudentWithEnrollment[];
  classes: AcademicClassRow[];
  canManage: boolean;
}

export function StudentListClient({
  initialStudents,
  classes,
  canManage,
}: StudentListClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  const filteredStudents = initialStudents.filter((student) => {
    const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      student.admission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.phone && student.phone.includes(searchTerm));

    const matchesStatus =
      selectedStatus === 'all' ? true : student.status === selectedStatus;

    const matchesClass =
      selectedClassId === 'all'
        ? true
        : student.currentEnrollment?.class_id === selectedClassId;

    return matchesSearch && matchesStatus && matchesClass;
  });

  const getStatusBadge = (status: StudentStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="default">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="danger">Suspended</Badge>;
      case 'alumni':
        return <Badge variant="purple">Alumni</Badge>;
      case 'withdrawn':
      case 'transferred':
        return <Badge variant="warning">{status}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
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
              placeholder="Search by student name, admission no, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {classes.length > 0 && (
            <div className="w-44">
              <Select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                options={[
                  { value: 'all', label: 'All Classes' },
                  ...classes.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          )}

          <div className="w-36">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active Students' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'alumni', label: 'Alumni' },
                { value: 'transferred', label: 'Transferred' },
                { value: 'withdrawn', label: 'Withdrawn' },
              ]}
            />
          </div>
        </div>

        {canManage && (
          <Link href="/dashboard/students/new">
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-1.5" />
              Register Student
            </Button>
          </Link>
        )}
      </div>

      {/* Grid of Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => {
            const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim();
            const enrolledClass = student.currentEnrollment?.class;

            return (
              <Card key={student.id} className="p-5 flex flex-col justify-between hover:border-indigo-200 transition-colors">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    {getStatusBadge(student.status)}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{fullName}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    Adm No: <span className="font-semibold text-slate-700">{student.admission_number}</span>
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Class Cohort:</span>
                      <span className="font-medium text-slate-800">
                        {enrolledClass ? enrolledClass.name : 'Not Enrolled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> DOB:
                      </span>
                      <span className="font-medium text-slate-700">{student.date_of_birth}</span>
                    </div>

                    {student.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> Phone:
                        </span>
                        <span className="font-medium text-slate-700">{student.phone}</span>
                      </div>
                    )}

                    {student.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> Email:
                        </span>
                        <span className="font-medium text-slate-700 truncate max-w-[160px]">
                          {student.email}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Emergency:
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {student.emergency_contact_name} ({student.emergency_contact_phone})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    Joined {student.date_of_joining}
                  </span>
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    View Profile <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No Students Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No students match your search or filter criteria.'
                : 'No students registered in this institution yet. Register a new student or process an admission.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
