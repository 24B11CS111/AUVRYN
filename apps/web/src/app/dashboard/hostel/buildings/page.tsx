'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { HostelNav } from '../HostelNav';
import { getHostelBuildingsAction, createHostelBuildingAction } from '../actions';
import { Plus, Loader2 } from 'lucide-react';

export default function HostelBuildingsPage() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [genderPolicy, setGenderPolicy] = useState<'boys' | 'girls' | 'coed'>('boys');
  const [totalFloors, setTotalFloors] = useState(3);
  const [address, setAddress] = useState('');

  const loadBuildings = async () => {
    const res = await getHostelBuildingsAction();
    if (res.success && res.data) setBuildings(res.data);
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createHostelBuildingAction({
        name,
        buildingCode: code,
        genderPolicy,
        totalFloors: Number(totalFloors),
        address: address || undefined,
        status: 'active',
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create building');
      } else {
        setIsAddModalOpen(false);
        setName('');
        setCode('');
        setAddress('');
        loadBuildings();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hostel Buildings</h1>
          <p className="text-sm text-slate-500">
            Blocks and dormitories with gender policies, wardens and floor counts.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Building
        </button>
      </div>

      <HostelNav />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings.map((b) => (
          <div key={b.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{b.name}</h3>
                <span className="text-xs font-mono font-medium text-slate-500">
                  Code: {b.building_code}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                {b.gender_policy}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px]">Floors</span>
                <span className="font-semibold text-slate-800">{b.total_floors} Floors</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <span className="font-semibold text-emerald-600 capitalize">{b.status}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">Chief Warden</span>
                <span className="font-medium text-slate-800">
                  {b.warden ? `${b.warden.first_name} ${b.warden.last_name}` : 'Not Assigned'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Building Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md p-6 rounded-xl bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Add Hostel Building</h2>
            <form onSubmit={handleCreateBuilding} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Building Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ganga Hostel Block A"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Building Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. H-BLK-A"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender Policy *
                  </label>
                  <select
                    value={genderPolicy}
                    onChange={(e) => setGenderPolicy(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="boys">Boys</option>
                    <option value="girls">Girls</option>
                    <option value="coed">Co-ed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Floors *
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address / Campus Location
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. North Campus Residential Area"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Building
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
