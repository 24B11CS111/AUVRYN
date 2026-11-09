'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { HostelNav } from '../HostelNav';
import {
  getHostelVisitorsAction,
  createHostelVisitorAction,
  checkOutHostelVisitorAction,
} from '../actions';
import { UserCheck, Plus, Loader2 } from 'lucide-react';

export default function HostelVisitorsPage() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [studentId, setStudentId] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [contactPhone, setContactPhone] = useState('');
  const [idProofType, setIdProofType] = useState('government_id');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [purpose, setPurpose] = useState('');

  const loadData = async () => {
    const res = await getHostelVisitorsAction();
    if (res.success && res.data) setVisitors(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createHostelVisitorAction({
        studentId,
        visitorName,
        relationship,
        contactPhone,
        idProofType,
        idProofNumber: idProofNumber || undefined,
        purpose: purpose || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to register visitor');
      } else {
        setIsAddModalOpen(false);
        setStudentId('');
        setVisitorName('');
        setContactPhone('');
        loadData();
      }
    });
  };

  const handleCheckOut = (visitorId: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await checkOutHostelVisitorAction(visitorId);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to check out visitor');
      } else {
        loadData();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hostel Visitors Log</h1>
          <p className="text-sm text-slate-500">
            Guest tracking, identity verification, check-in and check-out auditing.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Register Visitor
        </button>
      </div>

      <HostelNav />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Visitors Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {visitors.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No visitors logged today</p>
            <p className="text-xs text-slate-400 mt-1">Register campus visitors using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Visitor Name</th>
                  <th className="py-2.5 px-3">Student Visited</th>
                  <th className="py-2.5 px-3">Relationship</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Check-in Time</th>
                  <th className="py-2.5 px-3">Check-out Time</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {v.visitor_name}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        {v.student ? `${v.student.first_name} ${v.student.last_name}` : 'Student'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {v.student?.admission_number}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{v.relationship}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{v.contact_phone}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {v.check_in_time ? v.check_in_time.split('T')[1]?.slice(0, 5) : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {v.check_out_time ? v.check_out_time.split('T')[1]?.slice(0, 5) : (
                        <span className="text-emerald-600 font-semibold text-[11px]">Currently Inside</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {!v.check_out_time && (
                        <button
                          onClick={() => handleCheckOut(v.id)}
                          disabled={isPending}
                          className="px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-medium"
                        >
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md p-6 rounded-xl bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Register Hostel Visitor</h2>
            <form onSubmit={handleRegisterVisitor} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student ID *
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Student UUID"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visitor Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Relationship *
                  </label>
                  <input
                    type="text"
                    required
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="Father, Mother, Local Guardian..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Proof (Type & Number)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={idProofType}
                    onChange={(e) => setIdProofType(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="government_id">Govt ID / Aadhaar</option>
                    <option value="driving_license">Driving License</option>
                    <option value="passport">Passport</option>
                  </select>
                  <input
                    type="text"
                    value={idProofNumber}
                    onChange={(e) => setIdProofNumber(e.target.value)}
                    placeholder="ID Number"
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose of Visit
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Monthly visit, delivering essentials"
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
                  Register & Check In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
