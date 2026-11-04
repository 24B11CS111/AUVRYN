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

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ userId, userEmail }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberships, setMemberships] = useState<InstitutionMembership[]>([]);
  const [campuses, setCampuses] = useState<CampusRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);

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
      if (activeInstId) {
        const [{ data: camps }, { data: ays }] = await Promise.all([
          supabase
            .from('campuses')
            .select('*')
            .eq('institution_id', activeInstId),
          supabase
            .from('academic_years')
            .select('*')
            .eq('institution_id', activeInstId),
        ]);

        setCampuses(camps || []);
        setAcademicYears(ays || []);
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
});
