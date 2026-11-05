'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CalendarDays,
  Calendar,
  Clock,
  Building,
  Users,
  Layers,
  ArrowRight,
  PlusCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

interface TimetableOverviewClientProps {
  institution: {
    id: string;
    name: string;
    type: string;
  };
  stats: {
    totalStructures: number;
    totalEntries: number;
    totalRooms: number;
    todaySubstitutions: number;
    academicYearName: string;
  };
  structures: any[];
  todayEntries: any[];
  todayDayOfWeek: string;
  todayDate: string;
  userRole: string;
}

export function TimetableOverviewClient({
  institution,
  stats,
  structures,
  todayEntries,
  todayDayOfWeek,
  todayDate,
  userRole,
}: TimetableOverviewClientProps) {
  const canManage = ['owner', 'admin', 'academic_admin', 'department_head'].includes(userRole);

  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Timetable & Scheduling</h1>
            <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
              {stats.academicYearName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Universal multi-tier scheduling engine for classes, faculty workload, and room allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link href="/dashboard/timetable/manage">
              <Button className="flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                Manage Timetable
              </Button>
            </Link>
          )}
          <Link href="/dashboard/timetable/classes">
            <Button variant="outline" className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Class Timetables
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Slots</CardTitle>
            <CalendarDays className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground mt-1">Active weekly recurring classes</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Schedule Structures</CardTitle>
            <Layers className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalStructures}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured period shift templates</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rooms & Labs</CardTitle>
            <Building className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalRooms}</div>
            <p className="text-xs text-muted-foreground mt-1">Classrooms, labs & auditoriums</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Substitutions Today</CardTitle>
            <UserCheck className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.todaySubstitutions}</div>
            <p className="text-xs text-muted-foreground mt-1">Approved faculty replacements</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Quick Links Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/dashboard/timetable/manage" className="group">
          <Card className="h-full border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Structure & Grid Editor
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure period timings, breaks, shifts and build weekly timetable entries.
                </p>
              </div>
              <div className="flex items-center text-xs font-medium text-primary mt-4">
                Open editor <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/timetable/classes" className="group">
          <Card className="h-full border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Class & Cohort Timetables
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Weekly visual grid for grades, sections, streams, and degree programs with print view.
                </p>
              </div>
              <div className="flex items-center text-xs font-medium text-primary mt-4">
                View cohorts <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/timetable/faculty" className="group">
          <Card className="h-full border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Faculty Workload & Substitutions
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Teacher schedules, weekly workload distribution, and conflict-free substitute assignment.
                </p>
              </div>
              <div className="flex items-center text-xs font-medium text-primary mt-4">
                Manage faculty <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/timetable/rooms" className="group">
          <Card className="h-full border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Room & Lab Allocation
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Classroom facilities, lab capacity tracking, and room occupancy schedules.
                </p>
              </div>
              <div className="flex items-center text-xs font-medium text-primary mt-4">
                View rooms <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Grid: Today's Schedule Preview & Active Structures */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Live Slots */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Today&apos;s Scheduled Slots ({formatDayName(todayDayOfWeek)}, {todayDate})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active classes scheduled across cohorts for today.
              </p>
            </div>
            <Link href="/dashboard/timetable/classes">
              <Button variant="ghost" size="sm" className="text-xs">
                Full View
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayEntries.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg">
                <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">No timetable entries scheduled for today</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure period slots or add timetable entries for {formatDayName(todayDayOfWeek)}.
                </p>
                {canManage && (
                  <Link href="/dashboard/timetable/manage" className="inline-block mt-3">
                    <Button size="sm" variant="outline">
                      Open Schedule Editor
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {todayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex flex-col items-center justify-center font-bold text-xs shrink-0">
                        <span>P{entry.period_number}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {entry.subject?.name || 'Class Session'}
                          </span>
                          {entry.session_type !== 'theory' && (
                            <Badge variant="default" className="text-[10px] uppercase">
                              {entry.session_type}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 mt-0.5">
                          <span>
                            Class: {entry.academic_class?.name}
                            {entry.academic_section?.name ? ` - ${entry.academic_section.name}` : ''}
                          </span>
                          <span>•</span>
                          <span>
                            Faculty: {entry.faculty?.first_name} {entry.faculty?.last_name}
                          </span>
                          {entry.room && (
                            <>
                              <span>•</span>
                              <span>Room: {entry.room.room_number} ({entry.room.building})</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                      <div className="font-mono font-medium text-foreground">
                        {entry.start_time?.slice(0, 5)} - {entry.end_time?.slice(0, 5)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Structures List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Timetable Structures
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configured shift templates for {institution.name}
            </p>
          </CardHeader>
          <CardContent>
            {structures.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-lg">
                <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-foreground">No timetable structures defined</p>
                {canManage && (
                  <Link href="/dashboard/timetable/manage" className="inline-block mt-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      Create Structure
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {structures.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 border border-border rounded-md hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{st.name}</span>
                      {st.is_default && (
                        <Badge variant="outline" className="text-[10px] text-primary border-primary">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        {st.start_time?.slice(0, 5)} - {st.end_time?.slice(0, 5)} ({st.periods_per_day} Periods)
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1.5 flex flex-wrap gap-1">
                      {(st.working_days || []).map((day: string) => (
                        <span key={day} className="px-1.5 py-0.5 bg-muted rounded text-[10px] capitalize">
                          {day.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
