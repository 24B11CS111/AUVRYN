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

interface TeacherMobileNavigatorProps {
  userId: string;
  userEmail: string;
  institutionId: string;
  institutionName: string;
  educationType?: string;
  connectionState?: any;
  onSignOut: () => void;
}

type TeacherTab = 'home' | 'attendance' | 'homework' | 'students' | 'notifications' | 'profile';

export const TeacherMobileNavigator: React.FC<TeacherMobileNavigatorProps> = ({
  userId,
  userEmail,
  institutionId,
  institutionName,
  educationType = 'primary_school',
  connectionState = 'connected',
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('home');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffProfile, setStaffProfile] = useState<any | null>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Attendance local state
  const [attendanceDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [attendanceStatusMsg, setAttendanceStatusMsg] = useState<string | null>(null);
  const [isSubmittingAtt, setIsSubmittingAtt] = useState(false);

  // Homework creation state
  const [newHwTitle, setNewHwTitle] = useState('');
  const [newHwDue, setNewHwDue] = useState('');
  const [newHwMarks, setNewHwMarks] = useState('100');
  const [isCreatingHw, setIsCreatingHw] = useState(false);
  const [hwCreateSuccess, setHwCreateSuccess] = useState<string | null>(null);

  const fetchTeacherData = useCallback(async () => {
    if (!supabase || !institutionId) {
      setLoading(false);
      return;
    }

    try {
      const client = supabase as any;
      // 1. Staff Profile
      const { data: staffList } = await client
        .from('staff_profiles')
        .select('id, employee_id, first_name, last_name, designation, email, department_id, academic_departments:department_id(name)')
        .eq('institution_id', institutionId)
        .eq('user_id', userId)
        .limit(1);

      const staff = staffList && staffList.length > 0 ? staffList[0] : null;
      setStaffProfile(staff);

      let staffId = staff?.id;

      // 2. Faculty Allocations
      let rawAllocs: any[] = [];
      if (staffId) {
        const { data: allocs } = await client
          .from('faculty_allocations')
          .select(`
            id,
            class_id,
            section_id,
            subject_id,
            is_class_teacher,
            academic_classes:class_id(id, name),
            academic_sections:section_id(id, name),
            academic_subjects:subject_id(id, name)
          `)
          .eq('institution_id', institutionId)
          .eq('staff_id', staffId)
          .eq('status', 'active');
        rawAllocs = allocs || [];
      }

      setAllocations(rawAllocs);
      const targetSecId = selectedSectionId || rawAllocs[0]?.section_id || '';
      if (!selectedSectionId && targetSecId) {
        setSelectedSectionId(targetSecId);
      }

      // 3. Parallel fetch students, timetable, homework, notifications
      const [
        { data: studentList },
        { data: ttList },
        { data: hwList },
        { data: notifs },
      ] = await Promise.all([
        targetSecId
          ? client
              .from('students')
              .select('id, admission_number, first_name, last_name')
              .eq('institution_id', institutionId)
              .eq('status', 'active')
              .limit(50)
          : Promise.resolve({ data: [] }),
        staffId
          ? client
              .from('timetable_entries')
              .select('id, day_of_week, period_number, start_time, end_time, academic_classes:class_id(name), academic_sections:section_id(name), academic_subjects:subject_id(name)')
              .eq('institution_id', institutionId)
              .eq('faculty_id', staffId)
              .limit(15)
          : Promise.resolve({ data: [] }),
        client
          .from('homework_assignments')
          .select('id, title, max_marks, due_date, academic_classes:class_id(name), academic_subjects:subject_id(name)')
          .eq('institution_id', institutionId)
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

      const stData = studentList || [];
      setStudents(stData);
      setTimetable(ttList || []);
      setHomework(hwList || []);

      // Initialize default attendance map
      const initialAtt: Record<string, 'present' | 'absent' | 'late'> = {};
      stData.forEach((s: any) => {
        initialAtt[s.id] = 'present';
      });
      setAttendanceMap(initialAtt);

      const notifList = notifs || [];
      setNotifications(notifList);
      setUnreadCount(notifList.filter((n: any) => !n.is_read).length);
    } catch {
      // Non-blocking error handling
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [institutionId, userId, selectedSectionId]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeacherData();
  };

  const handleToggleAttendance = (studentId: string) => {
    setAttendanceMap((prev) => {
      const current = prev[studentId] || 'present';
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const handleSubmitAttendance = async () => {
    if (!supabase || !selectedSectionId || students.length === 0) return;
    setIsSubmittingAtt(true);

    try {
      // Resolve class id from allocation
      const currentAlloc = allocations.find((a) => a.section_id === selectedSectionId) || allocations[0];
      const classId = currentAlloc?.class_id;

      // Find or create session
      let sessionId = null;
      const { data: existingSession } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('institution_id', institutionId)
        .eq('class_id', classId)
        .eq('section_id', selectedSectionId)
        .eq('session_date', attendanceDate)
        .eq('session_type', 'daily')
        .maybeSingle();

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const { data: ay } = await supabase
          .from('academic_years')
          .select('id')
          .eq('institution_id', institutionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (ay) {
          const { data: newSession } = await supabase
            .from('attendance_sessions')
            .insert({
              institution_id: institutionId,
              academic_year_id: ay.id,
              class_id: classId,
              section_id: selectedSectionId,
              session_date: attendanceDate,
              session_type: 'daily',
              marked_by_staff_id: staffProfile?.id || null,
              status: 'submitted',
              created_by: userId,
            })
            .select('id')
            .single();
          sessionId = newSession?.id;
        }
      }

      if (sessionId) {
        const payload = Object.entries(attendanceMap).map(([sId, status]) => ({
          institution_id: institutionId,
          session_id: sessionId,
          student_id: sId,
          status,
          created_by: userId,
          updated_at: new Date().toISOString(),
        }));

        await supabase
          .from('student_attendance_records')
          .upsert(payload, { onConflict: 'session_id, student_id' });

        setAttendanceStatusMsg(`Attendance saved for ${payload.length} students!`);
        setTimeout(() => setAttendanceStatusMsg(null), 3500);
      }
    } catch {
      setAttendanceStatusMsg('Error recording attendance.');
    } finally {
      setIsSubmittingAtt(false);
    }
  };

  const handleCreateHomework = async () => {
    if (!supabase || !newHwTitle.trim() || !newHwDue.trim()) return;
    setIsCreatingHw(true);

    try {
      const currentAlloc = allocations.find((a) => a.section_id === selectedSectionId) || allocations[0];
      const { data: ay } = await supabase
        .from('academic_years')
        .select('id')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (currentAlloc && ay) {
        await (supabase as any).from('homework_assignments').insert({
          institution_id: institutionId,
          academic_year_id: ay.id,
          class_id: currentAlloc.class_id,
          section_id: currentAlloc.section_id,
          subject_id: currentAlloc.subject_id,
          faculty_staff_id: staffProfile?.id || null,
          title: newHwTitle.trim(),
          description: `Assigned coursework for ${currentAlloc.academic_subjects?.name || 'Subject'}.`,
          max_marks: Number(newHwMarks) || 100,
          due_date: newHwDue.trim(),
          status: 'published',
        });

        setHwCreateSuccess('Assignment published to class!');
        setNewHwTitle('');
        setNewHwDue('');
        setTimeout(() => setHwCreateSuccess(null), 3500);
        fetchTeacherData();
      }
    } catch {
      // Error handling
    } finally {
      setIsCreatingHw(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AUVRYN_COLORS.electricBlue} />
        <Text style={styles.loadingText}>Loading Educator Workspace...</Text>
      </View>
    );
  }

  const currentAlloc = allocations.find((a) => a.section_id === selectedSectionId) || allocations[0];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>AUVRYN</Text>
          <Text style={styles.instName} numberOfLines={1}>
            {institutionName} &bull; Faculty Space
          </Text>
        </View>
        <View style={styles.headerRight}>
          <RealtimeStatusIndicator state={connectionState} />
        </View>
      </View>

      {/* Allocation Switcher */}
      {allocations.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.allocBar}>
          {allocations.map((alloc) => (
            <TouchableOpacity
              key={alloc.id}
              style={[
                styles.allocPill,
                alloc.section_id === selectedSectionId && styles.allocPillActive,
              ]}
              onPress={() => setSelectedSectionId(alloc.section_id)}
            >
              <Text
                style={[
                  styles.allocPillText,
                  alloc.section_id === selectedSectionId && styles.allocPillTextActive,
                ]}
              >
                {alloc.academic_classes?.name} ({alloc.academic_sections?.name}) &bull; {alloc.academic_subjects?.name}
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
            {/* Faculty Card */}
            <View style={styles.facultyCard}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {staffProfile?.designation || 'Faculty Member'} &bull; {educationType.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.facultyName}>
                {staffProfile ? `${staffProfile.first_name} ${staffProfile.last_name}` : 'Faculty Educator'}
              </Text>
              <Text style={styles.facultyMeta}>
                Employee ID: {staffProfile?.employee_id || 'FAC-001'} &bull; {staffProfile?.academic_departments?.name || 'Department of Academics'}
              </Text>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>CLASSES</Text>
                <Text style={styles.statValue}>{allocations.length}</Text>
                <Text style={styles.statSub}>Assigned sections</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ENROLLED</Text>
                <Text style={styles.statValue}>{students.length}</Text>
                <Text style={styles.statSub}>Active students</Text>
              </View>
            </View>

            {/* Today's Teaching Schedule */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today&apos;s Teaching Slots</Text>
              {timetable.length === 0 ? (
                <Text style={styles.emptyText}>No teaching periods scheduled today.</Text>
              ) : (
                timetable.slice(0, 3).map((tt) => (
                  <View key={tt.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>
                      {tt.academic_classes?.name} ({tt.academic_sections?.name}) &bull; {tt.academic_subjects?.name}
                    </Text>
                    <Text style={styles.itemSub}>
                      Period {tt.period_number} &bull; {tt.start_time} - {tt.end_time}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* TAB 2: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Attendance: {currentAlloc?.academic_classes?.name} ({currentAlloc?.academic_sections?.name})
              </Text>
              <Text style={styles.dateBadge}>{attendanceDate}</Text>
            </View>

            {attendanceStatusMsg && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>{attendanceStatusMsg}</Text>
              </View>
            )}

            {students.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No students in selected section.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.attInstruct}>Tap student status pill to toggle: Present &rarr; Absent &rarr; Late</Text>
                {students.map((st) => {
                  const status = attendanceMap[st.id] || 'present';
                  return (
                    <View key={st.id} style={styles.attItem}>
                      <View style={styles.attStudentInfo}>
                        <Text style={styles.attStudentName}>
                          {st.roll_number ? `${st.roll_number}. ` : ''}{st.first_name} {st.last_name}
                        </Text>
                        <Text style={styles.attStudentMeta}>Admn: {st.admission_number}</Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.statusPill,
                          status === 'present' && styles.pillPresent,
                          status === 'absent' && styles.pillAbsent,
                          status === 'late' && styles.pillLate,
                        ]}
                        onPress={() => handleToggleAttendance(st.id)}
                      >
                        <Text style={styles.statusPillText}>{status.toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.saveAttBtn, isSubmittingAtt && styles.btnDisabled]}
                  onPress={handleSubmitAttendance}
                  disabled={isSubmittingAtt}
                >
                  <Text style={styles.saveAttBtnText}>
                    {isSubmittingAtt ? 'Submitting Register...' : 'Save & Submit Attendance'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: HOMEWORK & TASKS */}
        {activeTab === 'homework' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assign Coursework</Text>

            {hwCreateSuccess && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>{hwCreateSuccess}</Text>
              </View>
            )}

            {/* Quick HW Composer */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>New Homework Assignment</Text>
              <TextInput
                style={styles.input}
                placeholder="Assignment Title (e.g. Chapter 4 Practice Questions)"
                placeholderTextColor="#94A3B8"
                value={newHwTitle}
                onChangeText={setNewHwTitle}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Due Date (YYYY-MM-DD)"
                  placeholderTextColor="#94A3B8"
                  value={newHwDue}
                  onChangeText={setNewHwDue}
                />
                <TextInput
                  style={[styles.input, { width: 90 }]}
                  placeholder="Max Marks"
                  placeholderTextColor="#94A3B8"
                  value={newHwMarks}
                  onChangeText={setNewHwMarks}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={[styles.saveAttBtn, isCreatingHw && styles.btnDisabled]}
                onPress={handleCreateHomework}
                disabled={isCreatingHw}
              >
                <Text style={styles.saveAttBtnText}>
                  {isCreatingHw ? 'Publishing...' : 'Publish Assignment to Class'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Existing Assigned Homework */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Active Class Assignments</Text>
            {homework.map((hw) => (
              <View key={hw.id} style={styles.hwCard}>
                <Text style={styles.hwTitle}>{hw.title}</Text>
                <Text style={styles.hwMeta}>
                  {hw.academic_classes?.name} &bull; {hw.academic_subjects?.name} &bull; Due: {hw.due_date}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: STUDENTS */}
        {activeTab === 'students' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Student Roster ({students.length} Enrolled)
            </Text>
            <View style={styles.card}>
              {students.map((st) => (
                <View key={st.id} style={styles.listItem}>
                  <Text style={styles.itemTitle}>
                    {st.roll_number ? `#${st.roll_number} ` : ''}{st.first_name} {st.last_name}
                  </Text>
                  <Text style={styles.itemSub}>Admission No: {st.admission_number}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <View style={styles.section}>
            <View style={styles.notifHeader}>
              <Text style={styles.sectionTitle}>Staff Notices & Alerts</Text>
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
                <View key={n.id} style={[styles.notifItem, !n.is_read && styles.notifItemUnread]}>
                  <View style={styles.notifTop}>
                    <Text style={styles.notifCategory}>{(n.category || 'general').toUpperCase()}</Text>
                    <Text style={styles.notifDate}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </Text>
                  </View>
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
              <Text style={styles.cardTitle}>Educator Profile</Text>
              <Text style={styles.itemTitle}>{staffProfile?.first_name} {staffProfile?.last_name}</Text>
              <Text style={styles.itemSub}>Email: {userEmail}</Text>
              <Text style={styles.itemSub}>Designation: {staffProfile?.designation || 'Faculty'}</Text>
              <Text style={styles.itemSub}>Department: {staffProfile?.academic_departments?.name || 'Academic'}</Text>
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
          style={[styles.tabButton, activeTab === 'attendance' && styles.tabButtonActive]}
          onPress={() => setActiveTab('attendance')}
        >
          <Text style={[styles.tabLabel, activeTab === 'attendance' && styles.tabLabelActive]}>Roll Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'homework' && styles.tabButtonActive]}
          onPress={() => setActiveTab('homework')}
        >
          <Text style={[styles.tabLabel, activeTab === 'homework' && styles.tabLabelActive]}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'students' && styles.tabButtonActive]}
          onPress={() => setActiveTab('students')}
        >
          <Text style={[styles.tabLabel, activeTab === 'students' && styles.tabLabelActive]}>Roster</Text>
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
  allocBar: {
    backgroundColor: '#07152B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
  },
  allocPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  allocPillActive: {
    backgroundColor: '#2563EB',
  },
  allocPillText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  allocPillTextActive: {
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  facultyCard: {
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
  facultyName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  facultyMeta: {
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
  attInstruct: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  attItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  attStudentInfo: {
    flex: 1,
  },
  attStudentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  attStudentMeta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  pillPresent: {
    backgroundColor: '#DCFCE7',
  },
  pillAbsent: {
    backgroundColor: '#FEE2E2',
  },
  pillLate: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  saveAttBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  saveAttBtnText: {
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
  inputRow: {
    flexDirection: 'row',
  },
  hwCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  hwTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B1E3F',
  },
  hwMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
