import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { AUVRYN_COLORS } from '@edu-platform/types';
import { RealtimeStatusIndicator } from '../components/RealtimeStatusIndicator';

interface OwnerMobileNavigatorProps {
  userId: string;
  userEmail: string;
  institutionId: string;
  institutionName: string;
  educationType?: string;
  connectionState?: any;
  onSignOut: () => void;
}

type OwnerTab = 'overview' | 'students' | 'faculty' | 'announcements' | 'notifications' | 'profile';

export const OwnerMobileNavigator: React.FC<OwnerMobileNavigatorProps> = ({
  userId,
  userEmail,
  institutionId,
  institutionName,
  educationType = 'primary_school',
  connectionState = 'connected',
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<OwnerTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentsCount, setStudentsCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Announcement composer state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'standard' | 'important' | 'urgent'>('standard');
  const [isPublishingAnn, setIsPublishingAnn] = useState(false);
  const [annSuccessMsg, setAnnSuccessMsg] = useState<string | null>(null);

  const fetchOwnerData = useCallback(async () => {
    if (!supabase || !institutionId) {
      setLoading(false);
      return;
    }

    try {
      const [
        { count: stuCount },
        { count: stfCount },
        { data: campList },
        { data: ayList },
        { data: annList },
        { data: notifList },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('status', 'active'),
        supabase.from('staff_profiles').select('*', { count: 'exact', head: true }).eq('institution_id', institutionId),
        supabase.from('campuses').select('*').eq('institution_id', institutionId),
        supabase.from('academic_years').select('*').eq('institution_id', institutionId),
        supabase.from('announcements').select('*').eq('institution_id', institutionId).order('published_at', { ascending: false }).limit(10),
        supabase.from('notifications').select('*').eq('institution_id', institutionId).eq('recipient_user_id', userId).order('created_at', { ascending: false }).limit(20),
      ]);

      setStudentsCount(stuCount || 0);
      setStaffCount(stfCount || 0);
      setCampuses(campList || []);
      setAcademicYears(ayList || []);
      setAnnouncements(annList || []);

      const notifs = notifList || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: any) => !n.is_read).length);
    } catch {
      // Non-blocking error handling
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [institutionId, userId]);

  useEffect(() => {
    fetchOwnerData();
  }, [fetchOwnerData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOwnerData();
  };

  const handlePublishAnnouncement = async () => {
    if (!supabase || !annTitle.trim() || !annContent.trim()) return;
    setIsPublishingAnn(true);

    try {
      await (supabase as any).from('announcements').insert({
        institution_id: institutionId,
        title: annTitle.trim(),
        content: annContent.trim(),
        priority: annPriority,
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: userId,
      });

      setAnnSuccessMsg('Announcement broadcast successfully!');
      setAnnTitle('');
      setAnnContent('');
      setTimeout(() => setAnnSuccessMsg(null), 3500);
      fetchOwnerData();
    } catch {
      setAnnSuccessMsg('Error broadcasting announcement.');
    } finally {
      setIsPublishingAnn(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AUVRYN_COLORS.electricBlue} />
        <Text style={styles.loadingText}>Loading Executive Workspace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>AUVRYN</Text>
          <Text style={styles.instName} numberOfLines={1}>
            {institutionName} &bull; Executive Portal
          </Text>
        </View>
        <View style={styles.headerRight}>
          <RealtimeStatusIndicator state={connectionState} />
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            {/* Executive Badge Card */}
            <View style={styles.execCard}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  Institution Lead / Administrator
                </Text>
              </View>
              <Text style={styles.execTitle}>{institutionName}</Text>
              <Text style={styles.execMeta}>
                Education Type: {educationType.toUpperCase()} &bull; Campuses: {campuses.length}
              </Text>
            </View>

            {/* Quick KPI Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ENROLLMENT</Text>
                <Text style={styles.statValue}>{studentsCount}</Text>
                <Text style={styles.statSub}>Active learners</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>FACULTY</Text>
                <Text style={styles.statValue}>{staffCount}</Text>
                <Text style={styles.statSub}>Educators & staff</Text>
              </View>
            </View>

            {/* Campuses & Calendar */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Campuses & Infrastructure</Text>
              {campuses.map((c) => (
                <View key={c.id} style={styles.listItem}>
                  <Text style={styles.itemTitle}>{c.name} ({c.code})</Text>
                  <Text style={styles.itemSub}>{c.city}, {c.state || c.country}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Academic Years</Text>
              {academicYears.map((ay) => (
                <View key={ay.id} style={styles.listItem}>
                  <Text style={styles.itemTitle}>{ay.name} ({ay.code})</Text>
                  <Text style={styles.itemSub}>{ay.start_date} to {ay.end_date}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 2: STUDENTS */}
        {activeTab === 'students' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Students Overview</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Active Students: {studentsCount}</Text>
              <Text style={styles.itemSub}>
                To manage individual enrollments and section assignments, access the AUVRYN web administrative console.
              </Text>
            </View>
          </View>
        )}

        {/* TAB 3: FACULTY */}
        {activeTab === 'faculty' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Faculty & Staff Directory</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Active Staff: {staffCount}</Text>
              <Text style={styles.itemSub}>
                All faculty allocations and teaching assignments are synchronized across mobile and web.
              </Text>
            </View>
          </View>
        )}

        {/* TAB 4: ANNOUNCEMENTS COMPOSER */}
        {activeTab === 'announcements' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Publish Announcement</Text>

            {annSuccessMsg && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>{annSuccessMsg}</Text>
              </View>
            )}

            {/* Broadcast Composer */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>New Institutional Circular</Text>
              <TextInput
                style={styles.input}
                placeholder="Title (e.g. Annual Sports Meet Schedule)"
                placeholderTextColor="#94A3B8"
                value={annTitle}
                onChangeText={setAnnTitle}
              />
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Announcement Details & Instructions..."
                placeholderTextColor="#94A3B8"
                value={annContent}
                onChangeText={setAnnContent}
                multiline
              />

              {/* Priority Selector */}
              <View style={styles.priorityRow}>
                <Text style={styles.priorityLabel}>Priority:</Text>
                {(['standard', 'important', 'urgent'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityPill,
                      annPriority === p && styles.priorityPillActive,
                    ]}
                    onPress={() => setAnnPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityPillText,
                        annPriority === p && styles.priorityPillTextActive,
                      ]}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.publishBtn, isPublishingAnn && styles.btnDisabled]}
                onPress={handlePublishAnnouncement}
                disabled={isPublishingAnn}
              >
                <Text style={styles.publishBtnText}>
                  {isPublishingAnn ? 'Broadcasting...' : 'Broadcast to Ecosystem'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Existing Announcements */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Bulletins</Text>
            {announcements.map((a) => (
              <View key={a.id} style={styles.annCard}>
                <View style={styles.annTop}>
                  <Text style={styles.annTitle}>{a.title}</Text>
                  <Text style={styles.annPriority}>{a.priority?.toUpperCase()}</Text>
                </View>
                <Text style={styles.annContent}>{a.content}</Text>
                <Text style={styles.annDate}>
                  Published: {new Date(a.published_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <View style={styles.section}>
            <View style={styles.notifHeader}>
              <Text style={styles.sectionTitle}>System & Administrative Alerts</Text>
              {unreadCount > 0 && (
                <Text style={styles.unreadBadge}>{unreadCount} unread</Text>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No alerts pending.</Text>
              </View>
            ) : (
              notifications.map((n) => (
                <View key={n.id} style={[styles.notifItem, !n.is_read && styles.notifItemUnread]}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody}>{n.body}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 6: PROFILE */}
        {activeTab === 'profile' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Executive Account</Text>
              <Text style={styles.itemTitle}>{userEmail}</Text>
              <Text style={styles.itemSub}>Role: Institutional Administrator</Text>
              <Text style={styles.itemSub}>Institution: {institutionName}</Text>
            </View>

            <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out of AUVRYN</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabLabel, activeTab === 'overview' && styles.tabLabelActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'announcements' && styles.tabButtonActive]}
          onPress={() => setActiveTab('announcements')}
        >
          <Text style={[styles.tabLabel, activeTab === 'announcements' && styles.tabLabelActive]}>Broadcast</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'students' && styles.tabButtonActive]}
          onPress={() => setActiveTab('students')}
        >
          <Text style={[styles.tabLabel, activeTab === 'students' && styles.tabLabelActive]}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'faculty' && styles.tabButtonActive]}
          onPress={() => setActiveTab('faculty')}
        >
          <Text style={[styles.tabLabel, activeTab === 'faculty' && styles.tabLabelActive]}>Faculty</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'notifications' && styles.tabButtonActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabLabel, activeTab === 'notifications' && styles.tabLabelActive]}>
            Alerts {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'profile' && styles.tabButtonActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#0B1E3F',
  },
  headerLeft: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  instName: {
    fontSize: 11,
    color: '#93C5FD',
    marginTop: 1,
  },
  headerRight: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1E3F',
    marginBottom: 12,
  },
  execCard: {
    backgroundColor: '#0B1E3F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  execTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  execMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B1E3F',
    marginTop: 4,
  },
  statSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B1E3F',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1E293B',
    marginBottom: 10,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priorityLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  priorityPillActive: {
    backgroundColor: '#2563EB',
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  priorityPillTextActive: {
    color: '#FFFFFF',
  },
  publishBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  successBanner: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  successBannerText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  annCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  annTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  annTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B1E3F',
  },
  annPriority: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  annContent: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  annDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  unreadBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  notifItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  notifItemUnread: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B1E3F',
  },
  notifBody: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  signOutButton: {
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  signOutButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabButtonActive: {
    borderTopWidth: 2,
    borderTopColor: '#2563EB',
    marginTop: -2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
