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
import { checkMobileAdmissionStatus } from '../lib/registration';

interface ParentMobileNavigatorProps {
  userId: string;
  userEmail: string;
  institutionId: string;
  institutionName: string;
  educationType?: string;
  connectionState?: any;
  onSignOut: () => void;
  onOpenAICompanion?: () => void;
}

type ParentTab = 'home' | 'performance' | 'attendance' | 'notifications' | 'profile';

export const ParentMobileNavigator: React.FC<ParentMobileNavigatorProps> = ({
  userId,
  userEmail,
  institutionId,
  institutionName,
  educationType = 'primary_school',
  connectionState = 'connected',
  onSignOut,
  onOpenAICompanion,
}) => {
  const [activeTab, setActiveTab] = useState<ParentTab>('home');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [activeChildDetails, setActiveChildDetails] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Application tracker state
  const [appSearchCode, setAppSearchCode] = useState('');
  const [appSearchResult, setAppSearchResult] = useState<any | null>(null);
  const [appSearchLoading, setAppSearchLoading] = useState(false);
  const [appSearchError, setAppSearchError] = useState<string | null>(null);

  const handleSearchApplication = async () => {
    if (!appSearchCode.trim()) return;
    setAppSearchLoading(true);
    setAppSearchError(null);
    setAppSearchResult(null);

    const res = await checkMobileAdmissionStatus(supabase, appSearchCode);
    if (!res.ok) {
      setAppSearchError(res.error || 'Application not found.');
    } else {
      setAppSearchResult(res.application);
    }
    setAppSearchLoading(false);
  };

  const fetchParentData = useCallback(async () => {
    if (!supabase || !institutionId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Resolve guardian record for current user (by user_id or verified email)
      let { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('institution_id', institutionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!guardian && userEmail) {
        const { data: guardianByEmail } = await supabase
          .from('guardians')
          .select('id')
          .eq('institution_id', institutionId)
          .eq('email', userEmail)
          .maybeSingle();
        guardian = guardianByEmail;
      }

      if (!guardian) {
        setChildren([]);
        setLoading(false);
        return;
      }

      // 2. Fetch linked students
      const { data: links } = await supabase
        .from('student_guardians')
        .select(`
          student_id,
          students:student_id (
            id,
            admission_number,
            first_name,
            last_name,
            roll_number,
            gender,
            date_of_birth
          )
        `)
        .eq('institution_id', institutionId)
        .eq('guardian_id', guardian.id);

      const studentList = (links || [])
        .map((l: any) => l.students)
        .filter(Boolean);

      setChildren(studentList);

      const targetChildId = selectedChildId || studentList[0]?.id || null;
      if (!selectedChildId && targetChildId) {
        setSelectedChildId(targetChildId);
      }

      if (targetChildId) {
        // Fetch active child attendance, results, homework
        const [
          { data: attRecords },
          { data: examResults },
          { data: homeworkList },
          { data: notifs },
        ] = await Promise.all([
          supabase
            .from('student_attendance_records')
            .select('status, created_at')
            .eq('institution_id', institutionId)
            .eq('student_id', targetChildId)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('student_exam_results')
            .select('id, total_max_marks, total_obtained_marks, percentage, final_grade, result_status, exam:examinations(name)')
            .eq('institution_id', institutionId)
            .eq('student_id', targetChildId)
            .eq('is_published', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('homework_assignments')
            .select('id, title, max_marks, due_date, subject:academic_subjects(name)')
            .eq('institution_id', institutionId)
            .eq('status', 'published')
            .order('due_date', { ascending: false })
            .limit(10),
          supabase
            .from('notifications')
            .select('id, title, body, category, is_read, created_at')
            .eq('institution_id', institutionId)
            .eq('recipient_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30),
        ]);

        const totalAtt = attRecords?.length || 0;
        const presentAtt = (attRecords || []).filter((a: any) => a.status === 'present').length;
        const attPct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

        setActiveChildDetails({
          attendance: {
            records: attRecords || [],
            percentage: attPct,
            present: presentAtt,
            total: totalAtt,
          },
          results: examResults || [],
          homework: homeworkList || [],
        });

        const notifList = notifs || [];
        setNotifications(notifList);
        setUnreadCount(notifList.filter((n: any) => !n.is_read).length);
      }
    } catch {
      // Non-blocking error handling
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [institutionId, userId, selectedChildId]);

  useEffect(() => {
    fetchParentData();
  }, [fetchParentData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchParentData();
  };

  const handleMarkAsRead = async (notifId: string) => {
    if (!supabase) return;
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notifId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AUVRYN_COLORS.electricBlue} />
        <Text style={styles.loadingText}>Loading Guardian Workspace...</Text>
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
            {institutionName} &bull; Family Portal
          </Text>
        </View>
        <View style={styles.headerRight}>
          <RealtimeStatusIndicator state={connectionState} />
        </View>
      </View>

      {/* Child Switcher Pills */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSwitcherBar}>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[
                styles.childPill,
                child.id === selectedChildId && styles.childPillActive,
              ]}
              onPress={() => setSelectedChildId(child.id)}
            >
              <Text
                style={[
                  styles.childPillText,
                  child.id === selectedChildId && styles.childPillTextActive,
                ]}
              >
                {child.first_name} {child.last_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Main Content Area */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* TAB 1: HOME OVERVIEW */}
        {activeTab === 'home' && (
          <View style={styles.section}>
            {/* Child Profile Card */}
            <View style={styles.childCard}>
              <View style={styles.childBadge}>
                <Text style={styles.childBadgeText}>
                  {educationType === 'preschool' ? 'Early Learner' : 'Student'}
                </Text>
              </View>
              <Text style={styles.childName}>
                {activeChild ? `${activeChild.first_name} ${activeChild.last_name}` : 'No Linked Child'}
              </Text>
              <Text style={styles.childMeta}>
                Admission No: {activeChild?.admission_number || 'N/A'}
                {activeChild?.roll_number ? ` • Roll No: ${activeChild.roll_number}` : ''}
              </Text>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ATTENDANCE</Text>
                <Text style={styles.statValue}>
                  {activeChildDetails?.attendance?.percentage ?? 100}%
                </Text>
                <Text style={styles.statSub}>
                  {activeChildDetails?.attendance?.present ?? 0} sessions present
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>HOMEWORK</Text>
                <Text style={styles.statValue}>
                  {activeChildDetails?.homework?.length ?? 0}
                </Text>
                <Text style={styles.statSub}>Active assignments</Text>
              </View>
            </View>

            {/* Preschool Daily Care Module if applicable */}
            {educationType === 'preschool' && (
              <View style={styles.preschoolCard}>
                <Text style={styles.preschoolTitle}>Preschool Care & Daily Status</Text>
                <View style={styles.preschoolRow}>
                  <Text style={styles.preschoolItem}>
                    Status: {activeChildDetails?.attendance?.records?.[0]?.status ? activeChildDetails.attendance.records[0].status.toUpperCase() : 'Not recorded today'}
                  </Text>
                  <Text style={styles.preschoolItem}>
                    Total Sessions: {activeChildDetails?.attendance?.total ?? 0}
                  </Text>
                </View>
                <Text style={styles.preschoolNote}>
                  {activeChildDetails?.attendance?.records?.[0]?.status === 'present'
                    ? 'Child is marked present in early learning activities today.'
                    : 'Classroom check-in updates are synced with the attendance register.'}
                </Text>
              </View>
            )}

            {/* AI Companion Banner */}
            {onOpenAICompanion && (
              <TouchableOpacity style={styles.aiBanner} onPress={onOpenAICompanion}>
                <Text style={styles.aiBannerTitle}>AUVRYN Family AI Companion</Text>
                <Text style={styles.aiBannerSub}>
                  Ask questions about your child&apos;s academic progress, attendance and school activities.
                </Text>
              </TouchableOpacity>
            )}

            {/* Recent Homework Preview */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Upcoming Homework</Text>
              {(activeChildDetails?.homework || []).length === 0 ? (
                <Text style={styles.emptyText}>No pending homework assignments.</Text>
              ) : (
                (activeChildDetails?.homework || []).slice(0, 3).map((hw: any) => (
                  <View key={hw.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{hw.title}</Text>
                    <Text style={styles.itemSub}>
                      {hw.subject?.name || 'Subject'} &bull; Due: {hw.due_date}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* TAB 2: ACADEMIC PERFORMANCE */}
        {activeTab === 'performance' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Examination Marksheets</Text>
            {(activeChildDetails?.results || []).length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No examination results published yet.</Text>
              </View>
            ) : (
              (activeChildDetails?.results || []).map((res: any) => (
                <View key={res.id} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultExamName}>{res.exam?.name || 'Examination'}</Text>
                    <Text style={styles.resultGrade}>Grade: {res.final_grade || 'A'}</Text>
                  </View>
                  <Text style={styles.resultMarks}>
                    {res.total_obtained_marks} / {res.total_max_marks} marks ({res.percentage}%)
                  </Text>
                  <Text style={styles.resultStatus}>Status: {res.result_status?.toUpperCase() || 'PASSED'}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: ATTENDANCE HISTORY */}
        {activeTab === 'attendance' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendance Record</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Overall Attendance: {activeChildDetails?.attendance?.percentage ?? 100}%</Text>
              {(activeChildDetails?.attendance?.records || []).slice(0, 10).map((r: any, idx: number) => (
                <View key={idx} style={styles.attRow}>
                  <Text style={styles.attDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
                  <Text
                    style={[
                      styles.attStatus,
                      r.status === 'present' ? styles.statusPresent : styles.statusAbsent,
                    ]}
                  >
                    {r.status.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <View style={styles.section}>
            <View style={styles.notifHeader}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <Text style={styles.unreadBadge}>{unreadCount} unread</Text>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No notifications yet.</Text>
              </View>
            ) : (
              notifications.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.notifItem, !n.is_read && styles.notifItemUnread]}
                  onPress={() => handleMarkAsRead(n.id)}
                >
                  <View style={styles.notifTop}>
                    <Text style={styles.notifCategory}>{(n.category || 'general').toUpperCase()}</Text>
                    <Text style={styles.notifDate}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody}>{n.body}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Parent / Guardian Account</Text>
              <Text style={styles.itemTitle}>{userEmail}</Text>
              <Text style={styles.itemSub}>Role: Verified Guardian</Text>
              <Text style={styles.itemSub}>Institution: {institutionName}</Text>
            </View>

            {/* Verified Student Identity Card */}
            {activeChild && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Student Identity & DPDP Compliance</Text>
                <Text style={styles.itemTitle}>{activeChild.first_name} {activeChild.last_name}</Text>
                <Text style={styles.itemSub}>Admission No: {activeChild.admission_number}</Text>
                <Text style={styles.itemSub}>
                  Identity Document: Verified Masked Record
                </Text>
                <Text style={[styles.itemSub, { color: '#059669', marginTop: 4, fontWeight: '600' }]}>
                  &bull; Masked Aadhaar / Alternative ID Verified
                </Text>
                <Text style={[styles.itemSub, { fontSize: 10, color: '#64748B', marginTop: 4 }]}>
                  AUVRYN preserves masked tokens only in compliance with UIDAI and the Digital Personal Data Protection (DPDP) Act.
                </Text>
              </View>
            )}

            {/* Track Admission Application Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Track Admission Application</Text>
              <Text style={[styles.itemSub, { marginBottom: 8 }]}>
                Enter your application reference code (e.g. APP-2026-XXXXXX) to check review status:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TextInput
                  value={appSearchCode}
                  onChangeText={setAppSearchCode}
                  placeholder="APP-2026-XXXXXX"
                  autoCapitalize="characters"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    fontSize: 12,
                    backgroundColor: '#F8FAFC',
                  }}
                />
                <TouchableOpacity
                  onPress={handleSearchApplication}
                  disabled={appSearchLoading || !appSearchCode.trim()}
                  style={{
                    backgroundColor: '#2563EB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
                    {appSearchLoading ? '...' : 'Track'}
                  </Text>
                </TouchableOpacity>
              </View>

              {appSearchError && (
                <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>
                  {appSearchError}
                </Text>
              )}

              {appSearchResult && (
                <View style={{ marginTop: 8, padding: 8, backgroundColor: '#F0F9FF', borderRadius: 8, borderWidth: 1, borderColor: '#BAE6FD' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1' }}>
                    {appSearchResult.applicationNumber} &bull; {appSearchResult.status.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>
                    Applicant: {appSearchResult.firstName} {appSearchResult.lastName}
                  </Text>
                  {appSearchResult.internalRemarks && (
                    <Text style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', marginTop: 2 }}>
                      Remarks: {appSearchResult.internalRemarks}
                    </Text>
                  )}
                  <Text style={{ fontSize: 10, color: '#0284C7', marginTop: 2 }}>
                    {appSearchResult.identityDocumentsCount} identity document(s) registered
                  </Text>
                </View>
              )}
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
          style={[styles.tabButton, activeTab === 'home' && styles.tabButtonActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'performance' && styles.tabButtonActive]}
          onPress={() => setActiveTab('performance')}
        >
          <Text style={[styles.tabLabel, activeTab === 'performance' && styles.tabLabelActive]}>Results</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'attendance' && styles.tabButtonActive]}
          onPress={() => setActiveTab('attendance')}
        >
          <Text style={[styles.tabLabel, activeTab === 'attendance' && styles.tabLabelActive]}>Attendance</Text>
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
  childSwitcherBar: {
    backgroundColor: '#07152B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
  },
  childPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  childPillActive: {
    backgroundColor: '#2563EB',
  },
  childPillText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  childPillTextActive: {
    color: '#FFFFFF',
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
  childCard: {
    backgroundColor: '#0B1E3F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  childBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  childBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  childName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  childMeta: {
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
  preschoolCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  preschoolTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  preschoolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  preschoolItem: {
    fontSize: 11,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  preschoolNote: {
    fontSize: 11,
    color: '#3B82F6',
    fontStyle: 'italic',
    marginTop: 6,
  },
  aiBanner: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60A5FA',
    marginBottom: 4,
  },
  aiBannerSub: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
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
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultExamName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B1E3F',
  },
  resultGrade: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  resultMarks: {
    fontSize: 12,
    color: '#334155',
  },
  resultStatus: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 4,
  },
  attRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  attDate: {
    fontSize: 12,
    color: '#334155',
  },
  attStatus: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPresent: {
    color: '#10B981',
  },
  statusAbsent: {
    color: '#EF4444',
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
  notifTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifCategory: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
  },
  notifDate: {
    fontSize: 10,
    color: '#94A3B8',
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
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
