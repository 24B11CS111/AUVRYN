'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { HostelNav } from '../HostelNav';
import { getHostelRoomsAction, getHostelBuildingsAction, createHostelRoomAction } from '../actions';
import { DoorOpen, Plus, Loader2, Wind, Bath } from 'lucide-react';

export default function HostelRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [roomNumber, setRoomNumber] = useState('');
  const [floorNumber, setFloorNumber] = useState(1);
  const [roomType, setRoomType] = useState<'single' | 'double' | 'triple' | 'dormitory'>('double');
  const [bedCapacity, setBedCapacity] = useState(2);
  const [isAc, setIsAc] = useState(false);
  const [isAttachedWashroom, setIsAttachedWashroom] = useState(true);
  const [baseFeeMonthly, setBaseFeeMonthly] = useState(5000);

  const loadData = useCallback(async () => {
    const [rRes, bRes] = await Promise.all([
      getHostelRoomsAction(selectedBuildingId || undefined),
      getHostelBuildingsAction(),
    ]);

    if (rRes.success && rRes.data) setRooms(rRes.data);
    if (bRes.success && bRes.data) {
      setBuildings(bRes.data);
      if (!selectedBuildingId && bRes.data.length > 0) {
        // default to first
      }
    }
  }, [selectedBuildingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createHostelRoomAction({
        buildingId: selectedBuildingId || buildings[0]?.id,
        roomNumber,
        floorNumber: Number(floorNumber),
        roomType,
        bedCapacity: Number(bedCapacity),
        isAc,
        isAttachedWashroom,
        baseFeeMonthly: Number(baseFeeMonthly),
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to add room');
      } else {
        setIsAddModalOpen(false);
        setRoomNumber('');
        loadData();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rooms & Bed Capacities</h1>
          <p className="text-sm text-slate-500">
            Room inventory, AC provisions, washroom configurations, and bed occupancies.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Room
        </button>
      </div>

      <HostelNav />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Building Filter Bar */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-700">Filter by Block:</label>
        <select
          value={selectedBuildingId}
          onChange={(e) => setSelectedBuildingId(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Buildings</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.building_code})
            </option>
          ))}
        </select>
      </div>

      {/* Rooms Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {rooms.length === 0 ? (
          <div className="text-center py-12">
            <DoorOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No rooms found</p>
            <p className="text-xs text-slate-400 mt-1">Add rooms using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Room #</th>
                  <th className="py-2.5 px-3">Building Block</th>
                  <th className="py-2.5 px-3">Floor</th>
                  <th className="py-2.5 px-3">Room Type</th>
                  <th className="py-2.5 px-3">Bed Capacity</th>
                  <th className="py-2.5 px-3">Amenities</th>
                  <th className="py-2.5 px-3">Monthly Fee</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((r) => {
                  const beds = r.beds || [];
                  const occupiedBeds = beds.filter((b: any) => b.status === 'occupied').length;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {r.room_number}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {r.building?.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">Floor {r.floor_number}</td>
                      <td className="py-3 px-3 capitalize text-slate-700">{r.room_type}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900">{occupiedBeds}</span> / {r.bed_capacity} beds
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 text-slate-500">
                          {r.is_ac && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                              <Wind className="w-3 h-3" /> AC
                            </span>
                          )}
                          {r.is_attached_washroom && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                              <Bath className="w-3 h-3" /> Bath
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        ₹{Number(r.base_fee_monthly).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            occupiedBeds >= r.bed_capacity
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {occupiedBeds >= r.bed_capacity ? 'FULL' : 'AVAILABLE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md p-6 rounded-xl bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Add Hostel Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hostel Building *
                </label>
                <select
                  value={selectedBuildingId || (buildings[0]?.id ?? '')}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.building_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. 204"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Floor Number *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room Type *
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setRoomType(t);
                      if (t === 'single') setBedCapacity(1);
                      if (t === 'double') setBedCapacity(2);
                      if (t === 'triple') setBedCapacity(3);
                      if (t === 'dormitory') setBedCapacity(6);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="triple">Triple</option>
                    <option value="dormitory">Dormitory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bed Capacity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={bedCapacity}
                    onChange={(e) => setBedCapacity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={isAc}
                    onChange={(e) => setIsAc(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  Air Conditioned (AC)
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={isAttachedWashroom}
                    onChange={(e) => setIsAttachedWashroom(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  Attached Washroom
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Base Fee (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={baseFeeMonthly}
                  onChange={(e) => setBaseFeeMonthly(Number(e.target.value))}
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
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
