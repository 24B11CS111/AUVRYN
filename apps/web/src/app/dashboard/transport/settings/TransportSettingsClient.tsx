'use client';

import React, { useState, useTransition } from 'react';
import { TransportNav } from '../TransportNav';
import { updateTransportSettingsAction } from '../actions';
import { Shield, Clock, CheckCircle2, Loader2 } from 'lucide-react';

interface TransportSettingsClientProps {
  initialSettings: any;
}

export const TransportSettingsClient: React.FC<TransportSettingsClientProps> = ({
  initialSettings,
}) => {
  const [settings, setSettings] = useState(
    initialSettings || {
      gps_provider: 'driver_mobile_app',
      gps_update_interval_seconds: 15,
      location_retention_days: 30,
      approaching_stop_distance_meters: 500,
      allow_parent_tracking: true,
      require_parent_change_approval: true,
      prevent_overcapacity_assignment: true,
    }
  );

  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(false);

    startTransition(async () => {
      const res = await updateTransportSettingsAction({
        gpsProvider: settings.gps_provider,
        gpsUpdateIntervalSeconds: settings.gps_update_interval_seconds,
        locationRetentionDays: settings.location_retention_days,
        approachingStopDistanceMeters: settings.approaching_stop_distance_meters,
        allowParentTracking: settings.allow_parent_tracking,
        requireParentChangeApproval: settings.require_parent_change_approval,
        preventOvercapacityAssignment: settings.prevent_overcapacity_assignment,
      });

      if (res.success) {
        setSuccessMsg(true);
      } else {
        setError(res.error || 'Failed to update transport settings');
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Transport & Tracking Policies</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure telemetry update frequency, location retention days, and parent tracking safety.
        </p>
      </div>

      <TransportNav />

      {successMsg && (
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Transport settings saved successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>GPS Telemetry & Retention</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GPS Telemetry Source</label>
              <select
                value={settings.gps_provider}
                onChange={(e) => setSettings({ ...settings, gps_provider: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="driver_mobile_app">Driver Mobile Application</option>
                <option value="obd_hardware_device">Hardware GPS Tracker (OBD/AIS-140)</option>
                <option value="third_party_telematics">Third-Party Telematics API</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Telemetry Ping Interval (Seconds)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={settings.gps_update_interval_seconds}
                onChange={(e) =>
                  setSettings({ ...settings, gps_update_interval_seconds: parseInt(e.target.value) || 15 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Location History Retention (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.location_retention_days}
                onChange={(e) =>
                  setSettings({ ...settings, location_retention_days: parseInt(e.target.value) || 30 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Breadcrumb coordinates older than this are purged to ensure location privacy.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approaching Alert Radius (Meters)
              </label>
              <input
                type="number"
                min="100"
                max="5000"
                value={settings.approaching_stop_distance_meters}
                onChange={(e) =>
                  setSettings({ ...settings, approaching_stop_distance_meters: parseInt(e.target.value) || 500 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Safety & Access Constraints */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Safety & Capacity Rules</span>
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_parent_tracking}
                onChange={(e) => setSettings({ ...settings, allow_parent_tracking: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-slate-900"
              />
              <div>
                <span className="font-semibold text-slate-800">Allow Live Tracking in Parent Portal</span>
                <p className="text-[11px] text-slate-500">
                  Parents can view real-time location exclusively for the bus assigned to their enrolled child.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.prevent_overcapacity_assignment}
                onChange={(e) => setSettings({ ...settings, prevent_overcapacity_assignment: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-slate-900"
              />
              <div>
                <span className="font-semibold text-slate-800">Strict Capacity Enforcement</span>
                <p className="text-[11px] text-slate-500">
                  Block student route assignments if the assigned vehicle has reached its maximum seating capacity.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_parent_change_approval}
                onChange={(e) => setSettings({ ...settings, require_parent_change_approval: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-slate-900"
              />
              <div>
                <span className="font-semibold text-slate-800">Require Administrative Approval for Route Changes</span>
                <p className="text-[11px] text-slate-500">
                  Parent route change requests remain in &apos;pending&apos; status until reviewed by transport staff.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Policies</span>
          </button>
        </div>
      </form>
    </div>
  );
};
