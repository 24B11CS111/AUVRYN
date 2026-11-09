import React from 'react';
import Link from 'next/link';
import { HostelNav } from './HostelNav';
import {
  getHostelOverviewStatsAction,
  getHostelBuildingsAction,
  getHostelAllocationsAction,
} from './actions';
import {
  Building2,
  BedDouble,
  DoorOpen,
  LogOut,
  Wrench,
  UserPlus,
} from 'lucide-react';

export default async function HostelOverviewPage() {
  const [statsRes, buildingsRes, allocsRes] = await Promise.all([
    getHostelOverviewStatsAction(),
    getHostelBuildingsAction(),
    getHostelAllocationsAction({ status: 'active' }),
  ]);

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    totalBuildings: 0,
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    occupancyRate: 0,
    activeAllocations: 0,
    pendingApplications: 0,
    activeOutpasses: 0,
    pendingOutpasses: 0,
    openComplaints: 0,
  };

  const buildings = buildingsRes.success && buildingsRes.data ? buildingsRes.data : [];
  const allocations = allocsRes.success && allocsRes.data ? allocsRes.data.slice(0, 5) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hostel Management</h1>
          <p className="text-sm text-slate-500">
            Buildings, room configurations, atomic bed bookings, student outpasses and maintenance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/hostel/allocations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
          >
            <BedDouble className="w-3.5 h-3.5" />
            Manage Beds
          </Link>
          <Link
            href="/dashboard/hostel/leave"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Outpasses ({stats.pendingOutpasses})
          </Link>
        </div>
      </div>

      <HostelNav />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Buildings</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.totalBuildings}</div>
          <span className="text-xs text-slate-400">{stats.totalRooms} rooms configured</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Beds</span>
            <BedDouble className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.totalBeds}</div>
          <span className="text-xs text-slate-400">{stats.availableBeds} beds available</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Occupancy</span>
            <DoorOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600">{stats.occupancyRate}%</div>
          <span className="text-xs text-slate-400">{stats.occupiedBeds} students housed</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pending Apps</span>
            <UserPlus className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-600">{stats.pendingApplications}</div>
          <span className="text-xs text-slate-400">Hostel applications</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Outpasses</span>
            <LogOut className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-600">{stats.activeOutpasses}</div>
          <span className="text-xs text-slate-400">{stats.pendingOutpasses} pending review</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Complaints</span>
            <Wrench className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold text-red-600">{stats.openComplaints}</div>
          <span className="text-xs text-slate-400">Maintenance issues</span>
        </div>
      </div>

      {/* Buildings & Allocations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buildings Summary */}
        <div className="lg:col-span-1 p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Hostel Blocks ({buildings.length})
            </h2>
            <Link href="/dashboard/hostel/buildings" className="text-xs text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          {buildings.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No hostel buildings set up yet.</p>
          ) : (
            <div className="space-y-2">
              {buildings.map((b: any) => (
                <div key={b.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-900">{b.name} ({b.building_code})</p>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {b.gender_policy} • {b.total_floors} Floors
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bed Allocations */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-indigo-600" />
              Active Bed Allocations
            </h2>
            <Link href="/dashboard/hostel/allocations" className="text-xs text-blue-600 hover:underline">
              Open Allocations Desk →
            </Link>
          </div>

          {allocations.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No active student allocations.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Student</th>
                    <th className="py-2 px-3">Bed #</th>
                    <th className="py-2 px-3">Room & Block</th>
                    <th className="py-2 px-3">Allocated From</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">
                          {a.student ? `${a.student.first_name} ${a.student.last_name}` : 'Student'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {a.student?.admission_number}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                        {a.bed?.bed_number || 'Bed'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Room {a.bed?.room?.room_number || 'N/A'} • {a.bed?.room?.building?.name || 'Block'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{a.allocated_from}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
