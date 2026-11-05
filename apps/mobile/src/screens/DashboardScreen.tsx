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
  try {
    await supabase.from('push_device_tokens').upsert(
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

  const fetchData = async () => {
    try {
      // 1. Fetch memberships with institutions
      const { data: mems } = await supabase
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
          supabase
            .from('campuses')
            .select('*')
            .eq('institution_id', activeInstId),
          supabase
            .from('academic_years')
            .select('*')
            .eq('institution_id', activeInstId),
          supabase
            .from('announcements')
            .select('id, title, content, priority, published_at')
            .eq('institution_id', activeInstId)
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(4),
          supabase
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
          const { data: st } = await supabase
            .from('students')
            .select('id, admission_number, first_name, last_name')
            .eq('institution_id', activeInstId)
            .eq('user_id', userId)
            .single();

          if (st) {
            const [{ data: att }, { count: hwCount }] = await Promise.all([
              supabase.from('student_attendance_records').select('status').eq('student_id', st.id),
              supabase.from('homework_assignments').select('*', { count: 'exact', head: true }).eq('institution_id', activeInstId).eq('status', 'published'),
            ]);

            const total = att?.length || 0;
            const present = (att || []).filter((a: any) => a.status === 'present').length;
            const pct = total > 0 ? Math.round((present / total) * 100) : 100;

            setStudentSummary({
              student: st,
              attendancePct: pct,
              pendingHomework: hwCount || 0,
            });
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
    await supabase.auth.signOut();
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
});
