export * from '@edu-platform/types';

export const DATABASE_TABLES = {
  PROFILES: 'profiles',
  INSTITUTIONS: 'institutions',
  INSTITUTION_MEMBERSHIPS: 'institution_memberships',
  CAMPUSES: 'campuses',
  ACADEMIC_YEARS: 'academic_years',
  ACADEMIC_TERMS: 'academic_terms',
  AUDIT_LOGS: 'audit_logs',
  ACADEMIC_DEPARTMENTS: 'academic_departments',
  ACADEMIC_PROGRAMS: 'academic_programs',
  ACADEMIC_CLASSES: 'academic_classes',
  ACADEMIC_SECTIONS: 'academic_sections',
  ACADEMIC_SUBJECTS: 'academic_subjects',
  ACADEMIC_CLASS_SUBJECTS: 'academic_class_subjects',
  STUDENTS: 'students',
  GUARDIANS: 'guardians',
  STUDENT_GUARDIANS: 'student_guardians',
  STUDENT_ENROLLMENTS: 'student_enrollments',
  ADMISSION_APPLICATIONS: 'admission_applications',
  ADMISSION_STATUS_HISTORY: 'admission_status_history',
  STUDENT_DOCUMENTS: 'student_documents',
  STAFF_PROFILES: 'staff_profiles',
  STAFF_EMPLOYMENTS: 'staff_employments',
  FACULTY_ALLOCATIONS: 'faculty_allocations',
  STAFF_DOCUMENTS: 'staff_documents',
  STAFF_INVITATIONS: 'staff_invitations',
  LEAVE_REQUESTS: 'leave_requests',
  ATTENDANCE_SESSIONS: 'attendance_sessions',
  STUDENT_ATTENDANCE_RECORDS: 'student_attendance_records',
  ATTENDANCE_CORRECTIONS: 'attendance_corrections',
  STAFF_ATTENDANCE_RECORDS: 'staff_attendance_records',
  STAFF_ATTENDANCE_CORRECTIONS: 'staff_attendance_corrections',
  ATTENDANCE_NOTIFICATIONS: 'attendance_notifications',
  ROOMS: 'rooms',
  TIMETABLE_STRUCTURES: 'timetable_structures',
  TIMETABLE_PERIODS: 'timetable_periods',
  TIMETABLE_ENTRIES: 'timetable_entries',
  TIMETABLE_SUBSTITUTIONS: 'timetable_substitutions',
  SCHEDULE_NOTIFICATIONS: 'schedule_notifications',
  GRADING_SCALES: 'grading_scales',
  GRADING_SCALE_RULES: 'grading_scale_rules',
  EXAMINATIONS: 'examinations',
  EXAM_SUBJECTS: 'exam_subjects',
  STUDENT_EXAM_MARKS: 'student_exam_marks',
  MARKS_ENTRY_CORRECTIONS: 'marks_entry_corrections',
  STUDENT_EXAM_RESULTS: 'student_exam_results',
  HALL_TICKETS: 'hall_tickets',
  EXAM_REVALUATIONS: 'exam_revaluations',
  INSTITUTION_FEE_SETTINGS: 'institution_fee_settings',
  FEE_HEADS: 'fee_heads',
  FEE_STRUCTURES: 'fee_structures',
  FEE_STRUCTURE_ITEMS: 'fee_structure_items',
  FEE_STRUCTURE_INSTALLMENTS: 'fee_structure_installments',
  STUDENT_FEE_ASSIGNMENTS: 'student_fee_assignments',
  STUDENT_FEE_ASSIGNMENT_ITEMS: 'student_fee_assignment_items',
  STUDENT_FEE_INSTALLMENTS: 'student_fee_installments',
  FEE_CONCESSIONS: 'fee_concessions',
  FEE_PAYMENTS: 'fee_payments',
  PAYMENT_ALLOCATIONS: 'payment_allocations',
  STUDENT_ADVANCE_BALANCES: 'student_advance_balances',
  FINANCIAL_LEDGER_ENTRIES: 'financial_ledger_entries',
  FEE_REFUND_REQUESTS: 'fee_refund_requests',
  GATEWAY_ORDERS: 'gateway_orders',
  GATEWAY_WEBHOOK_EVENTS: 'gateway_webhook_events',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_DELIVERIES: 'notification_deliveries',
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  NOTIFICATION_TEMPLATES: 'notification_templates',
  PUSH_DEVICE_TOKENS: 'push_device_tokens',
  ANNOUNCEMENTS: 'announcements',
  ANNOUNCEMENT_ACKNOWLEDGEMENTS: 'announcement_acknowledgements',
  HOMEWORK_ASSIGNMENTS: 'homework_assignments',
  HOMEWORK_SUBMISSIONS: 'homework_submissions',
  COMMUNICATION_THREADS: 'communication_threads',
  COMMUNICATION_PARTICIPANTS: 'communication_participants',
  COMMUNICATION_MESSAGES: 'communication_messages',
  TRANSPORT_VEHICLES: 'transport_vehicles',
  VEHICLE_DOCUMENTS: 'vehicle_documents',
  VEHICLE_MAINTENANCE_RECORDS: 'vehicle_maintenance_records',
  TRANSPORT_STAFF_PROFILES: 'transport_staff_profiles',
  TRANSPORT_STOPS: 'transport_stops',
  TRANSPORT_ROUTES: 'transport_routes',
  ROUTE_STOPS: 'route_stops',
  STUDENT_TRANSPORT_ASSIGNMENTS: 'student_transport_assignments',
  TRANSPORT_JOURNEYS: 'transport_journeys',
  JOURNEY_STOP_EVENTS: 'journey_stop_events',
  VEHICLE_LIVE_LOCATIONS: 'vehicle_live_locations',
  VEHICLE_LOCATION_HISTORY: 'vehicle_location_history',
  STUDENT_BOARDING_EVENTS: 'student_boarding_events',
  TRANSPORT_CHANGE_REQUESTS: 'transport_change_requests',
  TRANSPORT_SETTINGS: 'transport_settings',
} as const;

