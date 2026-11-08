'use client';

import React, { useState, useTransition } from 'react';
import { TransportNav } from '../TransportNav';
import { createTransportStopAction } from '../actions';
import { Plus, Search, Loader2 } from 'lucide-react';

interface StopsClientProps {
  initialStops: any[];
}

export const StopsClient: React.FC<StopsClientProps> = ({ initialStops }) => {
  const [stops, setStops] = useState(initialStops);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    latitude: 28.6139,
    longitude: 77.209,
    geofenceRadiusMeters: 50,
    landmark: '',
  });

  const filtered = stops.filter((s) => {
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code?.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleCreateStop = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createTransportStopAction(form as any);
      if (res.success && res.data) {
        setStops((prev) => [...prev, res.data]);
        setModalOpen(false);
        setForm({
          name: '',
          code: '',
          address: '',
          latitude: 28.6139,
          longitude: 77.209,
          geofenceRadiusMeters: 50,
          landmark: '',
        });
      } else {
        setError(res.error || 'Failed to create stop');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Transport Stops</h1>
          <p className="text-xs text-slate-500 mt-1">
            Designated student pickup and drop-off points with geofenced boundaries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Stop</span>
        </button>
      </div>

      <TransportNav />

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by stop name, code or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
        />
      </div>

      {/* Stops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No transport stops configured.
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{s.name}</h3>
                  {s.code && <span className="text-[10px] font-mono text-slate-400 font-semibold">{s.code}</span>}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                  {s.geofence_radius_meters}m geofence
                </span>
              </div>

              {s.address && <p className="text-[11px] text-slate-600 truncate">{s.address}</p>}
              {s.landmark && (
                <p className="text-[10px] text-slate-400">
                  Landmark: <span className="text-slate-600 font-medium">{s.landmark}</span>
                </p>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Lat: {parseFloat(s.latitude).toFixed(4)}°</span>
                <span>Lng: {parseFloat(s.longitude).toFixed(4)}°</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Stop Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Define New Transport Stop</h2>

            {error && (
              <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-[11px]">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateStop} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Stop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Greenwood Apartments Main Gate"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stop Code</label>
                  <input
                    type="text"
                    placeholder="e.g. STP-012"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Geofence Radius (m)</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={form.geofenceRadiusMeters}
                    onChange={(e) => setForm({ ...form, geofenceRadiusMeters: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="Street / Area description"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Landmark</label>
                <input
                  type="text"
                  placeholder="Opposite City Hospital"
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Stop</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
