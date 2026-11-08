# Milestone 10: Universal Transport Management & Live Bus Tracking

## 1. Architectural Overview & Universal Design

Milestone 10 introduces a multi-tenant, privacy-preserving, enterprise-grade Transport Management and Real-Time Bus Tracking engine across all educational archetypes (K-12 schools, junior colleges, degree colleges, engineering colleges, and universities):
- **Fleet & Statutory Vehicle Management**: Comprehensive asset tracking for institution-owned and contracted school buses, university shuttles, vans, and emergency vehicles with seating capacities, statutory document expiries (Fitness, Insurance, Permits, Pollution/PUC), and full lifecycle maintenance histories. Unavailable or under-maintenance vehicles are strictly barred from active route dispatch.
- **Configurable Multi-Campus Routes & Stops**: Ordered stop sequences with geocoded coordinates, scheduled arrival/departure timings, approach radiuses, shift specifications (morning pickup, evening drop-off, inter-campus shuttle), and academic-year scoping that preserves historical route and journey analytics.
- **Driver & Attendant Operations**: Transparent reuse of existing `staff_profiles` with commercial driver license verification, license expiry reminders, police background check audits, and authorized trip allocation.
- **Student Transport Allocations & Capacity Enforcement**: Atomic seat assignments linked to the Milestone 8 Fee Structure module. Database transactions prevent bus overcapacity at booking time.
- **Daily Journey Dispatch & Lifecycle**: Immutable dispatch logs with scheduled vs. actual start/end timestamps, delay alerts, cancellations, and emergency incident reporting.
- **Provider-Independent Live Telemetry**: Clean decoupling between raw GPS telemetry (hardware GPS units or driver mobile app) and consuming clients. Coordinates are strictly validated for range (-90 to +90 lat, -180 to +180 lng), staleness, out-of-order sequencing, and active journey authorization.
- **Driver Mobile Experience (`apps/mobile`)**: Native Expo/React Native driver console featuring assigned journeys, start/end controls, stop arrival checklists, delay reporting, offline queueing with safe re-sync, and user-visible GPS sharing banners.
- **Secure Pickup & Drop-off Verification**: Boarding and departure events logged with verification methods (driver manual, attendant check, QR verification), student status validation, and auditable manual corrections.
- **Parent Transport Portal (`/portal/parent`)**: Privacy-guarded view restricting live bus location, route details, and boarding events strictly to parents of actively assigned students. Telemetry is inaccessible when journeys are inactive or to unauthorized parties.
- **Transport Administration Dashboard (`/dashboard/transport`)**: 14 production-grade operational routes for fleet tracking, vehicle onboarding, driver profiles, route building, seat assignments, live vector maps, boarding oversight, maintenance logs, load factor analytics, and institution privacy policies.

