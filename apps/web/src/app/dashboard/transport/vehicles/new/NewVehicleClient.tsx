'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createVehicleAction } from '../../actions';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface NewVehicleClientProps {
  campuses: Array<{ id: string; name: string }>;
}

export const NewVehicleClient: React.FC<NewVehicleClientProps> = ({ campuses }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    registrationNumber: '',
    vehicleModel: '',
    vehicleType: 'school_bus',
    seatingCapacity: 40,
    standingCapacity: 0,
    fuelType: 'diesel',
    ownershipType: 'institution_owned',
    status: 'active' as const,
    campusId: '',
    gpsDeviceId: '',
    makeYear: new Date().getFullYear(),
    color: 'Yellow',
    chassisNumber: '',
    engineNumber: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createVehicleAction(form as any);
      if (res.success) {
        router.push('/dashboard/transport/vehicles');
      } else {
        setError(res.error || 'Failed to register vehicle');
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/transport/vehicles"
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Register New Transport Vehicle</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record a school bus, college shuttle, or van with capacity constraints.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DL-01-AB-1234"
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vehicle Model <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tata Starbus 40-Seater"
              value={form.vehicleModel}
              onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vehicle Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
            >
              <option value="school_bus">School Bus</option>
              <option value="college_bus">College Bus</option>
              <option value="university_shuttle">University Shuttle</option>
              <option value="van">Van / Minibus</option>
              <option value="other">Other Institution Vehicle</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Assignment
            </label>
            <select
              value={form.campusId}
              onChange={(e) => setForm({ ...form, campusId: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
            >
              <option value="">All Campuses / Central Depot</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seating Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="120"
              required
              value={form.seatingCapacity}
              onChange={(e) => setForm({ ...form, seatingCapacity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Standing Capacity
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={form.standingCapacity}
              onChange={(e) => setForm({ ...form, standingCapacity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fuel Type
            </label>
            <select
              value={form.fuelType}
              onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
            >
              <option value="diesel">Diesel</option>
              <option value="cng">CNG</option>
              <option value="electric">Electric (EV)</option>
              <option value="petrol">Petrol</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ownership Type
            </label>
            <select
              value={form.ownershipType}
              onChange={(e) => setForm({ ...form, ownershipType: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
            >
              <option value="institution_owned">Institution-Owned</option>
              <option value="contracted">Contracted / Third-Party</option>
              <option value="leased">Leased</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              GPS Device Hardware ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. GPS-OBD-88912"
              value={form.gpsDeviceId}
              onChange={(e) => setForm({ ...form, gpsDeviceId: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Color
            </label>
            <input
              type="text"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes / Special Specifications
          </label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="CCTV installed, speed governor calibrated, emergency exits verified..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Link
            href="/dashboard/transport/vehicles"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save & Register Vehicle</span>
          </button>
        </div>
      </form>
    </div>
  );
};
