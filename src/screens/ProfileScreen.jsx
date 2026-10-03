import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radii, ImageAssets, FontFamilies } from '../theme/tokens';
import Header from '../components/Header';
import ShineEffect from '../components/ShineEffect';
import ZoomCard from '../components/ZoomCard';
import { useAuth } from '../context/AuthContext';
import EditProfileScreen from './EditProfileScreen';
import NoticeModal from '../components/NoticeModal';

export default function ProfileScreen({ onNavigate, onSignOut }) {
  const { currentStudent, signOut, refreshProfile } = useAuth();
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [pulseAnim] = useState(() => new Animated.Value(0));
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    // Refresh profile from Supabase to get admin-updated fields
    refreshProfile?.();
  }, [refreshProfile]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const arrowNudge = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 3, 0],
  });

  if (isEditing) {
    return <EditProfileScreen onBack={() => setIsEditing(false)} />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Profile"
        eyebrow="RIMT ACADEMIC TRUST"
        onNotificationPress={() => Alert.alert('Notifications', 'Profile documents reviewed.')}
        avatarUrl={currentStudent?.avatar_url || ImageAssets.profileAvatarSecondary}
        onProfilePress={() => setNotice({
          title: 'Scholar ID',
          message: 'Verified scholar record',
          actionLabel: 'Done',
          icon: 'badge',
          tone: 'neutral',
          details: [
            { label: 'Full name', value: currentStudent?.name || 'Not provided' },
            { label: 'Roll number', value: currentStudent?.roll_no || 'Not available' },
            { label: 'Course', value: currentStudent?.course || 'Not selected' },
          ],
        })}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contextual Action Strip */}
        <View style={styles.actionStrip}>
          <View style={styles.recordIndicator}>
            <View style={styles.activeRecordDot} />
            <Text style={styles.recordIndicatorText}>Active Scholar Record</Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={14} color={Colors.secondary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Scholar Identity Card with Sweep & Zoom Effect */}
        <View style={styles.identityCardWrapper}>
          <ZoomCard scaleTo={1.03}>
            <LinearGradient
              colors={['#182b42', '#101e30', '#0d1826']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.identityCard}
            >
              {currentStudent?.banner_url && (
                <Image
                  source={{ uri: currentStudent.banner_url }}
                  style={styles.identityBannerImage}
                  resizeMode="cover"
                />
              )}
              {/* Ambient Breathing Security Aura */}
              <Animated.View
                style={[
                  styles.ambientAura,
                  {
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.25, 0.65],
                    }),
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1.15],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={['rgba(56, 189, 248, 0.22)', 'rgba(99, 102, 241, 0.12)', 'transparent']}
                  start={{ x: 0.8, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>

              {/* Delicate Holographic Specular Sheen (No blinding streaks) */}
              <ShineEffect
                colors={[
                  'transparent',
                  'rgba(255, 255, 255, 0.01)',
                  'rgba(186, 215, 255, 0.08)',
                  'rgba(255, 255, 255, 0.18)',
                  'rgba(215, 235, 255, 0.24)',
                  'rgba(255, 255, 255, 0.18)',
                  'rgba(186, 215, 255, 0.08)',
                  'rgba(255, 255, 255, 0.01)',
                  'transparent',
                ]}
                duration={2400}
                delay={3200}
                angle="-22deg"
                width={170}
              />

              <View style={styles.identityHeader}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: currentStudent?.avatar_url || ImageAssets.studentAvatar }}
                    style={styles.avatarImage}
                  />
                  <View style={styles.avatarCheckBadge}>
                    <MaterialIcons name="check" size={12} color="#ffffff" />
                  </View>
                </View>

                <View style={styles.identityDetails}>
                  <Text style={styles.studentName}>{currentStudent?.name || '---'}</Text>
                  <View style={styles.enrollmentTag}>
                    <Text style={styles.enrollmentText}>
                      {currentStudent?.roll_no || '---'}
                    </Text>
                  </View>
                  <Text style={styles.programText}>
                    {currentStudent
                      ? `${currentStudent?.course || '---'} · ${currentStudent?.batch ? `Batch ${currentStudent.batch}` : '---'}`
                      : '--- · Batch ---'}
                  </Text>
                </View>
              </View>

              {/* Profile Completion Bar */}
              <TouchableOpacity
                style={styles.completionBanner}
                onPress={() => Alert.alert('Profile Completion', 'Complete document verification to achieve 100%.')}
                activeOpacity={0.8}
              >
                <View style={styles.completionLeft}>
                  <MaterialIcons name="verified-user" size={18} color={Colors.pendingAmber} />
                  <Text style={styles.completionTitle}>Profile 85% complete</Text>
                </View>
                <View style={styles.completionRight}>
                  <Text style={styles.finishText}>FINISH</Text>
                  <Animated.View style={{ transform: [{ translateX: arrowNudge }] }}>
                    <MaterialIcons name="chevron-right" size={16} color="#fef3c7" />
                  </Animated.View>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </ZoomCard>
        </View>

        {/* Academic Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Academic Summary</Text>
            <Text style={styles.sessionMetaText}>AY 2025-26</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              {/* Card 1: Semester */}
              <ZoomCard
                containerStyle={styles.summaryCardShell}
                style={[styles.summaryCard, styles.summarySemesterCard]}
                scaleTo={1.035}
              >
                  <ShineEffect
                    colors={['transparent', 'rgba(62, 97, 134, 0.02)', 'rgba(255, 255, 255, 0.48)', 'rgba(62, 97, 134, 0.08)', 'transparent']}
                    responsive
                    duration={1900}
                    delay={2600}
                    outputRange={[-120, 260]}
                  />
                  <Text style={styles.summaryCardLabel}>Current semester</Text>
                  <View style={styles.summaryCardBottom}>
                    <Text style={styles.summaryCardValue}>
                      {currentStudent?.current_semester || currentStudent?.semester || 'Not set'}
                    </Text>
                    <MaterialIcons name="school" size={18} color={Colors.secondary} />
                  </View>
              </ZoomCard>

              {/* Card 2: CGPA */}
              <ZoomCard
                containerStyle={styles.summaryCardShell}
                style={[styles.summaryCard, styles.summaryCgpaCard]}
                scaleTo={1.035}
              >
                  <ShineEffect
                    colors={['transparent', 'rgba(163, 19, 33, 0.02)', 'rgba(255, 255, 255, 0.52)', 'rgba(163, 19, 33, 0.08)', 'transparent']}
                    responsive
                    duration={2050}
                    delay={3100}
                    outputRange={[-120, 260]}
                  />
                  <Text style={styles.summaryCardLabel}>Cumulative CGPA</Text>
                  <View style={styles.summaryCardBottom}>
                    <Text style={[styles.summaryCardValue, { color: Colors.primary }]}>
                      {currentStudent?.cgpa
                        ? `${Number(currentStudent.cgpa).toFixed(2)} `
                        : '--- '}
                      <Text style={styles.cgpaMax}>/ 10.0</Text>
                    </Text>
                    <MaterialIcons name="grade" size={18} color={Colors.primary} />
                  </View>
              </ZoomCard>
            </View>

            <View style={[styles.summaryRow, { marginTop: 8 }]}>
              {/* Card 3: Attendance */}
              <ZoomCard
                containerStyle={styles.summaryCardShell}
                style={[styles.summaryCard, styles.summaryAttendanceCard]}
                scaleTo={1.035}
              >
                  <ShineEffect
                    colors={['transparent', 'rgba(46, 125, 79, 0.02)', 'rgba(255, 255, 255, 0.52)', 'rgba(46, 125, 79, 0.08)', 'transparent']}
                    responsive
                    duration={1950}
                    delay={3550}
                    outputRange={[-120, 260]}
                  />
                  <Text style={styles.summaryCardLabel}>Overall Attendance</Text>
                  <View style={styles.summaryCardBottom}>
                    <Text style={[styles.summaryCardValue, { color: Colors.verifiedGreen }]}>
                      {currentStudent?.attendance_rate
                        ? `${currentStudent.attendance_rate}%`
                        : '---'}
                    </Text>
                    <MaterialIcons name="fact-check" size={18} color={Colors.verifiedGreen} />
                  </View>
              </ZoomCard>

              {/* Card 4: Faculty Advisor */}
              <ZoomCard
                containerStyle={styles.summaryCardShell}
                style={[styles.summaryCard, styles.summaryAdvisorCard]}
                scaleTo={1.035}
              >
                  <ShineEffect
                    colors={['transparent', 'rgba(88, 107, 134, 0.02)', 'rgba(255, 255, 255, 0.5)', 'rgba(88, 107, 134, 0.08)', 'transparent']}
                    responsive
                    duration={2100}
                    delay={4000}
                    outputRange={[-120, 260]}
                  />
                  <Text style={styles.summaryCardLabel}>Faculty Advisor</Text>
                  <View style={styles.summaryCardBottom}>
                    <Text style={[styles.summaryCardValue, { fontSize: 13 }]} numberOfLines={1}>
                      {currentStudent?.faculty_advisor || 'Not assigned'}
                    </Text>
                    <MaterialIcons name="co-present" size={18} color={Colors.secondary} />
                  </View>
              </ZoomCard>
            </View>
          </View>
        </View>

        {/* Contact & Personal Details Expandable Card */}
        <ZoomCard style={styles.detailsCardWrapper} scaleTo={1.025}>
          <TouchableOpacity
            style={styles.detailsCardHeader}
            onPress={() => setDetailsExpanded(!detailsExpanded)}
            activeOpacity={0.8}
          >
            <View style={styles.detailsHeaderLeft}>
              <View style={styles.detailsHeaderIcon}>
                <MaterialIcons name="contact-emergency" size={20} color={Colors.secondary} />
              </View>
              <Text style={styles.detailsHeaderTitle}>Contact &amp; Personal Details</Text>
            </View>
            <MaterialIcons
              name={detailsExpanded ? 'expand-less' : 'expand-more'}
              size={22}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {detailsExpanded && (
            <View style={styles.detailsBody}>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <MaterialIcons name="phone" size={17} color={Colors.secondary} />
                  <Text style={styles.detailLabel}>Phone</Text>
                </View>
                <Text style={styles.detailValue}>{currentStudent?.phone || 'Not provided'}</Text>
              </View>

              {/* Bio section */}
              {currentStudent?.bio ? (
                <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                  <View style={styles.detailLabelRow}>
                    <MaterialIcons name="description" size={17} color={Colors.secondary} />
                    <Text style={styles.detailLabel}>Bio</Text>
                  </View>
                  <Text style={[styles.detailValue, { fontWeight: '400', lineHeight: 19 }]} numberOfLines={4}>
                    {currentStudent.bio}
                  </Text>
                </View>
              ) : null}

              {/* About Me section */}
              {currentStudent?.about_me ? (
                <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                  <View style={styles.detailLabelRow}>
                    <MaterialIcons name="person" size={17} color={Colors.secondary} />
                    <Text style={styles.detailLabel}>About Me</Text>
                  </View>
                  <Text style={[styles.detailValue, { fontWeight: '400', lineHeight: 18 }]}>
                    {currentStudent.about_me}
                  </Text>
                </View>
              ) : null}

              {/* Skills section */}
              {(() => {
                const raw = currentStudent?.skills;
                let parsedSkills = [];
                if (Array.isArray(raw)) parsedSkills = raw;
                else if (typeof raw === 'string') {
                  try {
                    const p = JSON.parse(raw);
                    if (Array.isArray(p)) parsedSkills = p;
                    else parsedSkills = raw.split(',').map((s) => s.trim()).filter(Boolean);
                  } catch {
                    parsedSkills = raw.split(',').map((s) => s.trim()).filter(Boolean);
                  }
                }
                if (!parsedSkills.length) return null;

                return (
                  <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                    <View style={styles.detailLabelRow}>
                      <MaterialIcons name="code" size={17} color={Colors.secondary} />
                      <Text style={styles.detailLabel}>Skills</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {parsedSkills.map((skill, idx) => (
                        <View key={idx} style={{
                          backgroundColor: 'rgba(62, 97, 134, 0.1)',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: 'rgba(62, 97, 134, 0.2)',
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.secondary }}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}

            </View>
          )}
        </ZoomCard>

        {/* Pinned Primary CTA - Glossy Crimson Action matching Projects "Add Project" */}
        <View style={styles.updateCtaWrapper}>
          <ZoomCard
            style={styles.updateButtonWrapper}
            onPress={() => setNotice({
              title: 'Update Profile',
              message: 'Your current scholar details are ready for Registrar verification.',
              actionLabel: 'Done',
            })}
            scaleTo={1.04}
          >
            <LinearGradient
              colors={[Colors.primaryContainer, Colors.primary, Colors.crimsonPressed]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.updateButtonGradient}
            >
              {/* Specular Top Gloss Highlight Line */}
              <View style={styles.buttonGlossHighlight} />
              <MaterialIcons name="sync" size={20} color="#ffffff" />
              <Text style={styles.updateButtonText}>Update profile</Text>
            </LinearGradient>
          </ZoomCard>
          <Text style={styles.updateFootnote}>
            Last updated: {currentStudent?.updated_at
              ? new Date(currentStudent.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Never'} · Digital Registrar
          </Text>

          {/* Sign Out / Lock Session Action */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => setNotice({
              title: 'Lock Academic Portal',
              message: 'Are you sure you want to sign out?',
              actionLabel: 'Sign out',
              secondaryLabel: 'Cancel',
              icon: 'lock',
              tone: 'neutral',
              onAction: async () => {
                setNotice(null);
                await signOut();
                onSignOut?.();
                onNavigate?.('signin');
              },
            })}
            activeOpacity={0.75}
          >
            <MaterialIcons name="logout" size={17} color={Colors.primary} />
            <Text style={styles.signOutButtonText}>Sign Out from Scholar Gateway</Text>
          </TouchableOpacity>
        </View>

        {/* Space for bottom navigation */}
        <View style={{ height: 80 }} />
      </ScrollView>
      <NoticeModal
        visible={!!notice}
        title={notice?.title}
        message={notice?.message}
        actionLabel={notice?.actionLabel || 'Understood'}
        onAction={notice?.onAction || (() => setNotice(null))}
        secondaryLabel={notice?.secondaryLabel}
        onSecondaryAction={() => setNotice(null)}
        onDismiss={() => setNotice(null)}
        icon={notice?.icon || 'sync'}
        tone={notice?.tone || 'brand'}
        details={notice?.details}
      />
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
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.spaceSm,
    paddingBottom: Spacing.spaceXs,
  },
  recordIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeRecordDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.verifiedGreen,
  },
  recordIndicatorText: {
    ...Typography.eyebrow,
    color: Colors.textSecondary,
    fontSize: 10.5,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#12263D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  editButtonText: {
    ...Typography.labelSm,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  identityCardWrapper: {
    paddingHorizontal: Spacing.margin,
    marginTop: Spacing.spaceXs,
  },
  identityCard: {
    borderRadius: Radii.xl,
    padding: Spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  identityBannerImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.28,
  },
  ambientAura: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 220,
    height: 180,
    borderRadius: 110,
    overflow: 'hidden',
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.spaceMd,
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: Radii.lg,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radii.lg,
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.verifiedGreen,
    borderWidth: 2,
    borderColor: '#101e30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityDetails: {
    flex: 1,
  },
  studentName: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#ffffff',
  },
  enrollmentTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: Radii.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    marginTop: 4,
    marginBottom: 4,
  },
  enrollmentText: {
    ...Typography.codeXs,
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
    letterSpacing: 0.4,
  },
  programText: {
    ...Typography.bodyMd,
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 16.5,
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.38)',
    marginTop: Spacing.spaceMd,
  },
  completionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completionTitle: {
    ...Typography.labelSm,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgb(253, 230, 138)',
  },
  completionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  finishText: {
    ...Typography.eyebrow,
    fontSize: 10,
    fontWeight: '700',
    color: '#fef3c7',
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
  sessionMetaText: {
    ...Typography.codeXs,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  summaryGrid: {
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    width: '100%',
    flex: 1,
    height: 84,
    backgroundColor: '#ffffff',
    borderRadius: Radii.lg,
    padding: Spacing.spaceSm,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  summaryCardShell: {
    flex: 1,
    minWidth: 0,
    borderRadius: Radii.lg,
    shadowColor: '#12263D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  summarySemesterCard: {
    backgroundColor: 'rgba(239, 246, 255, 0.82)',
    borderColor: 'rgba(62, 97, 134, 0.22)',
  },
  summaryCgpaCard: {
    backgroundColor: 'rgba(255, 241, 242, 0.76)',
    borderColor: 'rgba(163, 19, 33, 0.2)',
  },
  summaryAttendanceCard: {
    backgroundColor: 'rgba(240, 253, 244, 0.82)',
    borderColor: 'rgba(46, 125, 79, 0.22)',
  },
  summaryAdvisorCard: {
    backgroundColor: 'rgba(245, 247, 250, 0.96)',
    borderColor: 'rgba(88, 107, 134, 0.24)',
  },
  summaryCardLabel: {
    ...Typography.labelSm,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  summaryCardBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  summaryCardValue: {
    ...Typography.titleFormal,
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cgpaMax: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  detailsCardWrapper: {
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.spaceLg,
    backgroundColor: 'rgba(243, 245, 249, 0.85)',
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(209, 218, 235, 0.8)',
    overflow: 'hidden',
  },
  detailsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.spaceMd,
  },
  detailsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(62, 97, 134, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsHeaderTitle: {
    ...Typography.headlineSm,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detailsBody: {
    paddingHorizontal: Spacing.spaceMd,
    paddingBottom: Spacing.spaceMd,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    ...Typography.labelSm,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    ...Typography.codeSm,
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  grid2Col: {
    flexDirection: 'row',
    gap: 8,
  },
  gridColCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailValueLarge: {
    ...Typography.bodyMdMedium,
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  docCountMeta: {
    ...Typography.labelSm,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: Radii.lg,
    padding: Spacing.spaceSm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    shadowColor: '#12263D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pendingDocItem: {
    backgroundColor: 'rgba(255, 253, 248, 0.98)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  docItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.spaceSm,
    flex: 1,
  },
  docIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docItemText: {
    flex: 1,
  },
  docItemTitle: {
    ...Typography.bodyMdMedium,
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  docVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(46, 125, 79, 0.1)',
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  greenDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.verifiedGreen,
  },
  docVerifiedText: {
    ...Typography.labelSm,
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.verifiedGreen,
  },
  docPendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  amberDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.pendingAmber,
  },
  docPendingText: {
    ...Typography.labelSm,
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.pendingAmber,
  },
  docViewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.pendingAmber,
  },
  docAddBtnText: {
    ...Typography.labelSm,
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  updateCtaWrapper: {
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.spaceLg,
  },
  updateButtonWrapper: {
    height: 50,
    borderRadius: Radii.md,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  updateButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  buttonGlossHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  updateButtonText: {
    ...Typography.labelMd,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  updateFootnote: {
    ...Typography.codeXs,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(163, 19, 33, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(163, 19, 33, 0.2)',
  },
  signOutButtonText: {
    ...Typography.labelMd,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
});