```
+--------------------------------------------------------------------------------------------------------------------------+
|                                    UNIVERSAL TRANSPORT & LIVE TRACKING ENGINE                                            |
+--------------------------------------------------------------------------------------------------------------------------+
|  Vehicle Fleet & Statutory Compliance (`transport_vehicles`, `vehicle_documents`, `vehicle_maintenance_records`)         |
|    |                                                                                                                     |
|    +---> Seating Capacity, Active/Maintenance/Retired Status Guards, Expiring Document Audit Reminders                   |
|                                                                                                                          |
|  Routes, Stops & Scheduling (`transport_routes`, `transport_stops`, `transport_route_stops`)                              |
|    |                                                                                                                     |
|    +---> Ordered Stops, Geofences, Scheduled Times, Morning/Evening/Shuttle Shifts, Academic-Year Preservation          |
|                                                                                                                          |
|  Student Transport Allocation (`student_transport_assignments`)                                                          |
|    |                                                                                                                     |
|    +---> Atomic Seat Capacity Check (`assign_student_transport_atomic`), Stop Pairing, Fee Structure Link                |
|                                                                                                                          |
|  Daily Journey Dispatch & Operations (`transport_journeys`, `journey_stop_events`)                                       |
|    |                                                                                                                     |
|    +---> Trip Status Workflow, Departure Verification, Delay Notices, Emergency Escalation with Notification Dispatch   |
|                                                                                                                          |
|  Live Telemetry Engine (`vehicle_live_locations`, `vehicle_location_history`, `gps_device_registrations`)                  |
|    |                                                                                                                     |
|    +---> Range Bounds Validation, Out-of-Order Discard, Active Journey Gating, Automated 30-Day Retention Pruning        |
|                                                                                                                          |
|  Student Boarding Verification (`student_boarding_events`, `boarding_event_corrections`)                                 |
|    |                                                                                                                     |
|    +---> Pickup & Drop-off Timestamps, Method (Manual/QR/NFC), Audited Staff Corrections, Real-time Guardian Alerts       |
|                                                                                                                          |
|  Consumer Portals & Mobile Console (`/portal/parent`, `apps/mobile`)                                                    |
|    |                                                                                                                     |
|    +---> Parent Scoping: Strict Guardian-Student Gating (No Unrelated Vehicle or Passenger Visibility)                   |
|    +---> Driver Mobile App: Active Journey GPS Transmission with Clear Disclosures, Offline Event Queue                  |
+--------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Database Schema & Migration Architecture

Canonical migration files:
- **Up migration**: `supabase/migrations/20261106090000_transport_management.sql`
- **Rollback migration**: `supabase/migrations/rollback/20261106090000_rollback.sql`

### 2.1 Enums Defined
1. `transport_vehicle_type`: `'bus'`, `'mini_bus'`, `'van'`, `'shuttle'`, `'suv'`, `'custom'`.
2. `transport_vehicle_ownership`: `'institution_owned'`, `'contracted'`, `'leased'`, `'third_party'`.
3. `transport_vehicle_status`: `'active'`, `'inactive'`, `'under_maintenance'`, `'retired'`.
4. `vehicle_document_type`: `'registration'`, `'insurance'`, `'fitness_certificate'`, `'pollution_certificate'`, `'permit'`, `'tax_receipt'`, `'other'`.
5. `vehicle_document_status`: `'valid'`, `'expiring_soon'`, `'expired'`, `'suspended'`.
6. `transport_maintenance_type`: `'routine_service'`, `'repair'`, `'inspection'`, `'oil_change'`, `'tire_replacement'`, `'emergency'`.
7. `transport_maintenance_status`: `'scheduled'`, `'in_progress'`, `'completed'`, `'cancelled'`.
8. `transport_shift`: `'morning'`, `'evening'`, `'general'`, `'special'`, `'night'`.
9. `transport_route_type`: `'pickup_only'`, `'dropoff_only'`, `'both'`, `'shuttle'`.
10. `student_transport_status`: `'active'`, `'suspended'`, `'withdrawn'`, `'pending_approval'`.
11. `transport_change_request_type`: `'change_route'`, `'change_pickup_stop'`, `'change_dropoff_stop'`, `'temporary_suspension'`, `'withdrawal'`.
12. `transport_change_request_status`: `'pending'`, `'approved'`, `'rejected'`, `'cancelled'`.
13. `transport_journey_status`: `'scheduled'`, `'in_progress'`, `'delayed'`, `'completed'`, `'cancelled'`, `'emergency'`.
14. `transport_journey_type`: `'pickup'`, `'dropoff'`, `'shuttle'`, `'excursion'`.
15. `boarding_event_type`: `'pickup'`, `'dropoff'`, `'absent'`.
16. `boarding_verification_method`: `'driver_manual'`, `'attendant_manual'`, `'student_qr'`, `'rfid_card'`, `'biometric'`, `'admin_manual'`.

### 2.2 Tables Created
1. `transport_vehicles`: Fleet registry with registration number, VIN, make/model, seating capacity, assigned campus, and maintenance state.
2. `vehicle_documents`: Statutory certifications, issue/expiry dates, authorities, document URLs, and expiration alerts.
3. `vehicle_maintenance_records`: Scheduled and ad-hoc maintenance jobs, odometer logs, costs, vendor details, and completion audits.
4. `transport_staff_profiles`: Transport-specific metadata extending `staff_profiles` (commercial driver license number, license expiry, badge number, police verification status, and emergency contacts).
5. `transport_stops`: Geocoded stop catalog with latitude/longitude coordinates, address, landmark, and geofence radius.
6. `transport_routes`: Route configurations with code, name, shift, start/end locations, assigned vehicle, driver, attendant, and academic year.
7. `transport_route_stops`: Ordered junction associating stops to routes with sequence numbers, scheduled arrival/departure times, and boarding allowances.
8. `student_transport_assignments`: Student seat allocations with pickup/drop-off stops, academic year, status, and fee structure reference.
9. `transport_change_requests`: Guardian- or staff-initiated route or stop change requests with administrative approval workflows.
10. `transport_journeys`: Daily trip dispatch records with scheduled and actual timestamps, odometer readings, delays, and emergency flags.
11. `journey_stop_events`: Actual stop arrivals and departures logged during daily journeys.
12. `student_boarding_events`: Individual student boarding/drop-off logs with timestamps, verification methods, and vehicle coordinates.
13. `boarding_event_corrections`: Audited corrections for disputed or mistakenly recorded boarding events with mandatory justification.
14. `gps_device_registrations`: IoT and telematics device hardware registry with IMEI, API keys, and assigned vehicle bindings.
15. `vehicle_live_locations`: Hot table tracking current vehicle position, heading, speed, battery, and freshness timestamp.
16. `vehicle_location_history`: Historical breadcrumb telemetry partitioned/culled via retention policy.
17. `institution_transport_settings`: Per-tenant transport configuration (GPS provider, telemetry interval, location retention days, approaching stop alert radius).

### 2.3 Stored Procedures & Atomic Workflows
- `assign_student_transport_atomic(...)`: Atomically checks vehicle capacity against active assignments before creating or updating a student transport allocation.
- `update_journey_status_atomic(...)`: Transitions daily journey states, records timestamps, and dispatches Milestone 9 outbox notifications (`journey_started`, `delay`, `emergency`).
- `record_vehicle_gps_location_atomic(...)`: Validates incoming latitude/longitude, verifies active journey state, discards out-of-order updates, updates `vehicle_live_locations`, and appends breadcrumbs to `vehicle_location_history`.
- `record_student_boarding_atomic(...)`: Logs boarding events, prevents duplicate scans within configurable time windows, and generates real-time parent notifications.
- `purge_expired_location_history(...)`: Scheduled maintenance routine that deletes location telemetry older than the institution's retention threshold (default 30 days).

---

## 3. Live Vehicle Tracking & Provider-Independent Architecture

### 3.1 Gated Telemetry Pipeline
1. **Telemetry Ingestion**: Accepts GPS payload (`vehicle_id`, `journey_id`, `latitude`, `longitude`, `speed_kmh`, `heading`, `accuracy_meters`, `recorded_at`).
2. **Bounds & Freshness Check**: Latitude (-90 to +90) and longitude (-180 to +180) validation. Telemetry recorded with future timestamps or timestamps older than 10 minutes is discarded or flagged.
3. **Active Journey Authorization**: Telemetry is rejected unless the vehicle is currently executing an `'in_progress'` or `'delayed'` journey. Vehicles in standby or completed state cannot record location.
4. **Out-of-Order Discard**: If `recorded_at` is older than the latest entry in `vehicle_live_locations`, the stale position is ignored to prevent map jitter.

### 3.2 Reusable Vector Map Component (`TransportMap.tsx`)
Located at `apps/web/src/components/transport/TransportMap.tsx`:
- Renders routes as vector SVG polylines connecting ordered stop markers.
- Renders active vehicle position with directional heading marker and speed badge.
- Graceful offline fallback: Displays structured stop-by-stop transit itinerary with timestamps and coordinates when map credentials are absent.

---

## 4. Mobile Driver Experience (`apps/mobile`)

Located in `apps/mobile/src/screens/DashboardScreen.tsx`:
- **Role Detection**: Identifies assigned drivers via `staff_profiles` linked to active daily journeys.
- **Assigned Journeys Feed**: Displays today's scheduled runs, assigned bus registration, route name, and passenger count.
- **Trip Lifecycle Controls**: Interactive buttons to `Start Journey` and `End Journey` with immediate status updates.
- **Stop Arrival Checklist**: Drivers can mark arrival and departure at each scheduled stop along the route.
- **User-Visible Location Sharing Disclosure**: Prominent UI banner indicating `GPS Location Sharing: ACTIVE` while transmitting coordinates, and `GPS Tracking: STANDBY` when trips are completed.
- **Offline Event Queue**: Local storage queue allowing stop arrival and boarding events to be recorded without active cellular coverage and synchronized upon reconnection.

---

## 5. Pickup & Drop-Off Verification

Located at `/dashboard/transport/boarding`:
- **Boarding Logs**: Chronological log of student boarding and drop-off events with verification method (`driver_manual`, `attendant_manual`, `student_qr`).
- **Parent Confirmation**: Boarding triggers parent in-app alerts and notifications via Milestone 9 notification engine.
- **Audit Corrections**: Erroneous boarding entries can be corrected by authorized staff through `correctBoardingEventAction`, recording the correction reason and original author.

---

## 6. Parent Transport Portal (`/portal/parent`)

Integrated into `apps/web/src/app/portal/parent/ParentPortalClient.tsx`:
- **Guardian Gating**: Parents view transport details exclusively for their linked children via `student_guardians`.
- **Live Status Card**: Route name, assigned vehicle registration number, driver contact mechanism, and current trip status.
- **Live Route Visualization**: Displays interactive `TransportMap` with child's pickup and drop-off stops highlighted.
- **Boarding Timeline**: Shows timestamped pickup and drop-off confirmation for today's journeys.
- **Transport Change Request Entry**: Direct interface for parents to request route changes, stop changes, or temporary leaves.

---

## 7. Transport Administration Dashboard

Built with responsive design and honest empty states across 14 dedicated web routes:
1. `/dashboard/transport`: Executive transport overview with fleet status, active journeys, route utilization, and compliance alerts.
2. `/dashboard/transport/vehicles`: Vehicle inventory with registration, model, seating capacity, status filter, and document badges.
3. `/dashboard/transport/vehicles/new`: Fleet onboarding form with campus assignment and capacity validation.
4. `/dashboard/transport/drivers`: Transport staff profiles with commercial driver license verification and contact info.
5. `/dashboard/transport/routes`: Route directory with shift badges, distance, stops count, and assigned buses.
6. `/dashboard/transport/routes/new`: Interactive route builder with ordered stops, arrival/departure schedules, and driver assignments.
7. `/dashboard/transport/stops`: Central geocoded stop management with coordinates and landmark references.
8. `/dashboard/transport/assignments`: Student seat allocations, search, filter, and atomic capacity assignment modal.
9. `/dashboard/transport/journeys`: Daily trip dispatch dashboard with start/complete triggers, delay reporting, and emergency reporting.
10. `/dashboard/transport/tracking`: Live fleet tracking monitor with real-time vector map, speed, heading, and stale telemetry flags.
11. `/dashboard/transport/boarding`: Real-time boarding feed with pickup/drop-off verification and correction modal.
12. `/dashboard/transport/maintenance`: Vehicle maintenance log with service types, odometer readings, and costs.
13. `/dashboard/transport/reports`: Fleet seat utilization and route load distribution metrics.
14. `/dashboard/transport/settings`: Institution transport policy controls (GPS provider, ping frequency, retention period, and approaching alert distance).

---

## 8. Location Privacy & Safety Safeguards

1. **Vehicles, Not Children**: GPS coordinates belong strictly to vehicles and trips. No student personal device tracking is performed.
2. **Strict Time Boundaries**: GPS transmission terminates automatically upon journey completion. No background tracking outside authorized runs.
3. **No Public Endpoints**: Location APIs require authenticated sessions with verified tenant membership and route assignment.
4. **Automated Data Pruning**: Location breadcrumbs are automatically purged according to institutional retention policies (default: 30 days) to prevent perpetual data accumulation.
5. **Emergency Escalation**: Immediate incident reporting triggers urgent priority broadcast alerts to administrators and affected guardians.

---

## 9. RBAC & Row-Level Security

### 9.1 RBAC Matrix Extensions
Added 7 granular permissions across `@edu-platform/types`:
- `transport:manage`: Full transport administration (vehicles, routes, settings, drivers).
- `transport:view`: View routes, stops, and schedules.
- `transport:assign`: Assign students to transport routes and manage change requests.
- `transport:journey_manage`: Dispatch and manage daily journeys, delays, and emergencies.
- `transport:track`: Access live vehicle telemetry and route map visualizations.
- `transport:board`: Record and verify student pickup/drop-off events.
- `transport:driver`: Driver operational interface (start/end trip, transmit GPS, report delays).

| Role | transport:manage | transport:view | transport:assign | transport:journey_manage | transport:track | transport:board | transport:driver |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **owner** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **admin** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **transport_manager** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **academic_admin** | No | Yes | Yes | No | Yes | No | No |
| **principal** | No | Yes | Yes | Yes | Yes | Yes | No |
| **teacher** | No | Yes | No | No | Yes | Yes | No |
| **driver** | No | No | No | No | No | Yes | Yes |
| **parent** | No | Yes* | No | No | Yes* | No | No |
| **student** | No | Yes* | No | No | Yes* | No | No |

*\*Scoped strictly to assigned child/own route.*

### 9.2 RLS Policies
Implemented in `supabase/migrations/20261106090000_transport_management.sql`:
- `transport_vehicles_tenant_isolation`: Tenant-isolated CRUD for authorized transport staff.
- `transport_routes_tenant_isolation`: Route data viewable by institution members; editable by transport managers.
- `student_transport_assignments_isolation`: Visible to transport managers and verified parents of assigned students.
- `vehicle_live_locations_access`: Accessible strictly to institution staff and parents whose children are on that route. Blocked for strangers.
- `student_boarding_events_isolation`: Parents can query only boarding events matching their linked children.

---

## 10. Quality Gates & Verification Results

### 10.1 Automated Test Results
- **Unit & Security Tests**: **22 test files passed, 270/270 tests passed (100%)**
  - `tests/unit/transport-validators.test.ts` (19 tests) - Vehicle, route, stop, assignment, GPS, boarding, and settings schemas.
  - `tests/security/transport-security.test.ts` (11 tests) - Capacity enforcement, GPS validation, stale telemetry discard, parent privacy gating, stranger isolation.
  - `tests/unit/rbac.test.ts` (16 tests) - Transport permission assignment across all 11 system roles.
- **Workspace Typecheck (`npm run typecheck`)**: Passed with exit code 0 across all 6 packages (`@edu-platform/database`, `@edu-platform/supabase-client`, `@edu-platform/types`, `@edu-platform/validators`, `@edu-platform/mobile`, `@edu-platform/web`).
- **Shared Packages Build**: `tsc` build passed with exit code 0 for types, validators, and database.
- **Next.js Production Build**: `npx --workspace=@edu-platform/web next build` compiled all 14 dynamic transport routes successfully with exit code 0.
- **Expo Bundling Validation**: Verified production Android Hermes and standard bundling with inlined `EXPO_PUBLIC_*` credentials.

### 10.2 External Integrations Requiring Production Configuration
1. **Hardware Telematics (GPS Devices)**:
   - GPS devices require pointing to the telematics ingestion endpoint with vehicle IMEI and device authentication tokens.
2. **Mapping Provider API Key**:
   - Leaflet / Mapbox / Google Maps tiles can be configured in `apps/web` environment variables. Vector SVG map is used as fallback.
3. **EAS Build Environment Variables**:
   - `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` must have the `preview` environment box checked in the Expo dashboard.
