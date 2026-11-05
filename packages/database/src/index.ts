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
    };
    Enums: {
      institution_type: 'school' | 'junior_college' | 'degree_college' | 'engineering_college' | 'university';
      institution_status: 'active' | 'pending_verification' | 'suspended' | 'archived';
      membership_role: 'owner' | 'admin' | 'academic_admin' | 'admissions_officer' | 'faculty' | 'staff' | 'accountant' | 'student' | 'parent';
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
