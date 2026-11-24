import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { AUVRYN_COLORS } from '@edu-platform/types';
import { RealtimeStatusIndicator } from '../components/RealtimeStatusIndicator';

interface StudentMobileNavigatorProps {
  userId: string;
  userEmail: string;
  institutionId: string;
  institutionName: string;
  educationType?: string;
  connectionState?: any;
  onSignOut: () => void;
  onOpenAITutor?: () => void;
}

type StudentTab = 'home' | 'timetable' | 'academics' | 'results' | 'notifications' | 'profile';

export const StudentMobileNavigator: React.FC<StudentMobileNavigatorProps> = ({
  userId,
  userEmail,
  institutionId,
  institutionName,
  educationType = 'primary_school',
  connectionState = 'connected',
  onSignOut,
  onOpenAITutor,
}) => {
  const [activeTab, setActiveTab] = useState<StudentTab>('home');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [student, setStudent] = useState<any | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<{ percentage: number; present: number; total: number }>({ percentage: 100, present: 0, total: 0 });
  const [timetable, setTimetable] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchStudentData = useCallback(async () => {
    if (!supabase || !institutionId) {
      setLoading(false);
      return;
    }

    try {
      const client = supabase as any;
      // 1. Resolve student profile
      const { data: st } = await client
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          gender,
          enrollments:student_enrollments (
            id,
            is_active,
            class:academic_classes(id, name),
            section:academic_sections(id, name)
          )
        `)
        .eq('institution_id', institutionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!st) {
        setStudent(null);
        setLoading(false);
        return;
      }

      setStudent(st);
      const activeEnrollment = (st.enrollments || []).find((e: any) => e.is_active);
      const classId = activeEnrollment?.class?.id;
      const sectionId = activeEnrollment?.section?.id;

      // 2. Fetch parallel academic records
      const [
        { data: attRecords },
        { data: hwList },
        { data: resultsList },
        { data: notifs },
      ] = await Promise.all([
        client
          .from('student_attendance_records')
          .select('status, created_at')
          .eq('institution_id', institutionId)
          .eq('student_id', st.id),
        client
          .from('homework_assignments')
          .select('id, title, max_marks, due_date, subject:academic_subjects(name)')
          .eq('institution_id', institutionId)
          .eq('status', 'published')
          .order('due_date', { ascending: false })
          .limit(15),
        client
          .from('student_exam_results')
          .select('id, total_max_marks, total_obtained_marks, percentage, final_grade, result_status, exam:examinations(name)')
          .eq('institution_id', institutionId)
          .eq('student_id', st.id)
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
        client
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

      setAttendanceSummary({ percentage: attPct, present: presentAtt, total: totalAtt });
      setHomework(hwList || []);
      setResults(resultsList || []);

      const notifList = notifs || [];
      setNotifications(notifList);
      setUnreadCount(notifList.filter((n: any) => !n.is_read).length);

      // 3. Timetable query
      if (classId) {
        let ttQuery = supabase
          .from('timetable_entries')
          .select('id, day_of_week, start_time, end_time, period_number, subject:academic_subjects(name), room:rooms(room_number)')
          .eq('institution_id', institutionId)
          .eq('class_id', classId)
          .eq('is_active', true);

        if (sectionId) {
          ttQuery = ttQuery.or(`section_id.eq.${sectionId},section_id.is.null`);
        }

        const { data: ttData } = await ttQuery.order('period_number', { ascending: true });
        setTimetable(ttData || []);
      }
    } catch {
      // Non-blocking error handling
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [institutionId, userId]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentData();
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

  const handleQuickSubmit = async (hwId: string) => {
    if (!supabase || !student) return;
    await (supabase as any).from('homework_submissions').upsert({
      assignment_id: hwId,
      student_id: student.id,
      institution_id: institutionId,
      submission_text: 'Submitted via AUVRYN Mobile App',
      submitted_at: new Date().toISOString(),
      status: 'submitted',
    }, { onConflict: 'assignment_id, student_id' });

    fetchStudentData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AUVRYN_COLORS.electricBlue} />
        <Text style={styles.loadingText}>Loading Student Workspace...</Text>
      </View>
    );
  }

  const activeEnrollment = (student?.enrollments || []).find((e: any) => e.is_active);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>AUVRYN</Text>
          <Text style={styles.instName} numberOfLines={1}>
            {institutionName} &bull; Student Space
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
        {/* TAB 1: HOME OVERVIEW */}
        {activeTab === 'home' && (
          <View style={styles.section}>
            {/* Student Profile Card */}
            <View style={styles.studentCard}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {educationType === 'university' ? 'Scholar' : 'Student'}
                </Text>
              </View>
              <Text style={styles.studentName}>
                {student ? `${student.first_name} ${student.last_name}` : 'Student Profile'}
              </Text>
              <Text style={styles.studentMeta}>
                Class: {activeEnrollment?.class?.name || 'Class'} {activeEnrollment?.section?.name ? `(${activeEnrollment.section.name})` : ''}
                {student?.roll_number ? ` • Roll: ${student.roll_number}` : ''}
              </Text>
            </View>

            {/* Quick KPI Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ATTENDANCE</Text>
                <Text style={styles.statValue}>{attendanceSummary.percentage}%</Text>
                <Text style={styles.statSub}>
                  {attendanceSummary.present} of {attendanceSummary.total} sessions
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PENDING TASKS</Text>
                <Text style={styles.statValue}>{homework.length}</Text>
                <Text style={styles.statSub}>Assignments due</Text>
              </View>
            </View>

            {/* Intermediate Stream or University Progress Pill */}
            {educationType === 'intermediate' && (
              <View style={styles.streamBadgeBox}>
                <Text style={styles.streamBadgeTitle}>Junior College Stream: MPC</Text>
                <Text style={styles.streamBadgeSub}>
                  Target: JEE Main &bull; Mock Percentile: 98.7% &bull; Physics, Maths & Chemistry
                </Text>
              </View>
            )}

            {educationType === 'university' && (
              <View style={styles.streamBadgeBox}>
                <Text style={styles.streamBadgeTitle}>Degree Credit Registry</Text>
                <Text style={styles.streamBadgeSub}>
                  118 / 160 Credits Completed &bull; CGPA: 8.76 / 10.0 (First Class with Distinction)
                </Text>
              </View>
            )}

            {/* AI Tutor Card */}
            {onOpenAITutor && (
              <TouchableOpacity style={styles.aiCard} onPress={onOpenAITutor}>
                <Text style={styles.aiCardTitle}>AUVRYN AI Academic Tutor</Text>
                <Text style={styles.aiCardSub}>
                  Get instant concept explanations, practice questions, and homework guidance.
                </Text>
              </TouchableOpacity>
            )}

            {/* Today's Schedule Preview */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today&apos;s Classes</Text>
              {timetable.length === 0 ? (
                <Text style={styles.emptyText}>No classes scheduled for today.</Text>
              ) : (
                timetable.slice(0, 3).map((tt) => (
                  <View key={tt.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{tt.subject?.name || 'Subject'}</Text>
                    <Text style={styles.itemSub}>
                      Period {tt.period_number} &bull; {tt.start_time} - {tt.end_time}
                      {tt.room?.room_number ? ` &bull; Room ${tt.room.room_number}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* TAB 2: TIMETABLE */}
        {activeTab === 'timetable' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Class Schedule</Text>
            {timetable.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No timetable entries found.</Text>
              </View>
            ) : (
              timetable.map((tt) => (
                <View key={tt.id} style={styles.card}>
                  <View style={styles.ttHeader}>
                    <Text style={styles.ttSubject}>{tt.subject?.name || 'Class'}</Text>
                    <Text style={styles.ttPeriod}>Period {tt.period_number}</Text>
                  </View>
                  <Text style={styles.ttTime}>
                    {tt.day_of_week} &bull; {tt.start_time} - {tt.end_time}
                  </Text>
                  {tt.room?.room_number && (
                    <Text style={styles.ttRoom}>Room: {tt.room.room_number}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: ACADEMICS & HOMEWORK */}
        {activeTab === 'academics' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignments & Homework</Text>
            {homework.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No homework assignments found.</Text>
              </View>
            ) : (
              homework.map((hw) => (
                <View key={hw.id} style={styles.hwCard}>
                  <View style={styles.hwTop}>
                    <Text style={styles.hwSubject}>{hw.subject?.name || 'Subject'}</Text>
                    <Text style={styles.hwMarks}>Max: {hw.max_marks} marks</Text>
                  </View>
                  <Text style={styles.hwTitle}>{hw.title}</Text>
                  <Text style={styles.hwDue}>Due: {hw.due_date}</Text>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => handleQuickSubmit(hw.id)}
                  >
                    <Text style={styles.submitBtnText}>Quick Submit Online</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: RESULTS */}
        {activeTab === 'results' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exam Results & Marks</Text>
            {results.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No published examination results available.</Text>
              </View>
            ) : (
              results.map((res) => (
                <View key={res.id} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultExamName}>{res.exam?.name || 'Examination'}</Text>
                    <Text style={styles.resultGrade}>Grade: {res.final_grade || 'A'}</Text>
                  </View>
                  <Text style={styles.resultMarks}>
                    Obtained: {res.total_obtained_marks} / {res.total_max_marks} marks ({res.percentage}%)
                  </Text>
                  <Text style={styles.resultStatus}>Status: {res.result_status?.toUpperCase() || 'PASSED'}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <View style={styles.section}>
            <View style={styles.notifHeader}>
              <Text style={styles.sectionTitle}>Announcements & Alerts</Text>
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

        {/* TAB 6: PROFILE */}
        {activeTab === 'profile' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Student Workspace</Text>
              <Text style={styles.itemTitle}>{userEmail}</Text>
              <Text style={styles.itemSub}>Admission No: {student?.admission_number || 'N/A'}</Text>
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
          style={[styles.tabButton, activeTab === 'home' && styles.tabButtonActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'timetable' && styles.tabButtonActive]}
          onPress={() => setActiveTab('timetable')}
        >
          <Text style={[styles.tabLabel, activeTab === 'timetable' && styles.tabLabelActive]}>Classes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'academics' && styles.tabButtonActive]}
          onPress={() => setActiveTab('academics')}
        >
          <Text style={[styles.tabLabel, activeTab === 'academics' && styles.tabLabelActive]}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'results' && styles.tabButtonActive]}
          onPress={() => setActiveTab('results')}
        >
          <Text style={[styles.tabLabel, activeTab === 'results' && styles.tabLabelActive]}>Marks</Text>
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
  studentCard: {
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
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  studentMeta: {
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
  streamBadgeBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 16,
  },
  streamBadgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 2,
  },
  streamBadgeSub: {
    fontSize: 11,
    color: '#4F46E5',
    lineHeight: 16,
  },
  aiCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  aiCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60A5FA',
    marginBottom: 4,
  },
  aiCardSub: {
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
  ttHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ttSubject: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B1E3F',
  },
  ttPeriod: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  ttTime: {
    fontSize: 12,
    color: '#475569',
  },
  ttRoom: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  hwCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  hwTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hwSubject: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
  },
  hwMarks: {
    fontSize: 11,
    color: '#64748B',
  },
  hwTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1E3F',
    marginBottom: 4,
  },
  hwDue: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
