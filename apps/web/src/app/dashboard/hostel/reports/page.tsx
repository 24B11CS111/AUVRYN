import React from 'react';
import { HostelNav } from '../HostelNav';
import {
  getHostelOverviewStatsAction,
  getHostelBuildingsAction,
  getHostelComplaintsAction,
} from '../actions';
import { Building2 } from 'lucide-react';

export default async function HostelReportsPage() {
  const [statsRes, buildingsRes, complaintsRes] = await Promise.all([
    getHostelOverviewStatsAction(),
    getHostelBuildingsAction(),
    getHostelComplaintsAction(),
  ]);

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    totalBuildings: 0,
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    occupancyRate: 0,
    activeAllocations: 0,
    activeOutpasses: 0,
    openComplaints: 0,
  };

  const buildings = buildingsRes.success && buildingsRes.data ? buildingsRes.data : [];
  const complaints = complaintsRes.success && complaintsRes.data ? complaintsRes.data : [];

  const resolvedComplaints = complaints.filter((c: any) => c.status === 'resolved').length;
  const totalComplaints = complaints.length;
  const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hostel Reports & Occupancy</h1>
          <p className="text-sm text-slate-500">
            Capacity planning, room utilization rates, outpass metrics and facility health.
          </p>
        </div>
      </div>

      <HostelNav />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Campus Bed Occupancy</div>
          <div className="text-2xl font-bold text-slate-900">{stats.occupancyRate}%</div>
          <span className="text-[11px] text-slate-400">
            {stats.occupiedBeds} occupied of {stats.totalBeds} total
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Vacancy Reserve</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.availableBeds} beds</div>
          <span className="text-[11px] text-slate-400">Available for allocation</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Maintenance Resolution</div>
          <div className="text-2xl font-bold text-blue-600">{resolutionRate}%</div>
          <span className="text-[11px] text-slate-400">{resolvedComplaints} of {totalComplaints} tickets resolved</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Active Outpasses</div>
          <div className="text-2xl font-bold text-indigo-600">{stats.activeOutpasses}</div>
          <span className="text-[11px] text-slate-400">Students outside campus</span>
        </div>
      </div>

      {/* Buildings Breakdown */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          Building Blocks Capacity Analysis
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {buildings.map((b: any) => (
            <div key={b.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{b.name}</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                  {b.gender_policy}
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-2">
                Floors: <span className="font-semibold text-slate-800">{b.total_floors}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Warden: {b.warden ? `${b.warden.first_name} ${b.warden.last_name}` : 'Not assigned'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
