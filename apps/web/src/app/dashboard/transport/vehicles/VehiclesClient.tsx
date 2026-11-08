'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { TransportNav } from '../TransportNav';
import { updateVehicleStatusAction } from '../actions';
import {
  Plus,
  FileText,
  Search,
} from 'lucide-react';
import type { TransportVehicleStatus } from '@edu-platform/types';

interface VehiclesClientProps {
  initialVehicles: any[];
}

export const VehiclesClient: React.FC<VehiclesClientProps> = ({ initialVehicles }) => {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPending, startTransition] = useTransition();

  const filtered = vehicles.filter((v) => {
    const matchesSearch =
      v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle_model.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (vehicleId: string, newStatus: TransportVehicleStatus) => {
    startTransition(async () => {
      const res = await updateVehicleStatusAction(vehicleId, newStatus);
      if (res.success) {
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicleId ? { ...v, status: newStatus } : v))
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fleet & Vehicle Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered buses, vans, and shuttles with capacity and statutory certificates.
          </p>
        </div>
        <Link
          href="/dashboard/transport/vehicles/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Vehicle</span>
        </Link>
      </div>

      <TransportNav />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by registration number or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="inactive">Inactive</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Registration</th>
              <th className="py-3 px-4">Model & Type</th>
              <th className="py-3 px-4">Capacity</th>
              <th className="py-3 px-4">Campus</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Documents</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No vehicles found matching the criteria.
                </td>
              </tr>
            ) : (
              filtered.map((v) => {
                const docCount = (v.documents || []).length;
                return (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {v.registration_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{v.vehicle_model}</div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        {v.vehicle_type?.replace('_', ' ')} • {v.fuel_type}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {v.seating_capacity} seats
                      {v.standing_capacity > 0 && ` (+${v.standing_capacity} standing)`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {v.campus?.name || 'All Campuses'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : v.status === 'under_maintenance'
                            ? 'bg-amber-100 text-amber-800'
                            : v.status === 'retired'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {v.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{docCount} docs</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        disabled={isPending}
                        value={v.status}
                        onChange={(e) => handleStatusChange(v.id, e.target.value as any)}
                        className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-white"
                      >
                        <option value="active">Active</option>
                        <option value="under_maintenance">Under Maintenance</option>
                        <option value="inactive">Inactive</option>
                        <option value="retired">Retired</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
