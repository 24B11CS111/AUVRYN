'use client';

import React, { useState, useTransition } from 'react';
import { TransportNav } from '../TransportNav';
import { upsertTransportStaffProfileAction } from '../actions';
import {
  Phone,
  Mail,
  Search,
  Loader2,
} from 'lucide-react';

interface DriversClientProps {
  initialStaff: any[];
}

export const DriversClient: React.FC<DriversClientProps> = ({ initialStaff }) => {
  const [staff, setStaff] = useState(initialStaff);
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    roleType: 'driver' as 'driver' | 'attendant' | 'both',
    licenseNumber: '',
    licenseType: 'Commercial Heavy Vehicle (HMV)',
    licenseExpiry: '',
    badgeNumber: '',
    policeVerificationStatus: 'verified',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  });

  const filtered = staff.filter((s) => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) || s.phone?.includes(search) || s.email?.toLowerCase().includes(search.toLowerCase());
  });

  const handleOpenModal = (st: any) => {
    setSelectedStaff(st);
    const tp = Array.isArray(st.transport_profile) ? st.transport_profile[0] : st.transport_profile;
    setForm({
      roleType: tp?.role_type || 'driver',
      licenseNumber: tp?.license_number || '',
      licenseType: tp?.license_type || 'Commercial Heavy Vehicle (HMV)',
      licenseExpiry: tp?.license_expiry || '',
      badgeNumber: tp?.badge_number || '',
      policeVerificationStatus: tp?.police_verification_status || 'verified',
      emergencyContactName: tp?.emergency_contact_name || '',
      emergencyContactPhone: tp?.emergency_contact_phone || '',
      notes: tp?.notes || '',
    });
    setModalOpen(true);
  };

  const handleSaveTransportProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    startTransition(async () => {
      const res = await upsertTransportStaffProfileAction({
        staffProfileId: selectedStaff.id,
        roleType: form.roleType,
        licenseNumber: form.licenseNumber,
        licenseType: form.licenseType,
        licenseExpiry: form.licenseExpiry || undefined,
        badgeNumber: form.badgeNumber,
        policeVerificationStatus: form.policeVerificationStatus,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        notes: form.notes,
      });

      if (res.success) {
        setStaff((prev) =>
          prev.map((s) =>
            s.id === selectedStaff.id ? { ...s, transport_profile: res.data } : s
          )
        );
        setModalOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Driver & Transport Staff Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Commercial licenses, police verifications, and duty allocations linked to official staff records.
          </p>
        </div>
      </div>

      <TransportNav />

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
        />
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No staff records found.
          </div>
        ) : (
          filtered.map((s) => {
            const tp = Array.isArray(s.transport_profile) ? s.transport_profile[0] : s.transport_profile;
            const hasTp = !!tp;

            return (
              <div key={s.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {s.first_name} {s.last_name}
                    </h3>
                    <p className="text-[11px] text-slate-500">{s.designation || 'Staff Member'}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      hasTp
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {hasTp ? (tp.role_type === 'driver' ? 'Driver' : tp.role_type === 'attendant' ? 'Attendant' : 'Driver & Attendant') : 'No Transport Role'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-sans truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                </div>

                {hasTp && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>License:</span>
                      <span className="font-mono font-semibold">{tp.license_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Expiry:</span>
                      <span>{tp.license_expiry || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Police Verification:</span>
                      <span className="text-emerald-700 font-semibold capitalize">
                        {tp.police_verification_status || 'Verified'}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenModal(s)}
                  className="w-full mt-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  {hasTp ? 'Edit Credentials' : 'Assign Transport Credentials'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Transport Credentials */}
      {modalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Transport Credentials — {selectedStaff.first_name} {selectedStaff.last_name}
            </h2>

            <form onSubmit={handleSaveTransportProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={form.roleType}
                  onChange={(e) => setForm({ ...form, roleType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="driver">Driver</option>
                  <option value="attendant">Transport Attendant</option>
                  <option value="both">Both Driver & Attendant</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driving License Number</label>
                <input
                  type="text"
                  placeholder="e.g. DL-04-2019-88123"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">License Expiry</label>
                  <input
                    type="date"
                    value={form.licenseExpiry}
                    onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Badge Number</label>
                  <input
                    type="text"
                    value={form.badgeNumber}
                    onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Police Verification Status</label>
                <select
                  value={form.policeVerificationStatus}
                  onChange={(e) => setForm({ ...form, policeVerificationStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="verified">Verified (Clear Record)</option>
                  <option value="pending">Verification Pending</option>
                  <option value="expired">Verification Expired</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={form.emergencyContactPhone}
                    onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
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
                  <span>Save Transport Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
