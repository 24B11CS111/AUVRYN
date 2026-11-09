'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { EventsNav } from '../EventsNav';
import {
  getEventCertificatesAction,
  getEventRegistrationsAction,
  issueEventCertificateAction,
} from '../actions';
import { Award, Plus, Loader2 } from 'lucide-react';

export default function EventCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [registrationId, setRegistrationId] = useState('');
  const [title, setTitle] = useState('Certificate of Participation');
  const [certificateType, setCertificateType] = useState<
    'participation' | 'merit' | 'winner' | 'runner_up'
  >('participation');

  const loadData = async () => {
    const [cRes, rRes] = await Promise.all([
      getEventCertificatesAction(),
      getEventRegistrationsAction({ status: 'attended' }),
    ]);

    if (cRes.success && cRes.data) setCertificates(cRes.data);
    if (rRes.success && rRes.data) setRegistrations(rRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await issueEventCertificateAction({
        registrationId,
        title,
        certificateType,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to issue certificate');
      } else {
        setIsAddModalOpen(false);
        setRegistrationId('');
        loadData();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Event Certificates</h1>
          <p className="text-sm text-slate-500">
            Generate and issue verified participation, merit, and completion awards.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Issue Certificate
        </button>
      </div>

      <EventsNav />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Certificates Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {certificates.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No certificates issued yet</p>
            <p className="text-xs text-slate-400 mt-1">Issue certificates to attendees using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Certificate #</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Issued Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-rose-600">
                      {cert.certificate_number}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{cert.title}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        {cert.registration?.student
                          ? `${cert.registration.student.first_name} ${cert.registration.student.last_name}`
                          : cert.registration?.staff
                          ? `${cert.registration.staff.first_name} ${cert.registration.staff.last_name}`
                          : cert.registration?.guest_name || 'Recipient'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {cert.registration?.event?.title || 'Event'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                        {cert.certificate_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {cert.issued_at ? cert.issued_at.split('T')[0] : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md p-6 rounded-xl bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Issue Event Certificate</h2>
            <form onSubmit={handleIssue} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Attended Participant *
                </label>
                <select
                  value={registrationId}
                  onChange={(e) => setRegistrationId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose verified attendee --</option>
                  {registrations.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.ticket_code}] {r.student ? `${r.student.first_name} ${r.student.last_name}` : r.guest_name} ({r.event?.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Certificate Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Certificate of Appreciation"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Certificate Type *
                </label>
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="participation">Participation</option>
                  <option value="merit">Merit</option>
                  <option value="winner">Winner</option>
                  <option value="runner_up">Runner Up</option>
                </select>
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
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
