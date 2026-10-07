import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radii, ImageAssets, FontFamilies, getAvatarSource } from '../theme/tokens';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import ActionTile from '../components/ActionTile';
import DocumentCard from '../components/DocumentCard';
import ShineEffect from '../components/ShineEffect';
import ZoomCard from '../components/ZoomCard';
import { useAuth } from '../context/AuthContext';
import { listStudentDocuments, toDocumentCardProps } from '../services/documentService';

export default function HomeScreen({ onNavigate }) {
  const { currentStudent } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activityCleared, setActivityCleared] = useState(false);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    let isMounted = true;
    listStudentDocuments(currentStudent?.roll_no).then((result) => {
      if (isMounted) setDocuments(result.documents || []);
    });
    return () => {
      isMounted = false;
    };
  }, [currentStudent?.roll_no]);

  const fullName = currentStudent?.name?.trim() || 'Scholar';
  const initials = currentStudent?.name
    ? currentStudent.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'RIMT';
  const scholarDegree = currentStudent
    ? `${currentStudent.course || '---'} · ${currentStudent.batch ? `Batch ${currentStudent.batch}` : '---'} · ${currentStudent.roll_no || '---'}`
    : '--- · Batch --- · ---';

  const initialActivities = [
    {
      id: '1',
      title: 'Verified Transcript Export',
      time: '2 days ago',
      detail: 'IP 192.168.1.42',
      icon: 'verified',
      iconColor: Colors.verifiedGreen,
      iconBg: 'rgba(46, 125, 79, 0.1)',
      statusIcon: 'check',
    },
    {
      id: '2',
      title: 'Project Repository Synced',
      time: '1 week ago',
      detail: 'Commit #a7b931e',
      icon: 'sync',
      iconColor: Colors.secondary,
      iconBg: 'rgba(62, 97, 134, 0.1)',
      statusIcon: 'history',
    },
    {
      id: '3',
      title: 'Registration Approved',
      time: '2 weeks ago',
      detail: 'Registrar Office',
      icon: 'how-to-reg',
      iconColor: Colors.primary,
      iconBg: 'rgba(163, 19, 33, 0.1)',
      statusIcon: 'done-all',
    },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="Overview"
        eyebrow="RIMT ACADEMIC TRUST"
        avatarUrl={currentStudent?.avatar_url || ImageAssets.defaultAvatar}
        onNotificationPress={() => Alert.alert('Notifications', 'You have 1 new announcement from the Registrar.')}
        onProfilePress={() => onNavigate?.('profile')}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Student Greeting Luxury Header with Sweep & Zoom Effect */}
        <View style={styles.greetingOuterWrapper}>
          <ZoomCard
            onPress={() => onNavigate?.('profile')}
            scaleTo={1.03}
          >
            <LinearGradient
              colors={['#101218', '#1a1614', '#201a12']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.greetingCard}
            >
              {/* Ambient Gold Glows */}
              <View style={styles.goldAura} />

              {/* Shiny Shimmer Animation Sweep */}
              <ShineEffect
                colors={[
                  'transparent',
                  'rgba(255, 255, 255, 0.01)',
                  'rgba(253, 230, 138, 0.12)',
                  'rgba(255, 255, 255, 0.20)',
                  'rgba(253, 230, 138, 0.12)',
                  'rgba(255, 255, 255, 0.01)',
                  'transparent',
                ]}
                duration={2400}
                delay={3200}
                angle="-22deg"
                width={170}
              />

              <View style={styles.greetingContentRow}>
                {/* Student Avatar with Initials Badge */}
                <View style={styles.avatarContainer}>
                  <Image
                    source={getAvatarSource(currentStudent?.avatar_url)}
                    style={styles.studentAvatar}
                  />
                  <View style={styles.hkBadge}>
                    <Text style={styles.hkBadgeText}>{initials}</Text>
                  </View>
                </View>

                {/* Student Info */}
                <View style={styles.greetingTextColumn}>
                  <View style={styles.nameRow}>
                    <Text style={styles.greetingName} numberOfLines={1}>Good morning</Text>
                    <Text style={styles.sparkleText}>✨</Text>
                  </View>
                  <Text
                    style={styles.greetingFullName}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {fullName}
                  </Text>
                  <Text style={styles.greetingDegree} numberOfLines={2}>
                    {scholarDegree}
                  </Text>
                </View>

                {/* Verified Shield Icon Badge */}
                <View style={styles.shieldBadge}>
                  <MaterialIcons name="verified-user" size={20} color="#6ee7b7" />
                </View>
              </View>
            </LinearGradient>
          </ZoomCard>
        </View>

        {/* Search & Quick Filter Field — zoom on hover/press (Mega Update §4.2) */}
        <ZoomCard
          scaleTo={1.05}
          containerStyle={styles.searchZoomWrapper}
        >
          <View style={styles.searchContainer}>
            <MaterialIcons
              name="search"
              size={20}
              color={Colors.textSecondary}
              style={styles.searchLeadingIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search documents and projects"
              placeholderTextColor={Colors.neutralGray}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => Alert.alert('Filters', 'Document and Project filter options opened.')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="tune" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </ZoomCard>

        {/* Academic Overview Section (2x2 Metric Grid) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Academic Overview</Text>
            <View style={styles.sessionPill}>
              <Text style={styles.sessionPillText}>Session 2025–26</Text>
            </View>
          </View>

          <View style={styles.grid2x2}>
            <View style={styles.gridRow}>
              <MetricCard
                icon="military-tech"
                iconColor={Colors.primary}
                iconBgColor="rgba(163, 19, 33, 0.1)"
                badgeText="Valid"
                badgeIcon="check-circle"
                badgeBgColor="rgba(46, 125, 79, 0.1)"
                badgeTextColor={Colors.verifiedGreen}
                value="3"
                label="Verified Degrees"
                cardBg="rgba(255, 241, 242, 0.5)"
                borderColor="rgba(226, 190, 188, 0.7)"
              />
              <View style={{ width: Spacing.spaceSm }} />
              <MetricCard
                icon="history-edu"
                iconColor={Colors.secondary}
                iconBgColor="rgba(62, 97, 134, 0.1)"
                badgeText="CR-3"
                badgeIcon={null}
                badgeBgColor={Colors.surfaceContainerHigh}
                badgeTextColor={Colors.secondary}
                value="7"
                label="Courses"
                cardBg="rgba(239, 246, 255, 0.5)"
                borderColor="rgba(209, 228, 255, 0.8)"
              />
            </View>

            <View style={[styles.gridRow, { marginTop: Spacing.spaceSm }]}>
              <MetricCard
                icon="alt-route"
                iconColor={Colors.textPrimary}
                iconBgColor="rgba(88, 107, 134, 0.12)"
                badgeText="Git Synced"
                badgeIcon={null}
                badgeBgColor="rgba(62, 97, 134, 0.12)"
                badgeTextColor={Colors.secondary}
                value="12"
                label="Saved Repositories"
                cardBg="rgba(243, 244, 255, 0.5)"
                borderColor="rgba(218, 227, 244, 0.8)"
              />
              <View style={{ width: Spacing.spaceSm }} />
              <MetricCard
                icon="verified"
                iconColor={Colors.verifiedGreen}
                iconBgColor="rgba(46, 125, 79, 0.1)"
                badgeText="85%"
                badgeIcon="check-circle"
                badgeBgColor="rgba(46, 125, 79, 0.1)"
                badgeTextColor={Colors.verifiedGreen}
                value="85%"
                label="Profile Completed"
                cardBg="rgba(240, 253, 244, 0.5)"
                borderColor="rgba(187, 247, 208, 0.8)"
              />
            </View>
          </View>
        </View>

        {/* Quick Actions Hub (2x3 Grid) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.servicesHubLink}
              onPress={() => Alert.alert('Services Hub', 'Academic and student services registry')}
            >
              <Text style={styles.servicesHubText}>Services Hub</Text>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionGrid}>
            <View style={styles.actionRow}>
              <ActionTile
                icon="school"
                iconColor={Colors.primary}
                iconBgColor="rgba(163, 19, 33, 0.08)"
                title="My Degrees"
                onPress={() => onNavigate?.('credentials')}
              />
              <View style={{ width: Spacing.spaceSm }} />
              <ActionTile
                icon="card-membership"
                iconColor={Colors.secondary}
                iconBgColor="rgba(62, 97, 134, 0.08)"
                title="Certificates"
                onPress={() => onNavigate?.('credentials')}
              />
            </View>

            <View style={[styles.actionRow, { marginTop: Spacing.spaceSm }]}>
              <ActionTile
                icon="terminal"
                iconColor={Colors.secondary}
                iconBgColor="rgba(88, 107, 134, 0.08)"
                title="My Projects"
                onPress={() => onNavigate?.('projects')}
              />
              <View style={{ width: Spacing.spaceSm }} />
              <ActionTile
                icon="post-add"
                iconColor={Colors.primary}
                iconBgColor="rgba(163, 19, 33, 0.08)"
                title="Add Project"
                onPress={() => onNavigate?.('projects')}
              />
            </View>

            <View style={[styles.actionRow, { marginTop: Spacing.spaceSm }]}>
              <ActionTile
                icon="account-box"
                iconColor={Colors.secondary}
                iconBgColor="rgba(62, 97, 134, 0.08)"
                title="My Profile"
                onPress={() => onNavigate?.('profile')}
              />
              <View style={{ width: Spacing.spaceSm }} />
              <ActionTile
                icon="workspace-premium"
                iconColor={Colors.secondary}
                iconBgColor="rgba(62, 97, 134, 0.08)"
                title="Certificates"
                onPress={() => onNavigate?.('credentials')}
              />
            </View>

            <View style={[styles.actionRow, { marginTop: Spacing.spaceSm }]}>
              <ActionTile
                icon="description"
                iconColor={Colors.tertiary}
                iconBgColor="rgba(88, 107, 134, 0.1)"
                title="Resume"
                subtitle="PDF ready"
                onPress={() => Alert.alert('Resume', 'Your verified institutional resume is ready to download.')}
              />
              <View style={{ width: Spacing.spaceSm }} />
              <ActionTile
                icon="work-history"
                iconColor={Colors.secondary}
                iconBgColor="rgba(62, 97, 134, 0.1)"
                title="Internships"
                subtitle="2 verified"
                onPress={() => Alert.alert('Internships', '2 institutional internships verified by department.')}
              />
            </View>

            <View style={[styles.actionRow, { marginTop: Spacing.spaceSm }]}>
              <ActionTile
                icon="stars"
                iconColor={Colors.verifiedGreen}
                iconBgColor="rgba(46, 125, 79, 0.1)"
                title="Placement"
                subtitle="Session '25–26"
                onPress={() => onNavigate?.('placement')}
              />
              <View style={{ width: Spacing.spaceSm }} />
              <ActionTile
                icon="lock-outline"
                iconColor={Colors.primary}
                iconBgColor="rgba(163, 19, 33, 0.08)"
                title="Lock Gateway"
                subtitle="Sign Out"
                onPress={() => {
                  Alert.alert(
                    'Lock Session',
                    'Would you like to lock your session or view the onboarding tour?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Onboarding Tour', onPress: () => onNavigate?.('onboarding') },
                      { text: 'Sign Out', style: 'destructive', onPress: () => onNavigate?.('signin') },
                    ]
                  );
                }}
              />
            </View>
          </View>
        </View>

        {/* Recent Documents Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleWithPing}>
              <Text style={styles.sectionTitle}>Recent Documents</Text>
              <View style={styles.pingDot} />
            </View>
            <TouchableOpacity
              style={styles.servicesHubLink}
              onPress={() => onNavigate?.('credentials')}
            >
              <Text style={styles.servicesHubText}>Services Hub</Text>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {documents.slice(0, 4).map((document) => (
            <DocumentCard
              key={document.id || document.cloudinary_public_id}
              {...toDocumentCardProps(document)}
              onDownloadPress={() => onNavigate?.('credentials')}
              onPress={() => onNavigate?.('credentials')}
            />
          ))}
          {documents.length === 0 && (
            <Text style={styles.emptyDocumentsText}>
              No documents uploaded yet. Upload your first document from Certificates.
            </Text>
          )}
        </View>

        {/* Convocation Promo Banner */}
        <ZoomCard
          style={styles.promoBanner}
          onPress={() => Alert.alert('Convocation 2025', 'Registration for Degree Concurrence Ceremony is confirmed.')}
          scaleTo={1.035}
        >
          <LinearGradient
            colors={['rgba(235, 239, 245, 0.95)', 'rgba(220, 226, 235, 0.85)', 'rgba(208, 216, 228, 0.9)']}
            style={styles.promoGradient}
          >
            <View style={styles.promoContent}>
              <View style={styles.promoTagRow}>
                <View style={styles.promoPill}>
                  <Text style={styles.promoPillText}>{"Convocation '25"}</Text>
                </View>
                <Text style={styles.promoDateText}>April 18, 2026</Text>
              </View>
              <Text style={styles.promoHeading}>Degree Concurrence Ceremony</Text>
              <Text style={styles.promoSubtext}>Auditorium Hall A · Reserve your graduate regalia seat</Text>
            </View>

            <View style={styles.promoArrowCircle}>
              <MaterialIcons name="arrow-forward" size={20} color={Colors.primary} />
            </View>
          </LinearGradient>
        </ZoomCard>

        {/* Recent Activity Audit Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {!activityCleared && (
              <TouchableOpacity onPress={() => setActivityCleared(true)}>
                <Text style={styles.clearLogsText}>Clear logs</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.activityCard}>
            {activityCleared ? (
              <View style={styles.activityEmptyState}>
                <MaterialIcons name="history-toggle-off" size={32} color={Colors.neutralGray} />
                <Text style={styles.activityEmptyTitle}>Audit history is up to date.</Text>
                <Text style={styles.activityEmptySubtitle}>
                  All operational records securely archived.
                </Text>
              </View>
            ) : (
              initialActivities.map((act, index) => (
                <ZoomCard
                  key={act.id}
                  style={[styles.activityRow, index < initialActivities.length - 1 && styles.activityRowDivider]}
                  scaleTo={1.025}
                >
                  <View style={[styles.activityIconBox, { backgroundColor: act.iconBg }]}>
                    <MaterialIcons name={act.icon} size={18} color={act.iconColor} />
                  </View>
                  <View style={styles.activityTextCol}>
                    <Text style={styles.activityTitleText} numberOfLines={1}>{act.title}</Text>
                    <View style={styles.activityMetaRow}>
                      <Text style={styles.activityMetaTime}>{act.time}</Text>
                      <Text style={styles.activityMetaDot}>•</Text>
                      <Text style={styles.activityMetaDetail}>{act.detail}</Text>
                    </View>
                  </View>
                  <MaterialIcons name={act.statusIcon} size={18} color={Colors.textSecondary} />
                </ZoomCard>
              ))
            )}
          </View>
        </View>

        {/* Space for bottom floating bar */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  greetingOuterWrapper: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.spaceMd,
  },
  greetingCard: {
      emptyDocumentsText: {
        ...Typography.bodyMd,
        color: Colors.textSecondary,
        marginTop: Spacing.spaceSm,
      },
    minHeight: 88,
    borderRadius: Radii.xl,
    padding: Spacing.spaceMd,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  goldAura: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  greetingContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.spaceSm,
  },
  avatarContainer: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.goldAccent,
  },
  studentAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  hkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16181d',
    borderWidth: 1.5,
    borderColor: Colors.goldAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hkBadgeText: {
    color: '#ffd700',
    fontSize: 9.5,
    fontWeight: '800',
  },
  greetingTextColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greetingName: {
    ...Typography.headlineSm,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  greetingFullName: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: '#ffffff',
    flexShrink: 1,
    marginTop: 1,
  },
  sparkleText: {
    fontSize: 14,
  },
  greetingDegree: {
    ...Typography.bodyMd,
    color: 'rgb(230, 207, 156)',
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
  },
  shieldBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchZoomWrapper: {
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.spaceMd,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: Radii.lg,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#12263D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchLeadingIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...Typography.bodyMd,
    color: Colors.textPrimary,
  },
  filterButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: Spacing.spaceLg,
    paddingHorizontal: Spacing.margin,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.spaceSm,
  },
  sectionTitle: {
    ...Typography.headlineSm,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  titleWithPing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
  sessionPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.85)',
  },
  sessionPillText: {
    ...Typography.eyebrow,
    fontSize: 10,
    color: 'rgb(71, 85, 105)',
  },
  servicesHubLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 241, 242, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(226, 190, 188, 0.7)',
  },
  servicesHubText: {
    ...Typography.labelSm,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  grid2x2: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
  },
  actionGrid: {
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
  },
  promoBanner: {
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.spaceLg,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#12263D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  promoGradient: {
    padding: Spacing.spaceMd,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoContent: {
    flex: 1,
    marginRight: Spacing.spaceSm,
  },
  promoTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  promoPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  promoPillText: {
    ...Typography.labelSm,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  promoDateText: {
    ...Typography.labelSm,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  promoHeading: {
    ...Typography.headlineSm,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  promoSubtext: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  promoArrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  clearLogsText: {
    ...Typography.labelSm,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radii.lg,
    padding: Spacing.spaceMd,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.spaceSm,
    paddingVertical: 6,
  },
  activityRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.canvasAlt,
    paddingBottom: 10,
    marginBottom: 4,
  },
  activityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextCol: {
    flex: 1,
  },
  activityTitleText: {
    ...Typography.labelMd,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  activityMetaTime: {
    ...Typography.codeXs,
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  activityMetaDot: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  activityMetaDetail: {
    ...Typography.codeXs,
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  activityEmptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.spaceLg,
  },
  activityEmptyTitle: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    marginTop: 6,
  },
  activityEmptySubtitle: {
    ...Typography.codeXs,
    color: Colors.neutralGray,
    marginTop: 2,
  },
});
