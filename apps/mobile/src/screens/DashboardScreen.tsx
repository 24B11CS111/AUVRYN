import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import type { InstitutionMembership } from '@edu-platform/types';
import type { CampusRow, AcademicYearRow } from '@edu-platform/database';
import { INSTITUTION_TYPE_DEFINITIONS } from '@edu-platform/types';

interface DashboardScreenProps {
  userId: string;
  userEmail: string;
}

export const registerPushDeviceToken = async (
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web'
) => {
  const client = supabase;
  if (!client) return;

  try {
    await client.from('push_device_tokens').upsert(
      {
        user_id: userId,
        token,
        platform,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, token' }
    );
  } catch (err) {
    console.error('Failed to register push token:', err);
  }
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ userId, userEmail }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberships, setMemberships] = useState<InstitutionMembership[]>([]);
  const [campuses, setCampuses] = useState<CampusRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [studentSummary, setStudentSummary] = useState<any | null>(null);

  // Driver Experience State
  const [driverProfile, setDriverProfile] = useState<any | null>(null);
  const [driverJourneys, setDriverJourneys] = useState<any[]>([]);
  const [isGpsSharingActive, setIsGpsSharingActive] = useState<boolean>(false);
  const [offlineEventQueue, setOfflineEventQueue] = useState<any[]>([]);

  // Milestone 11: Library, Hostel, Events
  const [librarySummary, setLibrarySummary] = useState<{
    borrowedCount: number;
    nearestDueDate: string | null;
    books: { id: string; title: string; dueDate: string }[];
  } | null>(null);
  const [hostelSummary, setHostelSummary] = useState<{
    allocation: any | null;
    latestOutpass: any | null;
  } | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  const fetchData = async () => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch memberships with institutions
      const { data: mems } = await client
        .from('institution_memberships')
        .select(`
          id,
          institution_id,
          user_id,
          role,
          status,
          title,
          department,
          joined_at,
          institutions:institution_id (
            id,
            name,
            code,
            slug,
            type,
            status,
            city,
            state,
            country
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      const parsedMems: any[] = (mems || []).map((m: any) => ({
        ...m,
        institution: m.institutions,
      }));

      setMemberships(parsedMems);

      // If membership exists, fetch campuses and academic years for the active institution
      const activeInstId = parsedMems[0]?.institution_id;
      const userRole = parsedMems[0]?.role;

      if (activeInstId) {
        const [{ data: camps }, { data: ays }, { data: anns }, { data: notifs }] = await Promise.all([
          client
            .from('campuses')
            .select('*')
            .eq('institution_id', activeInstId),
          client
            .from('academic_years')
            .select('*')
            .eq('institution_id', activeInstId),
          client
            .from('announcements')
            .select('id, title, content, priority, published_at')
            .eq('institution_id', activeInstId)
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(4),
          client
            .from('notifications')
            .select('id, title, body, category, is_read, created_at')
            .eq('institution_id', activeInstId)
            .eq('recipient_user_id', userId)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(4),
        ]);

        setCampuses(camps || []);
        setAcademicYears(ays || []);
        setAnnouncements(anns || []);
        setNotifications(notifs || []);

        // If student role, fetch summary
        if (userRole === 'student') {
          const { data: st } = await client
            .from('students')
            .select('id, admission_number, first_name, last_name')
            .eq('institution_id', activeInstId)
            .eq('user_id', userId)
            .single();

          if (st) {
            const [{ data: att }, { count: hwCount }] = await Promise.all([
              client.from('student_attendance_records').select('status').eq('student_id', st.id),
              client.from('homework_assignments').select('*', { count: 'exact', head: true }).eq('institution_id', activeInstId).eq('status', 'published'),
            ]);

            const total = att?.length || 0;
            const present = (att || []).filter((a: any) => a.status === 'present').length;
            const pct = total > 0 ? Math.round((present / total) * 100) : 100;

            setStudentSummary({
              student: st,
              attendancePct: pct,
              pendingHomework: hwCount || 0,
            });

            // Milestone 11 queries for student
            const { data: libMember } = await client
              .from('library_members')
              .select('id, membership_number')
              .eq('institution_id', activeInstId)
              .eq('student_id', st.id)
              .maybeSingle();

            let activeCircs: any[] = [];
            if (libMember) {
              const { data: circs } = await (client as any)
                .from('library_circulations')
                .select('id, due_date, status, copy:library_book_copies(book:library_books(title))')
                .eq('institution_id', activeInstId)
                .eq('member_id', libMember.id)
                .eq('status', 'issued');
              activeCircs = circs || [];
            }

            const [
              { data: hostelAlloc },
              { data: latestOutpass },
            ] = await Promise.all([
              (client as any)
                .from('hostel_allocations')
                .select('id, status, bed:hostel_beds(bed_number, room:hostel_rooms(room_number, building:hostel_buildings(name)))')
                .eq('institution_id', activeInstId)
                .eq('student_id', st.id)
                .eq('status', 'active')
                .maybeSingle(),
              client
                .from('hostel_outpasses')
                .select('id, purpose, destination, departure_time, expected_return_time, status, gate_pass_code')
                .eq('institution_id', activeInstId)
                .eq('student_id', st.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            ]);

            const nearestDue =
              activeCircs.length > 0
                ? activeCircs.map((c: any) => c.due_date).sort()[0]
                : null;

            setLibrarySummary({
              borrowedCount: activeCircs.length,
              nearestDueDate: nearestDue,
              books: activeCircs.map((c: any) => ({
                id: c.id,
                title: c.copy?.book?.title || 'Library Title',
                dueDate: c.due_date,
              })),
            });

            setHostelSummary({
              allocation: hostelAlloc || null,
              latestOutpass: latestOutpass || null,
            });
          }
        }

        // Fetch upcoming campus events for all roles
        const { data: eventsList } = await client
          .from('institution_events')
          .select('id, title, event_type, venue, start_time')
          .eq('institution_id', activeInstId)
          .eq('status', 'published')
          .order('start_time', { ascending: true })
          .limit(3);

        setUpcomingEvents(eventsList || []);

        // If staff, check if assigned as driver for today's journeys
        const { data: staffMember } = await client
          .from('staff_profiles')
          .select('id, first_name, last_name')
          .eq('institution_id', activeInstId)
          .eq('user_id', userId)
          .maybeSingle();

        if (staffMember) {
          setDriverProfile(staffMember);
          const todayStr = (new Date().toISOString().split('T')[0])!;
          const { data: journeys } = await client
            .from('transport_journeys')
            .select(`
              id,
              status,
              shift,
              journey_type,
              delay_minutes,
              route:transport_routes(id, route_name, route_code),
              vehicle:transport_vehicles(id, registration_number, vehicle_model)
            `)
            .eq('institution_id', activeInstId)
            .eq('driver_id', staffMember.id)
            .eq('journey_date', todayStr);

          const list = journeys || [];
          setDriverJourneys(list);
          const active = list.find((j: any) => j.status === 'in_progress');
          if (active) {
            setIsGpsSharingActive(true);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSignOut = async () => {
    const client = supabase;
    if (!client) return;
    await client.auth.signOut();
  };

  const handleStartDriverJourney = async (journey: any) => {
    const client = supabase;
    if (!client) return;

    try {
      await client
        .from('transport_journeys')
        .update({
          status: 'in_progress',
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', journey.id);

      setIsGpsSharingActive(true);
      setDriverJourneys((prev) =>
        prev.map((j) => (j.id === journey.id ? { ...j, status: 'in_progress' } : j))
      );
    } catch (err) {
      console.error('Failed to start journey:', err);
    }
  };

  const handleEndDriverJourney = async (journeyId: string) => {
    const client = supabase;
    if (!client) return;

    try {
      await client
        .from('transport_journeys')
        .update({
          status: 'completed',
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', journeyId);

      setIsGpsSharingActive(false);
      setDriverJourneys((prev) =>
        prev.map((j) => (j.id === journeyId ? { ...j, status: 'completed' } : j))
      );
    } catch (err) {
      console.error('Failed to complete journey:', err);
    }
  };

  const handleRecordOfflineStopArrival = (stopName: string) => {
    const event = {
      type: 'stop_arrival',
      stopName,
      timestamp: new Date().toISOString(),
      synced: false,
    };
    setOfflineEventQueue((prev) => [event, ...prev]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.loadingText}>Loading institution workspace...</Text>
      </View>
    );
  }

  const activeMembership = memberships[0];
  const institution = activeMembership?.institution;
  const typeDef = institution ? INSTITUTION_TYPE_DEFINITIONS[institution.type] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Top Bar Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Signed in as</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>
        <Button
          title="Sign Out"
          variant="outline"
          onPress={handleSignOut}
          style={styles.signOutBtn}
          textStyle={styles.signOutText}
        />
      </View>

      {/* Institution Banner Card */}
      {institution ? (
        <View style={styles.card}>
          <View style={styles.instHeader}>
            <View style={styles.instIcon}>
              <Text style={styles.instIconText}>
                {institution.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.instInfo}>
              <Text style={styles.instName}>{institution.name}</Text>
              <Text style={styles.instType}>
                {typeDef?.label || institution.type}
              </Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Code: {institution.code}</Text>
            </View>
            <View style={[styles.badge, styles.roleBadge]}>
              <Text style={[styles.badgeText, styles.roleBadgeText]}>
                Role: {activeMembership.role}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Location: {institution.city}, {institution.state}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.instName}>No Institution Affiliation</Text>
          <Text style={styles.metaText}>
            Please complete the onboarding flow on the web dashboard to create or join an institution.
          </Text>
        </View>
      )}

      {/* Student Academic Hub if student */}
      {studentSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Academic Hub</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{studentSummary.attendancePct}%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{studentSummary.pendingHomework}</Text>
              <Text style={styles.statLabel}>Assignments</Text>
            </View>
          </View>
        </View>
      )}

      {/* Student Library Loans Card */}
      {librarySummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Library & Borrowed Books</Text>
          <View style={styles.card}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{librarySummary.borrowedCount}</Text>
                <Text style={styles.statLabel}>Books on Loan</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { fontSize: 13, color: '#dc2626' }]}>
                  {librarySummary.nearestDueDate || 'None'}
                </Text>
                <Text style={styles.statLabel}>Next Due Date</Text>
              </View>
            </View>

            {librarySummary.books.length > 0 && (
              <View style={styles.bookList}>
                {librarySummary.books.map((b) => (
                  <View key={b.id} style={styles.bookItem}>
                    <Text style={styles.bookTitle} numberOfLines={1}>{b.title}</Text>
                    <Text style={styles.bookDue}>Due: {b.dueDate}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Hostel & Outpasses Card */}
      {hostelSummary?.allocation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hostel & Boarding</Text>
          <View style={styles.card}>
            <Text style={styles.hostelRoomText}>
              Bed {hostelSummary.allocation.bed?.bed_number} • Room {hostelSummary.allocation.bed?.room?.room_number}
            </Text>
            <Text style={styles.hostelBlockText}>
              {hostelSummary.allocation.bed?.room?.building?.name || 'Hostel Block'}
            </Text>

            {hostelSummary.latestOutpass && (
              <View style={styles.outpassBox}>
                <Text style={styles.outpassTitle}>
                  Latest Outpass: {hostelSummary.latestOutpass.purpose}
                </Text>
                <Text style={styles.outpassSub}>
                  Destination: {hostelSummary.latestOutpass.destination}
                </Text>
                <View style={styles.gatePassBadge}>
                  <Text style={styles.gatePassText}>
                    Status: {hostelSummary.latestOutpass.status.toUpperCase()} • Code: {hostelSummary.latestOutpass.gate_pass_code}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Campus Events Card */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Campus Events</Text>
          {upcomingEvents.map((evt) => (
            <View key={evt.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{evt.title}</Text>
                <View style={styles.eventTypeBadge}>
                  <Text style={styles.eventTypeText}>{evt.event_type.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.eventSub}>
                {evt.venue} • {evt.start_time?.split('T')[0]} {evt.start_time?.split('T')[1]?.slice(0, 5)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Driver Operations Hub if driver */}
      {driverJourneys.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Transport Operations</Text>
          {driverProfile && (
            <Text style={styles.entitySubtitle}>
              Assigned Staff: {driverProfile.first_name} {driverProfile.last_name}
            </Text>
          )}

          {/* Location Sharing Disclosure & Banner */}
          <View
            style={[
              styles.gpsBanner,
              isGpsSharingActive ? styles.gpsActiveBanner : styles.gpsInactiveBanner,
            ]}
          >
            <Text style={styles.gpsBannerTitle}>
              {isGpsSharingActive
                ? 'GPS Location Sharing: ACTIVE'
                : 'GPS Tracking: STANDBY'}
            </Text>
            <Text style={styles.gpsBannerSubtitle}>
              {isGpsSharingActive
                ? 'Transmitting vehicle coordinates strictly for current authorized journey. Tracking terminates automatically upon completion.'
                : 'Location is not shared while journeys are in standby or completed.'}
            </Text>
          </View>

          {/* Assigned Journeys */}
          {driverJourneys.map((dj) => (
            <View key={dj.id} style={styles.driverJourneyCard}>
              <View style={styles.journeyHeader}>
                <View>
                  <Text style={styles.journeyTitle}>
                    {dj.route?.route_name || 'Route'} ({dj.route?.route_code})
                  </Text>
                  <Text style={styles.journeySub}>
                    Bus: {dj.vehicle?.registration_number} • Shift: {dj.shift}
                  </Text>
                </View>
                <View
                  style={[
                    styles.journeyBadge,
                    dj.status === 'in_progress'
                      ? styles.badgeLive
                      : styles.badgeScheduled,
                  ]}
                >
                  <Text style={styles.journeyBadgeText}>
                    {dj.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.journeyActions}>
                {dj.status === 'scheduled' && (
                  <Button
                    title="Start Authorized Journey"
                    onPress={() => handleStartDriverJourney(dj)}
                    style={styles.actionBtnStart}
                    textStyle={styles.actionBtnText}
                  />
                )}
                {dj.status === 'in_progress' && (
                  <View style={styles.inProgressActionRow}>
                    <Button
                      title="Mark Next Stop"
                      variant="outline"
                      onPress={() => handleRecordOfflineStopArrival('Next Scheduled Stop')}
                      style={styles.actionBtnStop}
                      textStyle={styles.actionBtnStopText}
                    />
                    <Button
                      title="End Journey"
                      onPress={() => handleEndDriverJourney(dj.id)}
                      style={styles.actionBtnEnd}
                      textStyle={styles.actionBtnText}
                    />
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Offline Sync Status */}
          {offlineEventQueue.length > 0 && (
            <View style={styles.offlineBox}>
              <Text style={styles.offlineTitle}>
                Offline Event Queue: {offlineEventQueue.length} events pending sync
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Unread Notifications Feed */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications ({notifications.length})</Text>
          {notifications.map((n) => (
            <View key={n.id} style={styles.notifItem}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              <Text style={styles.notifBody}>{n.body}</Text>
            </View>
          ))}
        </View>
      )}

      {/* School Circulars Feed */}
      {announcements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>School Circulars & Notices</Text>
          {announcements.map((ann) => (
            <View key={ann.id} style={styles.annItem}>
              <View style={styles.annHeader}>
                <Text style={styles.annTitle}>{ann.title}</Text>
                <Text style={styles.annPriority}>{ann.priority}</Text>
              </View>
              <Text style={styles.annContent} numberOfLines={2}>{ann.content}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Entities Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registered Campuses</Text>
        {campuses.length > 0 ? (
          campuses.map((c) => (
            <View key={c.id} style={styles.entityItem}>
              <View>
                <Text style={styles.entityTitle}>{c.name}</Text>
                <Text style={styles.entitySubtitle}>
                  {c.code} &bull; {c.city}
                </Text>
              </View>
              {c.is_primary && (
                <View style={styles.primaryTag}>
                  <Text style={styles.primaryTagText}>Primary</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No campuses found</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Academic Calendar</Text>
        {academicYears.length > 0 ? (
          academicYears.map((ay) => (
            <View key={ay.id} style={styles.entityItem}>
              <View>
                <Text style={styles.entityTitle}>{ay.name}</Text>
                <Text style={styles.entitySubtitle}>
                  System: {ay.term_system}
                </Text>
              </View>
              {ay.is_current && (
                <View style={styles.primaryTag}>
                  <Text style={styles.primaryTagText}>Current</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No academic years configured</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingTop: 50,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  signOutBtn: {
    height: 36,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontSize: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  instHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instIconText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instInfo: {
    flex: 1,
  },
  instName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  instType: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  roleBadge: {
    backgroundColor: '#e0e7ff',
  },
  roleBadgeText: {
    color: '#4338ca',
  },
  metaRow: {
    marginTop: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  entityItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  entitySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  primaryTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  primaryTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  notifItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  notifBody: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  annItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  annHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  annTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  annPriority: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#4338ca',
  },
  annContent: {
    fontSize: 11,
    color: '#64748b',
  },
  gpsBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  gpsActiveBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  gpsInactiveBanner: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  gpsBannerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#065f46',
  },
  gpsBannerSubtitle: {
    fontSize: 10,
    color: '#047857',
    marginTop: 2,
  },
  driverJourneyCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  journeyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  journeySub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  journeyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLive: {
    backgroundColor: '#d1fae5',
  },
  badgeScheduled: {
    backgroundColor: '#f1f5f9',
  },
  journeyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#065f46',
  },
  journeyActions: {
    marginTop: 6,
  },
  actionBtnStart: {
    height: 38,
    backgroundColor: '#059669',
  },
  inProgressActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnStop: {
    flex: 1,
    height: 36,
    borderColor: '#cbd5e1',
  },
  actionBtnStopText: {
    fontSize: 11,
    color: '#334155',
  },
  actionBtnEnd: {
    flex: 1,
    height: 36,
    backgroundColor: '#0f172a',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  offlineBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  offlineTitle: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
  bookList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  bookTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  bookDue: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  hostelRoomText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  hostelBlockText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 8,
  },
  outpassBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  outpassTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  outpassSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  gatePassBadge: {
    marginTop: 6,
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  gatePassText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1',
  },
  eventCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  eventTypeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventTypeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  eventSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
});