export type DatabaseTableName = (typeof DATABASE_TABLES)[keyof typeof DATABASE_TABLES];

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      institutions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          code: string;
          type: 'school' | 'junior_college' | 'degree_college' | 'engineering_college' | 'university';
          status: 'active' | 'pending_verification' | 'suspended' | 'archived';
          logo_url: string | null;
          website: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string;
          state: string;
          country: string;
          postal_code: string | null;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          code: string;
          type: 'school' | 'junior_college' | 'degree_college' | 'engineering_college' | 'university';
          status?: 'active' | 'pending_verification' | 'suspended' | 'archived';
          logo_url?: string | null;
          website?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city: string;
          state: string;
          country: string;
          postal_code?: string | null;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          code?: string;
          type?: 'school' | 'junior_college' | 'degree_college' | 'engineering_college' | 'university';
          status?: 'active' | 'pending_verification' | 'suspended' | 'archived';
          logo_url?: string | null;
          website?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string;
          state?: string;
          country?: string;
          postal_code?: string | null;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      institution_memberships: {
        Row: {
          id: string;
          institution_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'academic_admin' | 'admissions_officer' | 'faculty' | 'staff' | 'accountant' | 'student' | 'parent';
          permissions: string[];
          status: 'active' | 'invited' | 'suspended' | 'revoked';
          title: string | null;
          department: string | null;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'academic_admin' | 'admissions_officer' | 'faculty' | 'staff' | 'accountant' | 'student' | 'parent';
          permissions?: string[];
          status?: 'active' | 'invited' | 'suspended' | 'revoked';
          title?: string | null;
          department?: string | null;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'academic_admin' | 'admissions_officer' | 'faculty' | 'staff' | 'accountant' | 'student' | 'parent';
          permissions?: string[];
          status?: 'active' | 'invited' | 'suspended' | 'revoked';
          title?: string | null;
          department?: string | null;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campuses: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          code: string;
          is_primary: boolean;
          address: string | null;
          city: string;
          state: string;
          country: string;
          postal_code: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          code: string;
          is_primary?: boolean;
          address?: string | null;
          city: string;
          state: string;
          country: string;
          postal_code?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          name?: string;
          code?: string;
          is_primary?: boolean;
          address?: string | null;
          city?: string;
          state?: string;
          country?: string;
          postal_code?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      academic_years: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          code: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          term_system: 'semester' | 'trimester' | 'annual';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          code: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          term_system?: 'semester' | 'trimester' | 'annual';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          name?: string;
          code?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          term_system?: 'semester' | 'trimester' | 'annual';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      academic_terms: {
        Row: {
          id: string;
          academic_year_id: string;
          name: string;
          code: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id: string;
          name: string;
          code: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          academic_year_id?: string;
          name?: string;
          code?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      academic_departments: {
        Row: {
          id: string;
          institution_id: string;
          campus_id: string | null;
          parent_department_id: string | null;
          name: string;
          code: string;
          description: string | null;
          head_profile_id: string | null;
          status: 'active' | 'inactive' | 'archived';
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          campus_id?: string | null;
          parent_department_id?: string | null;
          name: string;
          code: string;
          description?: string | null;
          head_profile_id?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          campus_id?: string | null;
          parent_department_id?: string | null;
          name?: string;
          code?: string;
          description?: string | null;
          head_profile_id?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      academic_programs: {
        Row: {
          id: string;
          institution_id: string;
          department_id: string | null;
          campus_id: string | null;
          name: string;
          code: string;
          description: string | null;
          level: 'primary' | 'middle_school' | 'secondary' | 'higher_secondary' | 'diploma' | 'undergraduate' | 'postgraduate' | 'doctoral';
          duration_years: number;
          term_system: 'semester' | 'trimester' | 'annual';
          total_terms: number;
          status: 'active' | 'inactive' | 'archived';
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          department_id?: string | null;
          campus_id?: string | null;
          name: string;
          code: string;
          description?: string | null;
          level?: 'primary' | 'middle_school' | 'secondary' | 'higher_secondary' | 'diploma' | 'undergraduate' | 'postgraduate' | 'doctoral';
          duration_years?: number;
          term_system?: 'semester' | 'trimester' | 'annual';
          total_terms?: number;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          department_id?: string | null;
          campus_id?: string | null;
          name?: string;
          code?: string;
          description?: string | null;
          level?: 'primary' | 'middle_school' | 'secondary' | 'higher_secondary' | 'diploma' | 'undergraduate' | 'postgraduate' | 'doctoral';
          duration_years?: number;
          term_system?: 'semester' | 'trimester' | 'annual';
          total_terms?: number;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      academic_classes: {
        Row: {
          id: string;
          institution_id: string;
          program_id: string;
          academic_year_id: string;
          campus_id: string | null;
          name: string;
          code: string;
          level_number: number;
          status: 'active' | 'inactive' | 'archived';
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          program_id: string;
          academic_year_id: string;
          campus_id?: string | null;
          name: string;
          code: string;
          level_number?: number;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          program_id?: string;
          academic_year_id?: string;
          campus_id?: string | null;
          name?: string;
          code?: string;
          level_number?: number;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      academic_sections: {
        Row: {
          id: string;
          institution_id: string;
          class_id: string;
          campus_id: string | null;
          name: string;
          code: string;
          capacity: number;
          room_number: string | null;
          class_teacher_profile_id: string | null;
          status: 'active' | 'inactive' | 'archived';
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          class_id: string;
          campus_id?: string | null;
          name: string;
          code: string;
          capacity?: number;
          room_number?: string | null;
          class_teacher_profile_id?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          class_id?: string;
          campus_id?: string | null;
          name?: string;
          code?: string;
          capacity?: number;
          room_number?: string | null;
          class_teacher_profile_id?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      academic_subjects: {
        Row: {
          id: string;
          institution_id: string;
          department_id: string | null;
          name: string;
          code: string;
          subject_type: 'theory' | 'practical' | 'lab' | 'elective' | 'vocational' | 'project';
          credit_hours: number;
          description: string | null;
          status: 'active' | 'inactive' | 'archived';
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          department_id?: string | null;
          name: string;
          code: string;
          subject_type?: 'theory' | 'practical' | 'lab' | 'elective' | 'vocational' | 'project';
          credit_hours?: number;
          description?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          department_id?: string | null;
          name?: string;
          code?: string;
          subject_type?: 'theory' | 'practical' | 'lab' | 'elective' | 'vocational' | 'project';
          credit_hours?: number;
          description?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      academic_class_subjects: {
        Row: {
          id: string;
          institution_id: string;
          class_id: string;
          section_id: string | null;
          subject_id: string;
          term_id: string | null;
          faculty_profile_id: string | null;
          status: 'active' | 'inactive' | 'archived';
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          class_id: string;
          section_id?: string | null;
          subject_id: string;
          term_id?: string | null;
          faculty_profile_id?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          class_id?: string;
          section_id?: string | null;
          subject_id?: string;
          term_id?: string | null;
          faculty_profile_id?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          institution_id: string;
          admission_number: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          date_of_birth: string;
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          blood_group: string | null;
          email: string | null;
          phone: string | null;
          photo_url: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          postal_code: string | null;
          nationality: string;
          emergency_contact_name: string;
          emergency_contact_phone: string;
          emergency_contact_relationship: string;
          status: 'active' | 'inactive' | 'suspended' | 'alumni' | 'withdrawn' | 'transferred';
          date_of_joining: string;
          user_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          admission_number: string;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          date_of_birth: string;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          blood_group?: string | null;
          email?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          nationality?: string;
          emergency_contact_name: string;
          emergency_contact_phone: string;
          emergency_contact_relationship: string;
          status?: 'active' | 'inactive' | 'suspended' | 'alumni' | 'withdrawn' | 'transferred';
          date_of_joining?: string;
          user_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          admission_number?: string;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          date_of_birth?: string;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          blood_group?: string | null;
          email?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          nationality?: string;
          emergency_contact_name?: string;
          emergency_contact_phone?: string;
          emergency_contact_relationship?: string;
          status?: 'active' | 'inactive' | 'suspended' | 'alumni' | 'withdrawn' | 'transferred';
          date_of_joining?: string;
          user_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      guardians: {
        Row: {
          id: string;
          institution_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string;
          relationship_default: string | null;
          occupation: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          user_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone: string;
          relationship_default?: string | null;
          occupation?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string;
          relationship_default?: string | null;
          occupation?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      student_guardians: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          guardian_id: string;
          relationship: string;
          is_primary: boolean;
          is_emergency_contact: boolean;
          can_pickup: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          guardian_id: string;
          relationship: string;
          is_primary?: boolean;
          is_emergency_contact?: boolean;
          can_pickup?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          guardian_id?: string;
          relationship?: string;
          is_primary?: boolean;
          is_emergency_contact?: boolean;
          can_pickup?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      student_enrollments: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          campus_id: string | null;
          academic_year_id: string;
          program_id: string;
          class_id: string;
          section_id: string | null;
          roll_number: string | null;
          status: 'enrolled' | 'promoted' | 'retained' | 'transferred' | 'graduated' | 'dropped';
          enrollment_date: string;
          exit_date: string | null;
          exit_reason: string | null;
          remarks: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          campus_id?: string | null;
          academic_year_id: string;
          program_id: string;
          class_id: string;
          section_id?: string | null;
          roll_number?: string | null;
          status?: 'enrolled' | 'promoted' | 'retained' | 'transferred' | 'graduated' | 'dropped';
          enrollment_date?: string;
          exit_date?: string | null;
          exit_reason?: string | null;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          campus_id?: string | null;
          academic_year_id?: string;
          program_id?: string;
          class_id?: string;
          section_id?: string | null;
          roll_number?: string | null;
          status?: 'enrolled' | 'promoted' | 'retained' | 'transferred' | 'graduated' | 'dropped';
          enrollment_date?: string;
          exit_date?: string | null;
          exit_reason?: string | null;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      admission_applications: {
        Row: {
          id: string;
          institution_id: string;
          application_number: string;
          campus_id: string | null;
          academic_year_id: string;
          program_id: string;
          class_id: string | null;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          date_of_birth: string;
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          blood_group: string | null;
          email: string | null;
          phone: string;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          postal_code: string | null;
          nationality: string;
          previous_school_name: string | null;
          previous_grade_or_score: string | null;
          primary_guardian_name: string;
          primary_guardian_relationship: string;
          primary_guardian_phone: string;
          primary_guardian_email: string | null;
          primary_guardian_occupation: string | null;
          secondary_guardian_name: string | null;
          secondary_guardian_relationship: string | null;
          secondary_guardian_phone: string | null;
          secondary_guardian_email: string | null;
          status: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled';
          internal_remarks: string | null;
          converted_student_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          application_number: string;
          campus_id?: string | null;
          academic_year_id: string;
          program_id: string;
          class_id?: string | null;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          date_of_birth: string;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          blood_group?: string | null;
          email?: string | null;
          phone: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          nationality?: string;
          previous_school_name?: string | null;
          previous_grade_or_score?: string | null;
          primary_guardian_name: string;
          primary_guardian_relationship: string;
          primary_guardian_phone: string;
          primary_guardian_email?: string | null;
          primary_guardian_occupation?: string | null;
          secondary_guardian_name?: string | null;
          secondary_guardian_relationship?: string | null;
          secondary_guardian_phone?: string | null;
          secondary_guardian_email?: string | null;
          status?: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled';
          internal_remarks?: string | null;
          converted_student_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          application_number?: string;
          campus_id?: string | null;
          academic_year_id?: string;
          program_id?: string;
          class_id?: string | null;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          date_of_birth?: string;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          blood_group?: string | null;
          email?: string | null;
          phone?: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          nationality?: string;
          previous_school_name?: string | null;
          previous_grade_or_score?: string | null;
          primary_guardian_name?: string;
          primary_guardian_relationship?: string;
          primary_guardian_phone?: string;
          primary_guardian_email?: string | null;
          primary_guardian_occupation?: string | null;
          secondary_guardian_name?: string | null;
          secondary_guardian_relationship?: string | null;
          secondary_guardian_phone?: string | null;
          secondary_guardian_email?: string | null;
          status?: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled';
          internal_remarks?: string | null;
          converted_student_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      admission_status_history: {
        Row: {
          id: string;
          application_id: string;
          from_status: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled' | null;
          to_status: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled';
          remarks: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          from_status?: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled' | null;
          to_status: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled';
          remarks?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          from_status?: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled' | null;
          to_status?: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled';
          remarks?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      student_documents: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string | null;
          application_id: string | null;
          document_type: 'photo' | 'birth_certificate' | 'previous_record' | 'transfer_certificate' | 'national_id' | 'medical_record' | 'other';
          title: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          verification_status: 'pending' | 'verified' | 'rejected';
          verification_notes: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id?: string | null;
          application_id?: string | null;
          document_type?: 'photo' | 'birth_certificate' | 'previous_record' | 'transfer_certificate' | 'national_id' | 'medical_record' | 'other';
          title: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verification_notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string | null;
          application_id?: string | null;
          document_type?: 'photo' | 'birth_certificate' | 'previous_record' | 'transfer_certificate' | 'national_id' | 'medical_record' | 'other';
          title?: string;
          storage_path?: string;
          file_name?: string;
          file_size?: number;
          mime_type?: string;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verification_notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          institution_id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      staff_profiles: {
        Row: {
          id: string;
          institution_id: string;
          employee_id: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          photo_url: string | null;
          date_of_birth: string;
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          email: string;
          phone: string;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          postal_code: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relationship: string | null;
          joining_date: string;
          staff_category: 'teaching' | 'non_teaching' | 'administrative' | 'technical' | 'transport' | 'support';
          designation: string;
          department_id: string | null;
          campus_id: string | null;
          employment_type: 'full_time' | 'part_time' | 'contract' | 'adjunct' | 'visiting';
          employment_status: 'active' | 'probation' | 'notice_period' | 'suspended' | 'terminated' | 'resigned' | 'retired';
          qualification: string | null;
          years_of_experience: number;
          user_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          employee_id: string;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          photo_url?: string | null;
          date_of_birth: string;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          email: string;
          phone: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relationship?: string | null;
          joining_date: string;
          staff_category?: 'teaching' | 'non_teaching' | 'administrative' | 'technical' | 'transport' | 'support';
          designation: string;
          department_id?: string | null;
          campus_id?: string | null;
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'adjunct' | 'visiting';
          employment_status?: 'active' | 'probation' | 'notice_period' | 'suspended' | 'terminated' | 'resigned' | 'retired';
          qualification?: string | null;
          years_of_experience?: number;
          user_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          employee_id?: string;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          photo_url?: string | null;
          date_of_birth?: string;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
          email?: string;
          phone?: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relationship?: string | null;
          joining_date?: string;
          staff_category?: 'teaching' | 'non_teaching' | 'administrative' | 'technical' | 'transport' | 'support';
          designation?: string;
          department_id?: string | null;
          campus_id?: string | null;
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'adjunct' | 'visiting';
          employment_status?: 'active' | 'probation' | 'notice_period' | 'suspended' | 'terminated' | 'resigned' | 'retired';
          qualification?: string | null;
          years_of_experience?: number;
          user_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      staff_employments: {
        Row: {
          id: string;
          institution_id: string;
          staff_id: string;
          campus_id: string | null;
          department_id: string | null;
          designation: string;
          employment_type: 'full_time' | 'part_time' | 'contract' | 'adjunct' | 'visiting';
          employment_status: 'active' | 'probation' | 'notice_period' | 'suspended' | 'terminated' | 'resigned' | 'retired';
          start_date: string;
          end_date: string | null;
          reporting_manager_id: string | null;
          remarks: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          staff_id: string;
          campus_id?: string | null;
          department_id?: string | null;
          designation: string;
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'adjunct' | 'visiting';
          employment_status?: 'active' | 'probation' | 'notice_period' | 'suspended' | 'terminated' | 'resigned' | 'retired';
          start_date: string;
          end_date?: string | null;
          reporting_manager_id?: string | null;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          staff_id?: string;
          campus_id?: string | null;
          department_id?: string | null;
          designation?: string;
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'adjunct' | 'visiting';
          employment_status?: 'active' | 'probation' | 'notice_period' | 'suspended' | 'terminated' | 'resigned' | 'retired';
          start_date?: string;
          end_date?: string | null;
          reporting_manager_id?: string | null;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      faculty_allocations: {
        Row: {
          id: string;
          institution_id: string;
          staff_id: string;
          academic_year_id: string;
          program_id: string;
          class_id: string | null;
          section_id: string | null;
          subject_id: string | null;
          is_class_teacher: boolean;
          is_coordinator: boolean;
          status: 'active' | 'inactive' | 'archived';
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          staff_id: string;
          academic_year_id: string;
          program_id: string;
          class_id?: string | null;
          section_id?: string | null;
          subject_id?: string | null;
          is_class_teacher?: boolean;
          is_coordinator?: boolean;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          staff_id?: string;
          academic_year_id?: string;
          program_id?: string;
          class_id?: string | null;
          section_id?: string | null;
          subject_id?: string | null;
          is_class_teacher?: boolean;
          is_coordinator?: boolean;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      staff_documents: {
        Row: {
          id: string;
          institution_id: string;
          staff_id: string;
          document_type: 'qualification' | 'experience' | 'identity' | 'contract' | 'appointment_letter' | 'other';
          title: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          verification_status: 'pending' | 'verified' | 'rejected';
          verification_notes: string | null;
          verified_by: string | null;
          verified_at: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          staff_id: string;
          document_type: 'qualification' | 'experience' | 'identity' | 'contract' | 'appointment_letter' | 'other';
          title: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verification_notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          staff_id?: string;
          document_type?: 'qualification' | 'experience' | 'identity' | 'contract' | 'appointment_letter' | 'other';
          title?: string;
          file_name?: string;
          file_size?: number;
          mime_type?: string;
          storage_path?: string;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verification_notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_invitations: {
        Row: {
          id: string;
          institution_id: string;
          staff_id: string | null;
          email: string;
          first_name: string;
          last_name: string;
          role: 'owner' | 'admin' | 'hr_administrator' | 'academic_admin' | 'department_head' | 'admissions_officer' | 'faculty' | 'staff' | 'accountant' | 'student' | 'parent';
          department_id: string | null;
          campus_id: string | null;
          invitation_token: string;
          status: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at: string;
          accepted_at: string | null;
          invited_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          staff_id?: string | null;
          email: string;
          first_name: string;
          last_name: string;
          role?: 'owner' | 'admin' | 'hr_administrator' | 'academic_admin' | 'department_head' | 'admissions_officer' | 'faculty' | 'staff' | 'accountant' | 'student' | 'parent';
          department_id?: string | null;
          campus_id?: string | null;
          invitation_token: string;
          status?: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at: string;
          accepted_at?: string | null;
          invited_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          staff_id?: string | null;
          email?: string;
          first_name?: string;
          last_name?: string;
          role?: 'owner' | 'admin' | 'hr_administrator' | 'academic_admin' | 'department_head' | 'admissions_officer' | 'faculty' | 'staff' | 'accountant' | 'student' | 'parent';
          department_id?: string | null;
          campus_id?: string | null;
          invitation_token?: string;
          status?: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at?: string;
          accepted_at?: string | null;
          invited_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leave_requests: {
        Row: {
          id: string;
          institution_id: string;
          applicant_type: 'student' | 'staff';
          student_id: string | null;
          staff_id: string | null;
          leave_type: 'casual' | 'sick' | 'medical' | 'academic' | 'bereavement' | 'maternity' | 'emergency' | 'other';
          start_date: string;
          end_date: string;
          reason: string;
          supporting_document_url: string | null;
          status: 'pending' | 'approved' | 'rejected' | 'cancelled';
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_remarks: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          applicant_type: 'student' | 'staff';
          student_id?: string | null;
          staff_id?: string | null;
          leave_type?: 'casual' | 'sick' | 'medical' | 'academic' | 'bereavement' | 'maternity' | 'emergency' | 'other';
          start_date: string;
          end_date: string;
          reason: string;
          supporting_document_url?: string | null;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          applicant_type?: 'student' | 'staff';
          student_id?: string | null;
          staff_id?: string | null;
          leave_type?: 'casual' | 'sick' | 'medical' | 'academic' | 'bereavement' | 'maternity' | 'emergency' | 'other';
          start_date?: string;
          end_date?: string;
          reason?: string;
          supporting_document_url?: string | null;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      attendance_sessions: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          campus_id: string | null;
          class_id: string;
          section_id: string | null;
          subject_id: string | null;
          session_date: string;
          session_type: 'daily' | 'lecture' | 'lab' | 'practical' | 'tutorial';
          period_number: number | null;
          start_time: string | null;
          end_time: string | null;
          topic_covered: string | null;
          marked_by_staff_id: string | null;
          status: 'draft' | 'submitted' | 'locked';
          total_students: number;
          present_count: number;
          absent_count: number;
          late_count: number;
          half_day_count: number;
          excused_count: number;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          campus_id?: string | null;
          class_id: string;
          section_id?: string | null;
          subject_id?: string | null;
          session_date: string;
          session_type?: 'daily' | 'lecture' | 'lab' | 'practical' | 'tutorial';
          period_number?: number | null;
          start_time?: string | null;
          end_time?: string | null;
          topic_covered?: string | null;
          marked_by_staff_id?: string | null;
          status?: 'draft' | 'submitted' | 'locked';
          total_students?: number;
          present_count?: number;
          absent_count?: number;
          late_count?: number;
          half_day_count?: number;
          excused_count?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          academic_year_id?: string;
          campus_id?: string | null;
          class_id?: string;
          section_id?: string | null;
          subject_id?: string | null;
          session_date?: string;
          session_type?: 'daily' | 'lecture' | 'lab' | 'practical' | 'tutorial';
          period_number?: number | null;
          start_time?: string | null;
          end_time?: string | null;
          topic_covered?: string | null;
          marked_by_staff_id?: string | null;
          status?: 'draft' | 'submitted' | 'locked';
          total_students?: number;
          present_count?: number;
          absent_count?: number;
          late_count?: number;
          half_day_count?: number;
          excused_count?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      student_attendance_records: {
        Row: {
          id: string;
          institution_id: string;
          session_id: string;
          student_id: string;
          enrollment_id: string | null;
          status: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          remarks: string | null;
          is_excused: boolean;
          leave_request_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          session_id: string;
          student_id: string;
          enrollment_id?: string | null;
          status?: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          remarks?: string | null;
          is_excused?: boolean;
          leave_request_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          session_id?: string;
          student_id?: string;
          enrollment_id?: string | null;
          status?: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          remarks?: string | null;
          is_excused?: boolean;
          leave_request_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      attendance_corrections: {
        Row: {
          id: string;
          institution_id: string;
          record_id: string;
          session_id: string;
          student_id: string;
          previous_status: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          new_status: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          reason: string;
          corrected_by: string;
          corrected_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          record_id: string;
          session_id: string;
          student_id: string;
          previous_status: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          new_status: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          reason: string;
          corrected_by: string;
          corrected_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          record_id?: string;
          session_id?: string;
          student_id?: string;
          previous_status?: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          new_status?: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          reason?: string;
          corrected_by?: string;
          corrected_at?: string;
        };
        Relationships: [];
      };
      staff_attendance_records: {
        Row: {
          id: string;
          institution_id: string;
          staff_id: string;
          attendance_date: string;
          status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          check_in_time: string | null;
          check_out_time: string | null;
          remarks: string | null;
          leave_request_id: string | null;
          marked_by: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          staff_id: string;
          attendance_date: string;
          status?: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          check_in_time?: string | null;
          check_out_time?: string | null;
          remarks?: string | null;
          leave_request_id?: string | null;
          marked_by?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          staff_id?: string;
          attendance_date?: string;
          status?: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          check_in_time?: string | null;
          check_out_time?: string | null;
          remarks?: string | null;
          leave_request_id?: string | null;
          marked_by?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      staff_attendance_corrections: {
        Row: {
          id: string;
          institution_id: string;
          record_id: string;
          staff_id: string;
          previous_status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          new_status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          reason: string;
          corrected_by: string;
          corrected_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          record_id: string;
          staff_id: string;
          previous_status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          new_status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          reason: string;
          corrected_by: string;
          corrected_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          record_id?: string;
          staff_id?: string;
          previous_status?: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          new_status?: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          reason?: string;
          corrected_by?: string;
          corrected_at?: string;
        };
        Relationships: [];
      };
      attendance_notifications: {
        Row: {
          id: string;
          institution_id: string;
          session_id: string;
          record_id: string;
          student_id: string;
          guardian_id: string;
          channel: string;
          status: 'pending' | 'queued' | 'delivered' | 'failed';
          title: string;
          message: string;
          delivery_error: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          session_id: string;
          record_id: string;
          student_id: string;
          guardian_id: string;
          channel?: string;
          status?: 'pending' | 'queued' | 'delivered' | 'failed';
          title: string;
          message: string;
          delivery_error?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          session_id?: string;
          record_id?: string;
          student_id?: string;
          guardian_id?: string;
          channel?: string;
          status?: 'pending' | 'queued' | 'delivered' | 'failed';
          title?: string;
          message?: string;
          delivery_error?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      institution_fee_settings: {
        Row: {
          id: string;
          institution_id: string;
          receipt_prefix: string;
          invoice_prefix: string;
          last_receipt_seq: number;
          last_invoice_seq: number;
          enable_partial_payments: boolean;
          allow_advance_payments: boolean;
          default_late_fee_per_day: number;
          grace_period_days: number;
          tax_percentage: number;
          tax_identifier: string | null;
          currency: string;
          gateway_provider: string;
          is_gateway_live: boolean;
          gateway_merchant_id: string | null;
          gateway_key_id: string | null;
          gateway_secret_ciphertext: string | null;
          webhook_secret_ciphertext: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          receipt_prefix?: string;
          invoice_prefix?: string;
          last_receipt_seq?: number;
          last_invoice_seq?: number;
          enable_partial_payments?: boolean;
          allow_advance_payments?: boolean;
          default_late_fee_per_day?: number;
          grace_period_days?: number;
          tax_percentage?: number;
          tax_identifier?: string | null;
          currency?: string;
          gateway_provider?: string;
          is_gateway_live?: boolean;
          gateway_merchant_id?: string | null;
          gateway_key_id?: string | null;
          gateway_secret_ciphertext?: string | null;
          webhook_secret_ciphertext?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          receipt_prefix?: string;
          invoice_prefix?: string;
          last_receipt_seq?: number;
          last_invoice_seq?: number;
          enable_partial_payments?: boolean;
          allow_advance_payments?: boolean;
          default_late_fee_per_day?: number;
          grace_period_days?: number;
          tax_percentage?: number;
          tax_identifier?: string | null;
          currency?: string;
          gateway_provider?: string;
          is_gateway_live?: boolean;
          gateway_merchant_id?: string | null;
          gateway_key_id?: string | null;
          gateway_secret_ciphertext?: string | null;
          webhook_secret_ciphertext?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fee_heads: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          code: string;
          category: 'tuition' | 'admission' | 'registration' | 'examination' | 'laboratory' | 'library' | 'transport' | 'hostel' | 'caution_deposit' | 'fine' | 'miscellaneous';
          description: string | null;
          is_refundable: boolean;
          is_optional: boolean;
          tax_exempt: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          code: string;
          category: 'tuition' | 'admission' | 'registration' | 'examination' | 'laboratory' | 'library' | 'transport' | 'hostel' | 'caution_deposit' | 'fine' | 'miscellaneous';
          description?: string | null;
          is_refundable?: boolean;
          is_optional?: boolean;
          tax_exempt?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          name?: string;
          code?: string;
          category?: 'tuition' | 'admission' | 'registration' | 'examination' | 'laboratory' | 'library' | 'transport' | 'hostel' | 'caution_deposit' | 'fine' | 'miscellaneous';
          description?: string | null;
          is_refundable?: boolean;
          is_optional?: boolean;
          tax_exempt?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      fee_structures: {
        Row: {
          id: string;
          institution_id: string;
          campus_id: string | null;
          academic_year_id: string;
          term_id: string | null;
          program_id: string | null;
          class_id: string | null;
          section_id: string | null;
          student_category: string | null;
          name: string;
          code: string;
          description: string | null;
          total_amount: number;
          currency: string;
          status: 'draft' | 'assigned' | 'partially_paid' | 'paid' | 'overdue' | 'waived' | 'cancelled';
          is_template: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          campus_id?: string | null;
          academic_year_id: string;
          term_id?: string | null;
          program_id?: string | null;
          class_id?: string | null;
          section_id?: string | null;
          student_category?: string | null;
          name: string;
          code: string;
          description?: string | null;
          total_amount?: number;
          currency?: string;
          status?: 'draft' | 'assigned' | 'partially_paid' | 'paid' | 'overdue' | 'waived' | 'cancelled';
          is_template?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          campus_id?: string | null;
          academic_year_id?: string;
          term_id?: string | null;
          program_id?: string | null;
          class_id?: string | null;
          section_id?: string | null;
          student_category?: string | null;
          name?: string;
          code?: string;
          description?: string | null;
          total_amount?: number;
          currency?: string;
          status?: 'draft' | 'assigned' | 'partially_paid' | 'paid' | 'overdue' | 'waived' | 'cancelled';
          is_template?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      fee_structure_items: {
        Row: {
          id: string;
          fee_structure_id: string;
          fee_head_id: string;
          amount: number;
          is_mandatory: boolean;
          due_date: string | null;
          sequence_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          fee_structure_id: string;
          fee_head_id: string;
          amount: number;
          is_mandatory?: boolean;
          due_date?: string | null;
          sequence_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          fee_structure_id?: string;
          fee_head_id?: string;
          amount?: number;
          is_mandatory?: boolean;
          due_date?: string | null;
          sequence_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      fee_structure_installments: {
        Row: {
          id: string;
          fee_structure_id: string;
          installment_number: number;
          name: string;
          percentage: number;
          due_date: string;
          late_fee_grace_days: number;
          late_fee_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          fee_structure_id: string;
          installment_number: number;
          name: string;
          percentage: number;
          due_date: string;
          late_fee_grace_days?: number;
          late_fee_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          fee_structure_id?: string;
          installment_number?: number;
          name?: string;
          percentage?: number;
          due_date?: string;
          late_fee_grace_days?: number;
          late_fee_amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      student_fee_assignments: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          enrollment_id: string | null;
          fee_structure_id: string | null;
          academic_year_id: string;
          gross_amount: number;
          discount_amount: number;
          net_amount: number;
          paid_amount: number;
          balance_amount: number;
          status: 'draft' | 'assigned' | 'partially_paid' | 'paid' | 'overdue' | 'waived' | 'cancelled';
          currency: string;
          remarks: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          enrollment_id?: string | null;
          fee_structure_id?: string | null;
          academic_year_id: string;
          gross_amount: number;
          discount_amount?: number;
          net_amount: number;
          paid_amount?: number;
          balance_amount?: number;
          status?: 'draft' | 'assigned' | 'partially_paid' | 'paid' | 'overdue' | 'waived' | 'cancelled';
          currency?: string;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          enrollment_id?: string | null;
          fee_structure_id?: string | null;
          academic_year_id?: string;
          gross_amount?: number;
          discount_amount?: number;
          net_amount?: number;
          paid_amount?: number;
          balance_amount?: number;
          status?: 'draft' | 'assigned' | 'partially_paid' | 'paid' | 'overdue' | 'waived' | 'cancelled';
          currency?: string;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      student_fee_assignment_items: {
        Row: {
          id: string;
          assignment_id: string;
          fee_head_id: string;
          base_amount: number;
          discount_amount: number;
          net_amount: number;
          paid_amount: number;
          balance_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          fee_head_id: string;
          base_amount: number;
          discount_amount?: number;
          net_amount: number;
          paid_amount?: number;
          balance_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          fee_head_id?: string;
          base_amount?: number;
          discount_amount?: number;
          net_amount?: number;
          paid_amount?: number;
          balance_amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      student_fee_installments: {
        Row: {
          id: string;
          assignment_id: string;
          installment_number: number;
          name: string;
          due_date: string;
          amount: number;
          paid_amount: number;
          balance_amount: number;
          late_fee_amount: number;
          late_fee_paid: number;
          status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'waived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          installment_number: number;
          name: string;
          due_date: string;
          amount: number;
          paid_amount?: number;
          balance_amount?: number;
          late_fee_amount?: number;
          late_fee_paid?: number;
          status?: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'waived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          installment_number?: number;
          name?: string;
          due_date?: string;
          amount?: number;
          paid_amount?: number;
          balance_amount?: number;
          late_fee_amount?: number;
          late_fee_paid?: number;
          status?: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'waived';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fee_concessions: {
        Row: {
          id: string;
          institution_id: string;
          assignment_id: string;
          student_id: string;
          concession_type: 'scholarship' | 'sibling_discount' | 'staff_ward' | 'merit' | 'financial_aid' | 'sports_quota' | 'early_bird' | 'special_waiver' | 'custom';
          calculation_type: 'percentage' | 'fixed_amount';
          calculation_value: number;
          original_amount: number;
          approved_amount: number;
          reason: string;
          status: 'requested' | 'under_review' | 'approved' | 'rejected' | 'revoked';
          requested_by: string;
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          assignment_id: string;
          student_id: string;
          concession_type: 'scholarship' | 'sibling_discount' | 'staff_ward' | 'merit' | 'financial_aid' | 'sports_quota' | 'early_bird' | 'special_waiver' | 'custom';
          calculation_type: 'percentage' | 'fixed_amount';
          calculation_value: number;
          original_amount: number;
          approved_amount?: number;
          reason: string;
          status?: 'requested' | 'under_review' | 'approved' | 'rejected' | 'revoked';
          requested_by: string;
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          assignment_id?: string;
          student_id?: string;
          concession_type?: 'scholarship' | 'sibling_discount' | 'staff_ward' | 'merit' | 'financial_aid' | 'sports_quota' | 'early_bird' | 'special_waiver' | 'custom';
          calculation_type?: 'percentage' | 'fixed_amount';
          calculation_value?: number;
          original_amount?: number;
          approved_amount?: number;
          reason?: string;
          status?: 'requested' | 'under_review' | 'approved' | 'rejected' | 'revoked';
          requested_by?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fee_payments: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          enrollment_id: string | null;
          assignment_id: string | null;
          receipt_number: string;
          transaction_reference: string | null;
          payment_method: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'payment_gateway' | 'cheque' | 'demand_draft' | 'advance_wallet';
          payment_status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
          amount_received: number;
          allocated_amount: number;
          advance_credit_amount: number;
          currency: string;
          payment_date: string;
          notes: string | null;
          receipt_qr_hash: string | null;
          collected_by: string;
          is_reversed: boolean;
          reversal_reason: string | null;
          reversed_by: string | null;
          reversed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          enrollment_id?: string | null;
          assignment_id?: string | null;
          receipt_number: string;
          transaction_reference?: string | null;
          payment_method: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'payment_gateway' | 'cheque' | 'demand_draft' | 'advance_wallet';
          payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
          amount_received: number;
          allocated_amount?: number;
          advance_credit_amount?: number;
          currency?: string;
          payment_date?: string;
          notes?: string | null;
          receipt_qr_hash?: string | null;
          collected_by: string;
          is_reversed?: boolean;
          reversal_reason?: string | null;
          reversed_by?: string | null;
          reversed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          enrollment_id?: string | null;
          assignment_id?: string | null;
          receipt_number?: string;
          transaction_reference?: string | null;
          payment_method?: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'payment_gateway' | 'cheque' | 'demand_draft' | 'advance_wallet';
          payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
          amount_received?: number;
          allocated_amount?: number;
          advance_credit_amount?: number;
          currency?: string;
          payment_date?: string;
          notes?: string | null;
          receipt_qr_hash?: string | null;
          collected_by?: string;
          is_reversed?: boolean;
          reversal_reason?: string | null;
          reversed_by?: string | null;
          reversed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_allocations: {
        Row: {
          id: string;
          payment_id: string;
          assignment_id: string;
          assignment_item_id: string | null;
          installment_id: string | null;
          allocated_amount: number;
          fee_head_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          assignment_id: string;
          assignment_item_id?: string | null;
          installment_id?: string | null;
          allocated_amount: number;
          fee_head_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          assignment_id?: string;
          assignment_item_id?: string | null;
          installment_id?: string | null;
          allocated_amount?: number;
          fee_head_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      student_advance_balances: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          balance_amount: number;
          currency: string;
          last_updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          balance_amount?: number;
          currency?: string;
          last_updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          balance_amount?: number;
          currency?: string;
          last_updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      financial_ledger_entries: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          entry_type: 'fee_charged' | 'fee_reversal' | 'payment_received' | 'payment_bounce' | 'concession_applied' | 'concession_revoked' | 'refund_issued' | 'advance_credit' | 'advance_debit' | 'fine_assessed' | 'fine_waived';
          debit_amount: number;
          credit_amount: number;
          balance_after: number;
          currency: string;
          reference_type: string;
          reference_id: string;
          receipt_number: string | null;
          description: string;
          idempotency_key: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          entry_type: 'fee_charged' | 'fee_reversal' | 'payment_received' | 'payment_bounce' | 'concession_applied' | 'concession_revoked' | 'refund_issued' | 'advance_credit' | 'advance_debit' | 'fine_assessed' | 'fine_waived';
          debit_amount?: number;
          credit_amount?: number;
          balance_after: number;
          currency?: string;
          reference_type: string;
          reference_id: string;
          receipt_number?: string | null;
          description: string;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          entry_type?: 'fee_charged' | 'fee_reversal' | 'payment_received' | 'payment_bounce' | 'concession_applied' | 'concession_revoked' | 'refund_issued' | 'advance_credit' | 'advance_debit' | 'fine_assessed' | 'fine_waived';
          debit_amount?: number;
          credit_amount?: number;
          balance_after?: number;
          currency?: string;
          reference_type?: string;
          reference_id?: string;
          receipt_number?: string | null;
          description?: string;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      fee_refund_requests: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          payment_id: string;
          refund_number: string;
          amount_requested: number;
          amount_approved: number | null;
          reason: string;
          status: 'requested' | 'under_review' | 'approved' | 'rejected' | 'processed' | 'cancelled';
          disbursement_method: string | null;
          disbursement_reference: string | null;
          requested_by: string;
          approved_by: string | null;
          approved_at: string | null;
          processed_by: string | null;
          processed_at: string | null;
          rejection_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          payment_id: string;
          refund_number: string;
          amount_requested: number;
          amount_approved?: number | null;
          reason: string;
          status?: 'requested' | 'under_review' | 'approved' | 'rejected' | 'processed' | 'cancelled';
          disbursement_method?: string | null;
          disbursement_reference?: string | null;
          requested_by: string;
          approved_by?: string | null;
          approved_at?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          rejection_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          payment_id?: string;
          refund_number?: string;
          amount_requested?: number;
          amount_approved?: number | null;
          reason?: string;
          status?: 'requested' | 'under_review' | 'approved' | 'rejected' | 'processed' | 'cancelled';
          disbursement_method?: string | null;
          disbursement_reference?: string | null;
          requested_by?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          rejection_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gateway_orders: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          assignment_id: string | null;
          order_reference: string;
          gateway_provider: string;
          gateway_order_id: string;
          amount: number;
          currency: string;
          status: 'created' | 'attempted' | 'paid' | 'failed' | 'expired';
          payment_id: string | null;
          metadata: Record<string, unknown>;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          assignment_id?: string | null;
          order_reference: string;
          gateway_provider: string;
          gateway_order_id: string;
          amount: number;
          currency?: string;
          status?: 'created' | 'attempted' | 'paid' | 'failed' | 'expired';
          payment_id?: string | null;
          metadata?: Record<string, unknown>;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          assignment_id?: string | null;
          order_reference?: string;
          gateway_provider?: string;
          gateway_order_id?: string;
          amount?: number;
          currency?: string;
          status?: 'created' | 'attempted' | 'paid' | 'failed' | 'expired';
          payment_id?: string | null;
          metadata?: Record<string, unknown>;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gateway_webhook_events: {
        Row: {
          id: string;
          institution_id: string;
          gateway_provider: string;
          event_id: string;
          event_type: string;
          payload: Record<string, unknown>;
          signature: string | null;
          processed: boolean;
          error_message: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          gateway_provider: string;
          event_id: string;
          event_type: string;
          payload: Record<string, unknown>;
          signature?: string | null;
          processed?: boolean;
          error_message?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          gateway_provider?: string;
          event_id?: string;
          event_type?: string;
          payload?: Record<string, unknown>;
          signature?: string | null;
          processed?: boolean;
          error_message?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          institution_id: string;
          recipient_user_id: string;
          category: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
          title: string;
          body: string;
          priority: 'low' | 'normal' | 'high' | 'urgent';
          data: Record<string, unknown>;
          is_read: boolean;
          read_at: string | null;
          expires_at: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          recipient_user_id: string;
          category?: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
          title: string;
          body: string;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          data?: Record<string, unknown>;
          is_read?: boolean;
          read_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          recipient_user_id?: string;
          category?: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
          title?: string;
          body?: string;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          data?: Record<string, unknown>;
          is_read?: boolean;
          read_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          id: string;
          notification_id: string;
          institution_id: string;
          channel: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
          recipient_target: string;
          status: 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'cancelled';
          attempt_count: number;
          max_attempts: number;
          last_attempt_at: string | null;
          next_retry_at: string | null;
          response_payload: Record<string, unknown> | null;
          error_message: string | null;
          external_message_id: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          institution_id: string;
          channel: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
          recipient_target: string;
          status?: 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'cancelled';
          attempt_count?: number;
          max_attempts?: number;
          last_attempt_at?: string | null;
          next_retry_at?: string | null;
          response_payload?: Record<string, unknown> | null;
          error_message?: string | null;
          external_message_id?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          notification_id?: string;
          institution_id?: string;
          channel?: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
          recipient_target?: string;
          status?: 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'cancelled';
          attempt_count?: number;
          max_attempts?: number;
          last_attempt_at?: string | null;
          next_retry_at?: string | null;
          response_payload?: Record<string, unknown> | null;
          error_message?: string | null;
          external_message_id?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          institution_id: string;
          user_id: string;
          category: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
          channel: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          user_id: string;
          category: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
          channel: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          user_id?: string;
          category?: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
          channel?: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_templates: {
        Row: {
          id: string;
          institution_id: string;
          template_code: string;
          name: string;
          category: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
          channel: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
          subject_template: string | null;
          body_template: string;
          variables: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          template_code: string;
          name: string;
          category: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
          channel: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
          subject_template?: string | null;
          body_template: string;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          template_code?: string;
          name?: string;
          category?: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
          channel?: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
          subject_template?: string | null;
          body_template?: string;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_device_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web';
          device_model: string | null;
          app_version: string | null;
          is_active: boolean;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web';
          device_model?: string | null;
          app_version?: string | null;
          is_active?: boolean;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: 'ios' | 'android' | 'web';
          device_model?: string | null;
          app_version?: string | null;
          is_active?: boolean;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          institution_id: string;
          title: string;
          content: string;
          scope: 'institution' | 'campus' | 'department' | 'program' | 'class' | 'section' | 'role' | 'individual';
          target_entity_id: string | null;
          target_role: string | null;
          priority: 'low' | 'standard' | 'important' | 'urgent';
          status: 'draft' | 'scheduled' | 'published' | 'archived';
          published_at: string | null;
          expires_at: string | null;
          scheduled_for: string | null;
          requires_acknowledgement: boolean;
          acknowledgement_deadline: string | null;
          attachments: Array<{ name: string; url: string; size?: number; type?: string }>;
          view_count: number;
          acknowledgement_count: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          title: string;
          content: string;
          scope?: 'institution' | 'campus' | 'department' | 'program' | 'class' | 'section' | 'role' | 'individual';
          target_entity_id?: string | null;
          target_role?: string | null;
          priority?: 'low' | 'standard' | 'important' | 'urgent';
          status?: 'draft' | 'scheduled' | 'published' | 'archived';
          published_at?: string | null;
          expires_at?: string | null;
          scheduled_for?: string | null;
          requires_acknowledgement?: boolean;
          acknowledgement_deadline?: string | null;
          attachments?: Array<{ name: string; url: string; size?: number; type?: string }>;
          view_count?: number;
          acknowledgement_count?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          title?: string;
          content?: string;
          scope?: 'institution' | 'campus' | 'department' | 'program' | 'class' | 'section' | 'role' | 'individual';
          target_entity_id?: string | null;
          target_role?: string | null;
          priority?: 'low' | 'standard' | 'important' | 'urgent';
          status?: 'draft' | 'scheduled' | 'published' | 'archived';
          published_at?: string | null;
          expires_at?: string | null;
          scheduled_for?: string | null;
          requires_acknowledgement?: boolean;
          acknowledgement_deadline?: string | null;
          attachments?: Array<{ name: string; url: string; size?: number; type?: string }>;
          view_count?: number;
          acknowledgement_count?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      announcement_acknowledgements: {
        Row: {
          id: string;
          announcement_id: string;
          institution_id: string;
          user_id: string;
          acknowledged_at: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          announcement_id: string;
          institution_id: string;
          user_id: string;
          acknowledged_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          announcement_id?: string;
          institution_id?: string;
          user_id?: string;
          acknowledged_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      homework_assignments: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          campus_id: string | null;
          class_id: string;
          section_id: string | null;
          subject_id: string;
          teacher_id: string;
          title: string;
          description: string | null;
          instructions: string | null;
          attachments: Array<{ name: string; url: string; size?: number }>;
          max_marks: number;
          due_date: string;
          due_time: string | null;
          allow_late_submissions: boolean;
          late_penalty_percent: number;
          status: 'draft' | 'published' | 'closed' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          campus_id?: string | null;
          class_id: string;
          section_id?: string | null;
          subject_id: string;
          teacher_id: string;
          title: string;
          description?: string | null;
          instructions?: string | null;
          attachments?: Array<{ name: string; url: string; size?: number }>;
          max_marks?: number;
          due_date: string;
          due_time?: string | null;
          allow_late_submissions?: boolean;
          late_penalty_percent?: number;
          status?: 'draft' | 'published' | 'closed' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          academic_year_id?: string;
          campus_id?: string | null;
          class_id?: string;
          section_id?: string | null;
          subject_id?: string;
          teacher_id?: string;
          title?: string;
          description?: string | null;
          instructions?: string | null;
          attachments?: Array<{ name: string; url: string; size?: number }>;
          max_marks?: number;
          due_date?: string;
          due_time?: string | null;
          allow_late_submissions?: boolean;
          late_penalty_percent?: number;
          status?: 'draft' | 'published' | 'closed' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      homework_submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          institution_id: string;
          submission_text: string | null;
          attachments: Array<{ name: string; url: string; size?: number }>;
          submitted_at: string;
          is_late: boolean;
          status: 'pending' | 'submitted' | 'late' | 'graded' | 'resubmit_requested';
          marks_obtained: number | null;
          feedback: string | null;
          graded_by: string | null;
          graded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          institution_id: string;
          submission_text?: string | null;
          attachments?: Array<{ name: string; url: string; size?: number }>;
          submitted_at?: string;
          is_late?: boolean;
          status?: 'pending' | 'submitted' | 'late' | 'graded' | 'resubmit_requested';
          marks_obtained?: number | null;
          feedback?: string | null;
          graded_by?: string | null;
          graded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          institution_id?: string;
          submission_text?: string | null;
          attachments?: Array<{ name: string; url: string; size?: number }>;
          submitted_at?: string;
          is_late?: boolean;
          status?: 'pending' | 'submitted' | 'late' | 'graded' | 'resubmit_requested';
          marks_obtained?: number | null;
          feedback?: string | null;
          graded_by?: string | null;
          graded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      communication_threads: {
        Row: {
          id: string;
          institution_id: string;
          thread_type: 'parent_teacher' | 'student_faculty' | 'admin_broadcast' | 'staff_internal';
          subject: string;
          created_by: string;
          is_locked: boolean;
          is_archived: boolean;
          last_message_at: string;
          message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          thread_type: 'parent_teacher' | 'student_faculty' | 'admin_broadcast' | 'staff_internal';
          subject: string;
          created_by: string;
          is_locked?: boolean;
          is_archived?: boolean;
          last_message_at?: string;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          thread_type?: 'parent_teacher' | 'student_faculty' | 'admin_broadcast' | 'staff_internal';
          subject?: string;
          created_by?: string;
          is_locked?: boolean;
          is_archived?: boolean;
          last_message_at?: string;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      communication_participants: {
        Row: {
          id: string;
          thread_id: string;
          institution_id: string;
          user_id: string;
          role: string;
          last_read_at: string | null;
          is_muted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          institution_id: string;
          user_id: string;
          role?: string;
          last_read_at?: string | null;
          is_muted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          institution_id?: string;
          user_id?: string;
          role?: string;
          last_read_at?: string | null;
          is_muted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      communication_messages: {
        Row: {
          id: string;
          thread_id: string;
          institution_id: string;
          sender_id: string;
          body: string;
          attachments: Array<{ name: string; url: string; size?: number; type?: string }>;
          is_edited: boolean;
          is_flagged: boolean;
          is_deleted: boolean;
          flagged_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          institution_id: string;
          sender_id: string;
          body: string;
          attachments?: Array<{ name: string; url: string; size?: number; type?: string }>;
          is_edited?: boolean;
          is_flagged?: boolean;
          is_deleted?: boolean;
          flagged_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          institution_id?: string;
          sender_id?: string;
          body?: string;
          attachments?: Array<{ name: string; url: string; size?: number; type?: string }>;
          is_edited?: boolean;
          is_flagged?: boolean;
          is_deleted?: boolean;
          flagged_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transport_vehicles: {
        Row: {
          id: string;
          institution_id: string;
          campus_id: string | null;
          registration_number: string;
          vehicle_model: string;
          vehicle_type: string;
          seating_capacity: number;
          standing_capacity: number;
          fuel_type: string | null;
          ownership_type: string;
          status: 'active' | 'inactive' | 'under_maintenance' | 'retired';
          gps_device_id: string | null;
          make_year: number | null;
          color: string | null;
          chassis_number: string | null;
          engine_number: string | null;
          notes: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          campus_id?: string | null;
          registration_number: string;
          vehicle_model: string;
          vehicle_type?: string;
          seating_capacity: number;
          standing_capacity?: number;
          fuel_type?: string | null;
          ownership_type?: string;
          status?: 'active' | 'inactive' | 'under_maintenance' | 'retired';
          gps_device_id?: string | null;
          make_year?: number | null;
          color?: string | null;
          chassis_number?: string | null;
          engine_number?: string | null;
          notes?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          campus_id?: string | null;
          registration_number?: string;
          vehicle_model?: string;
          vehicle_type?: string;
          seating_capacity?: number;
          standing_capacity?: number;
          fuel_type?: string | null;
          ownership_type?: string;
          status?: 'active' | 'inactive' | 'under_maintenance' | 'retired';
          gps_device_id?: string | null;
          make_year?: number | null;
          color?: string | null;
          chassis_number?: string | null;
          engine_number?: string | null;
          notes?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicle_documents: {
        Row: {
          id: string;
          institution_id: string;
          vehicle_id: string;
          document_type: 'insurance' | 'permit' | 'fitness_certificate' | 'pollution_certificate' | 'road_tax' | 'other';
          document_number: string;
          issued_date: string;
          expiry_date: string;
          issuing_authority: string | null;
          file_url: string | null;
          status: 'valid' | 'expiring_soon' | 'expired';
          notes: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          vehicle_id: string;
          document_type: 'insurance' | 'permit' | 'fitness_certificate' | 'pollution_certificate' | 'road_tax' | 'other';
          document_number: string;
          issued_date: string;
          expiry_date: string;
          issuing_authority?: string | null;
          file_url?: string | null;
          status?: 'valid' | 'expiring_soon' | 'expired';
          notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          vehicle_id?: string;
          document_type?: 'insurance' | 'permit' | 'fitness_certificate' | 'pollution_certificate' | 'road_tax' | 'other';
          document_number?: string;
          issued_date?: string;
          expiry_date?: string;
          issuing_authority?: string | null;
          file_url?: string | null;
          status?: 'valid' | 'expiring_soon' | 'expired';
          notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicle_maintenance_records: {
        Row: {
          id: string;
          institution_id: string;
          vehicle_id: string;
          maintenance_type: 'routine_service' | 'repair' | 'inspection' | 'emergency_breakdown' | 'tire_replacement' | 'other';
          description: string;
          odometer_reading: number | null;
          cost: number;
          service_center: string | null;
          start_date: string;
          completion_date: string | null;
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          performed_by: string | null;
          invoice_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          vehicle_id: string;
          maintenance_type: 'routine_service' | 'repair' | 'inspection' | 'emergency_breakdown' | 'tire_replacement' | 'other';
          description: string;
          odometer_reading?: number | null;
          cost?: number;
          service_center?: string | null;
          start_date: string;
          completion_date?: string | null;
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          performed_by?: string | null;
          invoice_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          vehicle_id?: string;
          maintenance_type?: 'routine_service' | 'repair' | 'inspection' | 'emergency_breakdown' | 'tire_replacement' | 'other';
          description?: string;
          odometer_reading?: number | null;
          cost?: number;
          service_center?: string | null;
          start_date?: string;
          completion_date?: string | null;
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          performed_by?: string | null;
          invoice_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transport_staff_profiles: {
        Row: {
          id: string;
          institution_id: string;
          staff_profile_id: string;
          role_type: 'driver' | 'attendant' | 'both';
          license_number: string | null;
          license_type: string | null;
          license_expiry: string | null;
          badge_number: string | null;
          police_verification_status: string;
          police_verification_date: string | null;
          medical_fitness_expiry: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          staff_profile_id: string;
          role_type?: 'driver' | 'attendant' | 'both';
          license_number?: string | null;
          license_type?: string | null;
          license_expiry?: string | null;
          badge_number?: string | null;
          police_verification_status?: string;
          police_verification_date?: string | null;
          medical_fitness_expiry?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          staff_profile_id?: string;
          role_type?: 'driver' | 'attendant' | 'both';
          license_number?: string | null;
          license_type?: string | null;
          license_expiry?: string | null;
          badge_number?: string | null;
          police_verification_status?: string;
          police_verification_date?: string | null;
          medical_fitness_expiry?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transport_stops: {
        Row: {
          id: string;
          institution_id: string;
          campus_id: string | null;
          name: string;
          code: string | null;
          address: string | null;
          latitude: number;
          longitude: number;
          geofence_radius_meters: number;
          landmark: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          campus_id?: string | null;
          name: string;
          code?: string | null;
          address?: string | null;
          latitude: number;
          longitude: number;
          geofence_radius_meters?: number;
          landmark?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          campus_id?: string | null;
          name?: string;
          code?: string | null;
          address?: string | null;
          latitude?: number;
          longitude?: number;
          geofence_radius_meters?: number;
          landmark?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transport_routes: {
        Row: {
          id: string;
          institution_id: string;
          campus_id: string | null;
          academic_year_id: string;
          route_name: string;
          route_code: string;
          start_location: string;
          destination: string;
          route_type: 'morning_pickup' | 'evening_dropoff' | 'both' | 'shuttle';
          shift: 'morning' | 'afternoon' | 'evening' | 'general';
          assigned_vehicle_id: string | null;
          assigned_driver_id: string | null;
          assigned_attendant_id: string | null;
          total_distance_km: number;
          estimated_duration_mins: number;
          status: string;
          description: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          campus_id?: string | null;
          academic_year_id: string;
          route_name: string;
          route_code: string;
          start_location: string;
          destination: string;
          route_type?: 'morning_pickup' | 'evening_dropoff' | 'both' | 'shuttle';
          shift?: 'morning' | 'afternoon' | 'evening' | 'general';
          assigned_vehicle_id?: string | null;
          assigned_driver_id?: string | null;
          assigned_attendant_id?: string | null;
          total_distance_km?: number;
          estimated_duration_mins?: number;
          status?: string;
          description?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          campus_id?: string | null;
          academic_year_id?: string;
          route_name?: string;
          route_code?: string;
          start_location?: string;
          destination?: string;
          route_type?: 'morning_pickup' | 'evening_dropoff' | 'both' | 'shuttle';
          shift?: 'morning' | 'afternoon' | 'evening' | 'general';
          assigned_vehicle_id?: string | null;
          assigned_driver_id?: string | null;
          assigned_attendant_id?: string | null;
          total_distance_km?: number;
          estimated_duration_mins?: number;
          status?: string;
          description?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      route_stops: {
        Row: {
          id: string;
          institution_id: string;
          route_id: string;
          stop_id: string;
          stop_order: number;
          scheduled_arrival_time: string;
          scheduled_departure_time: string;
          pickup_allowed: boolean;
          dropoff_allowed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          route_id: string;
          stop_id: string;
          stop_order: number;
          scheduled_arrival_time: string;
          scheduled_departure_time: string;
          pickup_allowed?: boolean;
          dropoff_allowed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          route_id?: string;
          stop_id?: string;
          stop_order?: number;
          scheduled_arrival_time?: string;
          scheduled_departure_time?: string;
          pickup_allowed?: boolean;
          dropoff_allowed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      student_transport_assignments: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          academic_year_id: string;
          route_id: string;
          pickup_stop_id: string;
          dropoff_stop_id: string;
          fee_structure_id: string | null;
          status: 'active' | 'suspended' | 'withdrawn' | 'pending_approval';
          parent_confirmed: boolean;
          effective_start_date: string;
          effective_end_date: string | null;
          cancellation_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          academic_year_id: string;
          route_id: string;
          pickup_stop_id: string;
          dropoff_stop_id: string;
          fee_structure_id?: string | null;
          status?: 'active' | 'suspended' | 'withdrawn' | 'pending_approval';
          parent_confirmed?: boolean;
          effective_start_date?: string;
          effective_end_date?: string | null;
          cancellation_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          academic_year_id?: string;
          route_id?: string;
          pickup_stop_id?: string;
          dropoff_stop_id?: string;
          fee_structure_id?: string | null;
          status?: 'active' | 'suspended' | 'withdrawn' | 'pending_approval';
          parent_confirmed?: boolean;
          effective_start_date?: string;
          effective_end_date?: string | null;
          cancellation_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transport_journeys: {
        Row: {
          id: string;
          institution_id: string;
          route_id: string;
          vehicle_id: string;
          driver_id: string;
          attendant_id: string | null;
          journey_date: string;
          shift: 'morning' | 'afternoon' | 'evening' | 'general';
          journey_type: 'pickup' | 'dropoff' | 'shuttle';
          status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled' | 'emergency';
          scheduled_start_time: string | null;
          actual_start_time: string | null;
          scheduled_end_time: string | null;
          actual_end_time: string | null;
          current_stop_id: string | null;
          delay_minutes: number;
          delay_reason: string | null;
          emergency_reason: string | null;
          emergency_reported_at: string | null;
          cancellation_reason: string | null;
          notes: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          route_id: string;
          vehicle_id: string;
          driver_id: string;
          attendant_id?: string | null;
          journey_date?: string;
          shift?: 'morning' | 'afternoon' | 'evening' | 'general';
          journey_type?: 'pickup' | 'dropoff' | 'shuttle';
          status?: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled' | 'emergency';
          scheduled_start_time?: string | null;
          actual_start_time?: string | null;
          scheduled_end_time?: string | null;
          actual_end_time?: string | null;
          current_stop_id?: string | null;
          delay_minutes?: number;
          delay_reason?: string | null;
          emergency_reason?: string | null;
          emergency_reported_at?: string | null;
          cancellation_reason?: string | null;
          notes?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          route_id?: string;
          vehicle_id?: string;
          driver_id?: string;
          attendant_id?: string | null;
          journey_date?: string;
          shift?: 'morning' | 'afternoon' | 'evening' | 'general';
          journey_type?: 'pickup' | 'dropoff' | 'shuttle';
          status?: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled' | 'emergency';
          scheduled_start_time?: string | null;
          actual_start_time?: string | null;
          scheduled_end_time?: string | null;
          actual_end_time?: string | null;
          current_stop_id?: string | null;
          delay_minutes?: number;
          delay_reason?: string | null;
          emergency_reason?: string | null;
          emergency_reported_at?: string | null;
          cancellation_reason?: string | null;
          notes?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      journey_stop_events: {
        Row: {
          id: string;
          institution_id: string;
          journey_id: string;
          stop_id: string;
          stop_order: number;
          scheduled_arrival_time: string | null;
          actual_arrival_time: string | null;
          actual_departure_time: string | null;
          status: 'pending' | 'arrived' | 'departed' | 'skipped';
          skipped_reason: string | null;
          students_expected: number;
          students_boarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          journey_id: string;
          stop_id: string;
          stop_order: number;
          scheduled_arrival_time?: string | null;
          actual_arrival_time?: string | null;
          actual_departure_time?: string | null;
          status?: 'pending' | 'arrived' | 'departed' | 'skipped';
          skipped_reason?: string | null;
          students_expected?: number;
          students_boarded?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          journey_id?: string;
          stop_id?: string;
          stop_order?: number;
          scheduled_arrival_time?: string | null;
          actual_arrival_time?: string | null;
          actual_departure_time?: string | null;
          status?: 'pending' | 'arrived' | 'departed' | 'skipped';
          skipped_reason?: string | null;
          students_expected?: number;
          students_boarded?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      vehicle_live_locations: {
        Row: {
          vehicle_id: string;
          institution_id: string;
          journey_id: string | null;
          latitude: number;
          longitude: number;
          speed_kmh: number;
          heading: number;
          accuracy_meters: number;
          battery_level: number | null;
          provider: string;
          recorded_at: string;
          updated_at: string;
        };
        Insert: {
          vehicle_id: string;
          institution_id: string;
          journey_id?: string | null;
          latitude: number;
          longitude: number;
          speed_kmh?: number;
          heading?: number;
          accuracy_meters?: number;
          battery_level?: number | null;
          provider?: string;
          recorded_at: string;
          updated_at?: string;
        };
        Update: {
          vehicle_id?: string;
          institution_id?: string;
          journey_id?: string | null;
          latitude?: number;
          longitude?: number;
          speed_kmh?: number;
          heading?: number;
          accuracy_meters?: number;
          battery_level?: number | null;
          provider?: string;
          recorded_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicle_location_history: {
        Row: {
          id: string;
          institution_id: string;
          vehicle_id: string;
          journey_id: string;
          latitude: number;
          longitude: number;
          speed_kmh: number;
          heading: number;
          recorded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          vehicle_id: string;
          journey_id: string;
          latitude: number;
          longitude: number;
          speed_kmh?: number;
          heading?: number;
          recorded_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          vehicle_id?: string;
          journey_id?: string;
          latitude?: number;
          longitude?: number;
          speed_kmh?: number;
          heading?: number;
          recorded_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      student_boarding_events: {
        Row: {
          id: string;
          institution_id: string;
          journey_id: string;
          student_id: string;
          stop_id: string;
          event_type: 'pickup' | 'dropoff';
          timestamp: string;
          verification_method: 'driver_manual' | 'attendant_manual' | 'qr_scan' | 'nfc' | 'rfid' | 'other';
          verified_by: string | null;
          is_corrected: boolean;
          correction_reason: string | null;
          corrected_by: string | null;
          corrected_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          journey_id: string;
          student_id: string;
          stop_id: string;
          event_type: 'pickup' | 'dropoff';
          timestamp?: string;
          verification_method?: 'driver_manual' | 'attendant_manual' | 'qr_scan' | 'nfc' | 'rfid' | 'other';
          verified_by?: string | null;
          is_corrected?: boolean;
          correction_reason?: string | null;
          corrected_by?: string | null;
          corrected_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          journey_id?: string;
          student_id?: string;
          stop_id?: string;
          event_type?: 'pickup' | 'dropoff';
          timestamp?: string;
          verification_method?: 'driver_manual' | 'attendant_manual' | 'qr_scan' | 'nfc' | 'rfid' | 'other';
          verified_by?: string | null;
          is_corrected?: boolean;
          correction_reason?: string | null;
          corrected_by?: string | null;
          corrected_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transport_change_requests: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          requested_by_user_id: string;
          request_type: 'new_enrollment' | 'route_change' | 'stop_change' | 'temporary_suspension' | 'withdrawal';
          target_route_id: string | null;
          target_pickup_stop_id: string | null;
          target_dropoff_stop_id: string | null;
          reason: string;
          status: 'pending' | 'approved' | 'rejected' | 'cancelled';
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          requested_by_user_id: string;
          request_type: 'new_enrollment' | 'route_change' | 'stop_change' | 'temporary_suspension' | 'withdrawal';
          target_route_id?: string | null;
          target_pickup_stop_id?: string | null;
          target_dropoff_stop_id?: string | null;
          reason: string;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_id?: string;
          requested_by_user_id?: string;
          request_type?: 'new_enrollment' | 'route_change' | 'stop_change' | 'temporary_suspension' | 'withdrawal';
          target_route_id?: string | null;
          target_pickup_stop_id?: string | null;
          target_dropoff_stop_id?: string | null;
          reason?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transport_settings: {
        Row: {
          id: string;
          institution_id: string;
          gps_provider: string;
          gps_update_interval_seconds: number;
          location_retention_days: number;
          approaching_stop_distance_meters: number;
          allow_parent_tracking: boolean;
          require_parent_change_approval: boolean;
          prevent_overcapacity_assignment: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          gps_provider?: string;
          gps_update_interval_seconds?: number;
          location_retention_days?: number;
          approaching_stop_distance_meters?: number;
          allow_parent_tracking?: boolean;
          require_parent_change_approval?: boolean;
          prevent_overcapacity_assignment?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          gps_provider?: string;
          gps_update_interval_seconds?: number;
          location_retention_days?: number;
          approaching_stop_distance_meters?: number;
          allow_parent_tracking?: boolean;
          require_parent_change_approval?: boolean;
          prevent_overcapacity_assignment?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_institution_with_owner: {
        Args: {
          p_name: string;
          p_slug: string;
          p_code: string;
          p_type: 'school' | 'junior_college' | 'degree_college' | 'engineering_college' | 'university';
          p_city: string;
          p_state: string;
          p_country: string;
          p_email?: string | null;
          p_phone?: string | null;
          p_website?: string | null;
          p_address?: string | null;
          p_postal_code?: string | null;
          p_campus_name?: string;
          p_campus_code?: string;
          p_ay_name?: string;
          p_ay_code?: string;
          p_ay_start?: string;
          p_ay_end?: string;
          p_term_system?: 'semester' | 'trimester' | 'annual';
        };
        Returns: {
          success: boolean;
          institution_id: string;
          institution: Record<string, unknown>;
          campus_id: string;
          academic_year_id: string;
        };
      };
      convert_admission_to_student: {
        Args: {
          p_application_id: string;
          p_admission_number: string;
          p_section_id?: string | null;
          p_roll_number?: string | null;
        };
        Returns: {
          success: boolean;
          student_id: string;
          admission_number: string;
        };
      };
      get_user_institution_ids: {
        Args: Record<string, never>;
        Returns: { institution_id: string }[];
      };
      has_institution_role: {
        Args: {
          p_institution_id: string;
          p_roles: string[];
        };
        Returns: boolean;
      };
      is_institution_member: {
        Args: {
          p_institution_id: string;
        };
        Returns: boolean;
      };
      is_guardian_of_student: {
        Args: {
          p_student_id: string;
        };
        Returns: boolean;
      };
      accept_staff_invitation: {
        Args: {
          p_token: string;
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          membership_id: string;
          institution_id: string;
          role: string;
          staff_id?: string | null;
        };
      };
      record_student_attendance_batch: {
        Args: {
          p_institution_id: string;
          p_session_id: string;
          p_records: Record<string, unknown>[];
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          session_id: string;
          total_students: number;
          present_count: number;
          absent_count: number;
          late_count: number;
          half_day_count: number;
          excused_count: number;
        };
      };
      correct_student_attendance_record: {
        Args: {
          p_institution_id: string;
          p_record_id: string;
          p_new_status: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
          p_reason: string;
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          record_id: string;
          previous_status: string;
          new_status: string;
        };
      };
      correct_staff_attendance_record: {
        Args: {
          p_institution_id: string;
          p_record_id: string;
          p_new_status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
          p_reason: string;
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          record_id: string;
          previous_status: string;
          new_status: string;
        };
      };
      check_exam_schedule_conflicts: {
        Args: {
          p_institution_id: string;
          p_exam_subject_id?: string | null;
          p_exam_date: string;
          p_start_time: string;
          p_end_time: string;
          p_room_id?: string | null;
          p_invigilator_id?: string | null;
        };
        Returns: {
          has_conflict: boolean;
          conflicts: Array<{
            conflict_type: string;
            message: string;
            exam_subject_id: string;
            subject_name: string;
            start_time: string;
            end_time: string;
          }>;
        };
      };
      record_student_marks_batch: {
        Args: {
          p_institution_id: string;
          p_exam_subject_id: string;
          p_records: Array<{
            student_id: string;
            enrollment_id?: string | null;
            marks_obtained?: number | null;
            is_absent?: boolean;
            is_exempted?: boolean;
            remarks?: string | null;
          }>;
          p_status?: 'draft' | 'submitted' | 'verified' | 'locked';
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          total_records: number;
          submitted_count: number;
          absent_count: number;
          exam_subject_id: string;
        };
      };
      correct_student_exam_mark: {
        Args: {
          p_institution_id: string;
          p_mark_id: string;
          p_new_marks: number;
          p_is_absent: boolean;
          p_reason: string;
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          mark_id: string;
          previous_marks: number | null;
          new_marks: number;
          correction_id: string;
        };
      };
      publish_examination_results: {
        Args: {
          p_institution_id: string;
          p_examination_id: string;
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          examination_id: string;
          total_results: number;
          pass_count: number;
          fail_count: number;
          distinction_count: number;
          withheld_count: number;
        };
      };
      dispatch_notification_atomic: {
        Args: {
          p_institution_id: string;
          p_recipient_user_id: string;
          p_category: string;
          p_title: string;
          p_body: string;
          p_priority?: string;
          p_channels?: string[];
          p_data?: Record<string, unknown>;
          p_idempotency_key?: string | null;
          p_sender_user_id?: string | null;
        };
        Returns: {
          notification_id: string;
          deliveries_queued: number;
          idempotent_replay: boolean;
        };
      };
      submit_homework_atomic: {
        Args: {
          p_assignment_id: string;
          p_student_id: string;
          p_submission_text?: string | null;
          p_attachments?: Array<{ name: string; url: string; size?: number }>;
        };
        Returns: {
          submission_id: string;
          status: string;
          is_late: boolean;
        };
      };
      submit_parent_child_leave_atomic: {
        Args: {
          p_institution_id: string;
          p_student_id: string;
          p_start_date: string;
          p_end_date: string;
          p_reason: string;
          p_user_id: string;
        };
        Returns: {
          leave_request_id: string;
          student_id: string;
          status: string;
        };
      };
      assign_student_transport_atomic: {
        Args: {
          p_institution_id: string;
          p_student_id: string;
          p_academic_year_id: string;
          p_route_id: string;
          p_pickup_stop_id: string;
          p_dropoff_stop_id: string;
          p_fee_structure_id?: string | null;
          p_notes?: string | null;
        };
        Returns: {
          success: boolean;
          assignment_id: string;
          route_name: string;
        };
      };
      update_journey_status_atomic: {
        Args: {
          p_institution_id: string;
          p_journey_id: string;
          p_new_status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled' | 'emergency';
          p_delay_minutes?: number;
          p_delay_reason?: string | null;
          p_emergency_reason?: string | null;
          p_cancellation_reason?: string | null;
          p_updated_by?: string | null;
        };
        Returns: {
          success: boolean;
          journey_id: string;
          status: string;
        };
      };
      record_vehicle_gps_location_atomic: {
        Args: {
          p_institution_id: string;
          p_vehicle_id: string;
          p_journey_id?: string | null;
          p_latitude: number;
          p_longitude: number;
          p_speed_kmh?: number;
          p_heading?: number;
          p_accuracy_meters?: number;
          p_battery_level?: number | null;
          p_provider?: string;
          p_recorded_at?: string;
        };
        Returns: {
          success: boolean;
          vehicle_id?: string;
          recorded_at?: string;
          reason?: string;
        };
      };
      record_student_boarding_atomic: {
        Args: {
          p_institution_id: string;
          p_journey_id: string;
          p_student_id: string;
          p_stop_id: string;
          p_event_type: 'pickup' | 'dropoff';
          p_verification_method?: 'driver_manual' | 'attendant_manual' | 'qr_scan' | 'nfc' | 'rfid' | 'other';
          p_verified_by?: string | null;
          p_notes?: string | null;
        };
        Returns: {
          success: boolean;
          event_id: string;
          student_name: string;
          event_type: string;
          stop_name: string;
        };
      };
      purge_expired_location_history: {
        Args: {
          p_institution_id?: string | null;
        };
        Returns: number;
      };
    };
    Enums: {
      institution_type: 'school' | 'junior_college' | 'degree_college' | 'engineering_college' | 'university';
      institution_status: 'active' | 'pending_verification' | 'suspended' | 'archived';
      membership_role: 'owner' | 'admin' | 'hr_administrator' | 'academic_admin' | 'department_head' | 'admissions_officer' | 'faculty' | 'staff' | 'accountant' | 'student' | 'parent';
      membership_status: 'active' | 'invited' | 'suspended' | 'revoked';
      term_system: 'semester' | 'trimester' | 'annual';
      academic_record_status: 'active' | 'inactive' | 'archived';
      academic_level_type: 'primary' | 'middle_school' | 'secondary' | 'higher_secondary' | 'diploma' | 'undergraduate' | 'postgraduate' | 'doctoral';
      subject_category_type: 'theory' | 'practical' | 'lab' | 'elective' | 'vocational' | 'project';
      student_status: 'active' | 'inactive' | 'suspended' | 'alumni' | 'withdrawn' | 'transferred';
      student_gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
      enrollment_status: 'enrolled' | 'promoted' | 'retained' | 'transferred' | 'graduated' | 'dropped';
      document_type: 'photo' | 'birth_certificate' | 'previous_record' | 'transfer_certificate' | 'national_id' | 'medical_record' | 'other';
      document_verification_status: 'pending' | 'verified' | 'rejected';
      admission_status: 'submitted' | 'received' | 'documents_pending' | 'under_verification' | 'approved' | 'rejected' | 'waitlisted' | 'confirmed' | 'enrolled';
      staff_category: 'teaching' | 'non_teaching' | 'administrative' | 'technical' | 'transport' | 'support';
      employment_type: 'full_time' | 'part_time' | 'contract' | 'adjunct' | 'visiting';
      employment_status: 'active' | 'probation' | 'notice_period' | 'suspended' | 'terminated' | 'resigned' | 'retired';
      staff_document_type: 'qualification' | 'experience' | 'identity' | 'contract' | 'appointment_letter' | 'other';
      invitation_status: 'pending' | 'accepted' | 'expired' | 'revoked';
      attendance_status: 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
      attendance_session_type: 'daily' | 'lecture' | 'lab' | 'practical' | 'tutorial';
      attendance_session_status: 'draft' | 'submitted' | 'locked';
      staff_attendance_status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'excused';
      leave_applicant_type: 'student' | 'staff';
      leave_type: 'casual' | 'sick' | 'medical' | 'academic' | 'bereavement' | 'maternity' | 'emergency' | 'other';
      leave_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
      notification_delivery_status: 'pending' | 'queued' | 'delivered' | 'failed';
      room_type: 'classroom' | 'laboratory' | 'seminar_hall' | 'auditorium' | 'computer_lab' | 'library' | 'workshop' | 'other';
      timetable_session_type: 'theory' | 'practical' | 'laboratory' | 'tutorial' | 'seminar';
      day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
      timetable_break_type: 'none' | 'short_break' | 'lunch' | 'assembly' | 'recess';
      session_slot: 'morning' | 'afternoon' | 'evening';
      substitution_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
      schedule_change_type: 'substitution' | 'rescheduled' | 'cancelled' | 'room_change' | 'general';
      schedule_notification_recipient: 'student' | 'faculty' | 'guardian' | 'class' | 'institution';
      exam_type: 'internal_assessment' | 'unit_test' | 'midterm' | 'semester_exam' | 'annual_exam' | 'practical_exam' | 'laboratory_exam' | 'assignment' | 'project' | 'viva' | 'final_exam';
      exam_status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'published' | 'cancelled';
      exam_publication_status: 'unpublished' | 'under_review' | 'published' | 'withdrawn';
      assessment_type: 'theory' | 'practical' | 'laboratory' | 'internal_assessment' | 'external_assessment' | 'viva' | 'project';
      exam_subject_status: 'scheduled' | 'completed' | 'cancelled';
      grading_calculation_type: 'gpa_10_point' | 'gpa_4_point' | 'letter_grade_percentage' | 'marks_based' | 'pass_fail';
      marks_entry_status: 'draft' | 'submitted' | 'verified' | 'locked';
      exam_result_status: 'pass' | 'fail' | 'distinction' | 'promoted_with_backlog' | 'withheld';
      revaluation_status: 'applied' | 'assigned' | 'under_review' | 'completed' | 'rejected';
      notification_category: 'attendance' | 'examinations' | 'results' | 'fees_payments' | 'admissions' | 'homework' | 'timetable' | 'leave' | 'transport' | 'announcements' | 'emergency' | 'general';
      notification_channel: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
      notification_priority: 'low' | 'normal' | 'high' | 'urgent';
      announcement_scope: 'institution' | 'campus' | 'department' | 'program' | 'class' | 'section' | 'role' | 'individual';
      announcement_priority: 'low' | 'standard' | 'important' | 'urgent';
      announcement_status: 'draft' | 'scheduled' | 'published' | 'archived';
      assignment_submission_status: 'pending' | 'submitted' | 'late' | 'graded' | 'resubmit_requested';
      conversation_type: 'parent_teacher' | 'student_faculty' | 'admin_broadcast' | 'staff_internal';
      transport_vehicle_status: 'active' | 'inactive' | 'under_maintenance' | 'retired';
      vehicle_document_type: 'insurance' | 'permit' | 'fitness_certificate' | 'pollution_certificate' | 'road_tax' | 'other';
      vehicle_document_status: 'valid' | 'expiring_soon' | 'expired';
      transport_maintenance_type: 'routine_service' | 'repair' | 'inspection' | 'emergency_breakdown' | 'tire_replacement' | 'other';
      transport_maintenance_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
      transport_staff_role: 'driver' | 'attendant' | 'both';
      transport_route_type: 'morning_pickup' | 'evening_dropoff' | 'both' | 'shuttle';
      transport_route_shift: 'morning' | 'afternoon' | 'evening' | 'general';
      student_transport_status: 'active' | 'suspended' | 'withdrawn' | 'pending_approval';
      transport_journey_status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled' | 'emergency';
      transport_journey_type: 'pickup' | 'dropoff' | 'shuttle';
      journey_stop_status: 'pending' | 'arrived' | 'departed' | 'skipped';
      boarding_event_type: 'pickup' | 'dropoff';
      boarding_verification_method: 'driver_manual' | 'attendant_manual' | 'qr_scan' | 'nfc' | 'rfid' | 'other';
      transport_change_request_type: 'new_enrollment' | 'route_change' | 'stop_change' | 'temporary_suspension' | 'withdrawal';
      transport_change_request_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    };
    CompositeTypes: Record<string, never>;
  };
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type InstitutionRow = Database['public']['Tables']['institutions']['Row'];
export type MembershipRow = Database['public']['Tables']['institution_memberships']['Row'];
export type CampusRow = Database['public']['Tables']['campuses']['Row'];
export type AcademicYearRow = Database['public']['Tables']['academic_years']['Row'];
export type AcademicTermRow = Database['public']['Tables']['academic_terms']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];

export type AcademicDepartmentRow = Database['public']['Tables']['academic_departments']['Row'];
export type AcademicProgramRow = Database['public']['Tables']['academic_programs']['Row'];
export type AcademicClassRow = Database['public']['Tables']['academic_classes']['Row'];
export type AcademicSectionRow = Database['public']['Tables']['academic_sections']['Row'];
export type AcademicSubjectRow = Database['public']['Tables']['academic_subjects']['Row'];
export type AcademicClassSubjectRow = Database['public']['Tables']['academic_class_subjects']['Row'];

export type StudentRow = Database['public']['Tables']['students']['Row'];
export type GuardianRow = Database['public']['Tables']['guardians']['Row'];
export type StudentGuardianRow = Database['public']['Tables']['student_guardians']['Row'];
export type StudentEnrollmentRow = Database['public']['Tables']['student_enrollments']['Row'];
export type AdmissionApplicationRow = Database['public']['Tables']['admission_applications']['Row'];
export type AdmissionStatusHistoryRow = Database['public']['Tables']['admission_status_history']['Row'];
export type StudentDocumentRow = Database['public']['Tables']['student_documents']['Row'];

export type StaffProfileRow = Database['public']['Tables']['staff_profiles']['Row'];
export type StaffEmploymentRow = Database['public']['Tables']['staff_employments']['Row'];
export type FacultyAllocationRow = Database['public']['Tables']['faculty_allocations']['Row'];
export type StaffDocumentRow = Database['public']['Tables']['staff_documents']['Row'];
export type StaffInvitationRow = Database['public']['Tables']['staff_invitations']['Row'];

export type LeaveRequestRow = Database['public']['Tables']['leave_requests']['Row'];
export type AttendanceSessionRow = Database['public']['Tables']['attendance_sessions']['Row'];
export type StudentAttendanceRecordRow = Database['public']['Tables']['student_attendance_records']['Row'];
export type AttendanceCorrectionRow = Database['public']['Tables']['attendance_corrections']['Row'];
export type StaffAttendanceRecordRow = Database['public']['Tables']['staff_attendance_records']['Row'];
export type StaffAttendanceCorrectionRow = Database['public']['Tables']['staff_attendance_corrections']['Row'];
export type AttendanceNotificationRow = Database['public']['Tables']['attendance_notifications']['Row'];

export type RoomRow = {
  id: string;
  institution_id: string;
  campus_id: string | null;
  room_number: string;
  name: string | null;
  building: string;
  floor: string | null;
  room_type: 'classroom' | 'laboratory' | 'seminar_hall' | 'auditorium' | 'computer_lab' | 'library' | 'workshop' | 'other';
  capacity: number;
  facilities: string[];
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type TimetableStructureRow = {
  id: string;
  institution_id: string;
  academic_year_id: string;
  campus_id: string | null;
  program_id: string | null;
  name: string;
  description: string | null;
  working_days: string[];
  start_time: string;
  end_time: string;
  periods_per_day: number;
  is_default: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type TimetablePeriodRow = {
  id: string;
  institution_id: string;
  structure_id: string;
  period_number: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  break_type: 'none' | 'short_break' | 'lunch' | 'assembly' | 'recess';
  session_slot: 'morning' | 'afternoon' | 'evening';
  created_at: string;
  updated_at: string;
};

export type TimetableEntryRow = {
  id: string;
  institution_id: string;
  academic_year_id: string;
  campus_id: string | null;
  structure_id: string | null;
  class_id: string;
  section_id: string | null;
  subject_id: string;
  faculty_id: string;
  room_id: string | null;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
  period_number: number;
  session_type: 'theory' | 'practical' | 'laboratory' | 'tutorial' | 'seminar';
  effective_start_date: string;
  effective_end_date: string | null;
  is_active: boolean;
  color_code: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type TimetableSubstitutionRow = {
  id: string;
  institution_id: string;
  timetable_entry_id: string;
  substitution_date: string;
  original_faculty_id: string;
  substitute_faculty_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type ScheduleNotificationRow = {
  id: string;
  institution_id: string;
  recipient_type: 'student' | 'faculty' | 'guardian' | 'class' | 'institution';
  recipient_id: string | null;
  timetable_entry_id: string | null;
  substitution_id: string | null;
  title: string;
  message: string;
  change_type: 'substitution' | 'rescheduled' | 'cancelled' | 'room_change' | 'general';
  effective_date: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
};

export type GradingScaleRow = {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  calculation_type: 'gpa_10_point' | 'gpa_4_point' | 'letter_grade_percentage' | 'marks_based' | 'pass_fail';
  is_credit_based: boolean;
  version: number;
  is_default: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type GradingScaleRuleRow = {
  id: string;
  grading_scale_id: string;
  grade: string;
  grade_point: number;
  min_percentage: number;
  max_percentage: number;
  description: string | null;
  is_passing: boolean;
  created_at: string;
};

export type ExaminationRow = {
  id: string;
  institution_id: string;
  campus_id: string | null;
  academic_year_id: string;
  term_id: string | null;
  program_id: string | null;
  class_id: string | null;
  name: string;
  exam_type: 'internal_assessment' | 'unit_test' | 'midterm' | 'semester_exam' | 'annual_exam' | 'practical_exam' | 'laboratory_exam' | 'assignment' | 'project' | 'viva' | 'final_exam';
  start_date: string;
  end_date: string;
  max_marks: number;
  passing_marks: number;
  weightage_percentage: number;
  grading_scale_id: string | null;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'published' | 'cancelled';
  publication_status: 'unpublished' | 'under_review' | 'published' | 'withdrawn';
  published_at: string | null;
  published_by: string | null;
  instructions: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type ExamSubjectRow = {
  id: string;
  institution_id: string;
  examination_id: string;
  subject_id: string;
  assessment_type: 'theory' | 'practical' | 'laboratory' | 'internal_assessment' | 'external_assessment' | 'viva' | 'project';
  max_marks: number;
  passing_marks: number;
  credits: number;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  room_id: string | null;
  invigilator_staff_id: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type StudentExamMarkRow = {
  id: string;
  institution_id: string;
  examination_id: string;
  exam_subject_id: string;
  student_id: string;
  enrollment_id: string | null;
  marks_obtained: number | null;
  is_absent: boolean;
  is_exempted: boolean;
  grade: string | null;
  grade_point: number | null;
  status: 'draft' | 'submitted' | 'verified' | 'locked';
  remarks: string | null;
  entered_by_staff_id: string | null;
  submitted_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MarksEntryCorrectionRow = {
  id: string;
  institution_id: string;
  student_exam_mark_id: string;
  previous_marks: number | null;
  new_marks: number;
  previous_status: 'draft' | 'submitted' | 'verified' | 'locked';
  new_status: 'draft' | 'submitted' | 'verified' | 'locked';
  reason: string;
  corrected_by: string;
  corrected_at: string;
};

export type StudentExamResultRow = {
  id: string;
  institution_id: string;
  examination_id: string;
  student_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string | null;
  grading_scale_id: string | null;
  grading_scale_version: number;
  total_max_marks: number;
  total_obtained_marks: number;
  percentage: number;
  gpa: number | null;
  cgpa: number | null;
  final_grade: string | null;
  result_status: 'pass' | 'fail' | 'distinction' | 'promoted_with_backlog' | 'withheld';
  backlog_count: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HallTicketRow = {
  id: string;
  institution_id: string;
  examination_id: string;
  student_id: string;
  ticket_number: string;
  is_eligible: boolean;
  ineligibility_reason: string | null;
  qr_code_hash: string;
  generated_at: string;
  generated_by: string | null;
};

export type ExamRevaluationRow = {
  id: string;
  institution_id: string;
  student_exam_mark_id: string;
  student_id: string;
  examination_id: string;
  subject_id: string;
  original_marks: number;
  revised_marks: number | null;
  status: 'applied' | 'assigned' | 'under_review' | 'completed' | 'rejected';
  reason: string;
  reviewer_staff_id: string | null;
  review_notes: string | null;
  applied_at: string;
  completed_at: string | null;
  reviewed_by: string | null;
};

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationDeliveryRow = Database['public']['Tables']['notification_deliveries']['Row'];
export type NotificationPreferenceRow = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationTemplateRow = Database['public']['Tables']['notification_templates']['Row'];
export type PushDeviceTokenRow = Database['public']['Tables']['push_device_tokens']['Row'];
export type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];
export type AnnouncementAcknowledgementRow = Database['public']['Tables']['announcement_acknowledgements']['Row'];
export type HomeworkAssignmentRow = Database['public']['Tables']['homework_assignments']['Row'];
export type HomeworkSubmissionRow = Database['public']['Tables']['homework_submissions']['Row'];
export type CommunicationThreadRow = Database['public']['Tables']['communication_threads']['Row'];
export type CommunicationParticipantRow = Database['public']['Tables']['communication_participants']['Row'];
export type CommunicationMessageRow = Database['public']['Tables']['communication_messages']['Row'];

export type TransportVehicleRow = Database['public']['Tables']['transport_vehicles']['Row'];
export type VehicleDocumentRow = Database['public']['Tables']['vehicle_documents']['Row'];
export type VehicleMaintenanceRecordRow = Database['public']['Tables']['vehicle_maintenance_records']['Row'];
export type TransportStaffProfileRow = Database['public']['Tables']['transport_staff_profiles']['Row'];
export type TransportStopRow = Database['public']['Tables']['transport_stops']['Row'];
export type TransportRouteRow = Database['public']['Tables']['transport_routes']['Row'];
export type RouteStopRow = Database['public']['Tables']['route_stops']['Row'];
export type StudentTransportAssignmentRow = Database['public']['Tables']['student_transport_assignments']['Row'];
export type TransportJourneyRow = Database['public']['Tables']['transport_journeys']['Row'];
export type JourneyStopEventRow = Database['public']['Tables']['journey_stop_events']['Row'];
export type VehicleLiveLocationRow = Database['public']['Tables']['vehicle_live_locations']['Row'];
export type VehicleLocationHistoryRow = Database['public']['Tables']['vehicle_location_history']['Row'];
export type StudentBoardingEventRow = Database['public']['Tables']['student_boarding_events']['Row'];
export type TransportChangeRequestRow = Database['public']['Tables']['transport_change_requests']['Row'];
export type TransportSettingsRow = Database['public']['Tables']['transport_settings']['Row'];




