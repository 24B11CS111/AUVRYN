'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EventsNav } from '../EventsNav';
import { createEventAction } from '../actions';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewEventPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createEventAction({
        title: formData.get('title') as string,
        eventType: formData.get('eventType') as any,
        description: (formData.get('description') as string) || undefined,
        venue: formData.get('venue') as string,
        startTime: new Date(formData.get('startTime') as string).toISOString(),
        endTime: new Date(formData.get('endTime') as string).toISOString(),
        registrationDeadline: formData.get('registrationDeadline')
          ? new Date(formData.get('registrationDeadline') as string).toISOString()
          : undefined,
        maxParticipants: Number(formData.get('maxParticipants')) || 0,
        isRegistrationOpen: true,
        status: 'published',
      });

      if (!res.success) {
        setError(res.error || 'Failed to create event');
      } else {
        router.push('/dashboard/events');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/events"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Event</h1>
          <p className="text-sm text-slate-500">
            Publish academic fests, sports championships, guest seminars, and workshops.
          </p>
        </div>
      </div>

      <EventsNav />

      <div className="max-w-2xl p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Annual Inter-College Technical Symposium 2026"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Category *
              </label>
              <select
                name="eventType"
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="academic">Academic / Conference</option>
                <option value="cultural">Cultural Fest</option>
                <option value="sports">Sports Tournament</option>
                <option value="workshop">Workshop / Boot Camp</option>
                <option value="club_activity">Club Activity</option>
                <option value="competition">Competition / Hackathon</option>
                <option value="ceremony">Ceremony / Convocation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Venue / Hall *
              </label>
              <input
                type="text"
                name="venue"
                required
                placeholder="e.g. Main Auditorium, Ground Floor"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                name="startTime"
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                name="endTime"
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registration Deadline
              </label>
              <input
                type="datetime-local"
                name="registrationDeadline"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Participant Capacity Limit (0 = Unlimited)
              </label>
              <input
                type="number"
                name="maxParticipants"
                min={0}
                defaultValue={100}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Agenda
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Details about guest speakers, rules, and event schedule..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Link
              href="/dashboard/events"
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Publish Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
