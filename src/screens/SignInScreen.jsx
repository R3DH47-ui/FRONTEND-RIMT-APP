import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Typography, Radii, ImageAssets } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import ShineEffect from '../components/ShineEffect';
import NoticeModal from '../components/NoticeModal';

export default function SignInScreen({
  onSignInSuccess,
  onSignUpSuccess,
  onPendingStatus,
  onRejectedStatus,
  onNavigate,
}) {
  const { signIn, signUp, supabaseStatus, hasEverRegistered } = useAuth();

  // Auth mode: 'signin' or 'signup'
  const [authMode, setAuthMode] = useState(hasEverRegistered ? 'signin' : 'signup');

  // Form fields for registration & sign in (simplified to Name, Roll No, Department, Year/Semester)
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('BCA');
  const [yearSemester, setYearSemester] = useState('1st Year (1st Sem)');
  const [avatarAsset, setAvatarAsset] = useState(null);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [notice, setNotice] = useState(null);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setAvatarAsset(result.assets[0]);
      }
    } catch (err) {
      console.warn('Could not pick profile image:', err.message);
      Alert.alert('Image Selection', 'Could not open photo library. Please try again.');
    }
  };

  const handleSignInAction = async () => {
    if (!rollNo.trim()) {
      Alert.alert('Roll Number Required', 'Please enter your university Roll Number.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Checking credentials & approval status...');

    try {
      const result = await signIn({ rollNo: rollNo.trim() });

      if (result.status === 'PENDING') {
        onPendingStatus?.(result.student || { roll_number: rollNo.trim() });
        return;
      }

      if (result.status === 'REJECTED' || result.status === 'REVOKED') {
        onRejectedStatus?.(result.student || { roll_number: rollNo.trim() }, result.reason);
        return;
      }

      if (result.success && (result.status === 'APPROVED' || result.status === 'VERIFIED')) {
        setIsVerified(true);
        setStatusMessage(`Welcome back, ${result.student?.name || result.student?.full_name || 'Scholar'}!`);
        setTimeout(() => {
          setIsVerified(false);
          onSignInSuccess?.();
        }, 800);
      } else {
        setNotice({
          title: 'Sign In Unsuccessful',
          message: result.error || 'Could not find this scholar. Check the roll number or register a new account.',
          actionLabel: 'Switch to Sign Up',
          secondaryLabel: 'Cancel',
          icon: 'person-search',
          tone: 'warning',
          onAction: () => {
            setAuthMode('signup');
            setNotice(null);
          },
        });
      }
    } catch (err) {
      setNotice({
        title: 'Authentication issue',
        message: err.message || 'A network error prevented sign in. Please try again.',
        icon: 'cloud-off',
        tone: 'warning',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpAction = async () => {
    if (!name.trim()) {
      Alert.alert('Full Name Required', 'Please enter your full legal name.');
      return;
    }
    if (!rollNo.trim()) {
      Alert.alert('Roll Number Required', 'Please enter your university Roll Number.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Submitting registration to Admin Queue...');

    try {
      const result = await signUp({
        name: name.trim(),
        fullName: name.trim(),
        rollNo: rollNo.trim(),
        rollNumber: rollNo.trim(),
        department,
        batch: yearSemester,
        yearSemester,
        avatarAsset,
      });

      if (result.success && result.status === 'PENDING') {
        setIsVerified(true);
        setStatusMessage('Registration Received! Awaiting Admin Approval...');
        setTimeout(() => {
          setIsVerified(false);
          onPendingStatus?.(result.student || { full_name: name.trim(), roll_number: rollNo.trim(), department, year_semester: yearSemester });
        }, 900);
      } else {
        const alreadyRegistered = result.error?.toLowerCase().includes('already registered');
        setNotice({
          title: 'Registration Notice',
          message: result.error || 'Failed to sign up.',
          actionLabel: alreadyRegistered ? 'Sign in instead' : 'Understood',
          onAction: alreadyRegistered
            ? () => {
                setAuthMode('signin');
                setNotice(null);
              }
            : () => setNotice(null),
        });
      }
    } catch (err) {
      Alert.alert('Registration Error', err.message || 'Could not complete registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const showSqlHelp = () => {
    Alert.alert(
      'Supabase Database Setup',
      'The "students" table script has been created in supabase/schema.sql.\n\nOpen your Supabase Dashboard -> SQL Editor and execute it to enable live cloud storage with Row Level Security.',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Campus Hero Header with Navy Gradient */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: ImageAssets.campusHero }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(18, 38, 61, 0.25)', 'rgba(18, 38, 61, 0.75)', '#12263D']}
            style={styles.heroScrim}
          />

          {/* Top Badges Row */}
          <View style={styles.topBadgesRow}>
            <View style={styles.officialBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.officialBadgeText}>Official Supabase Portal</Text>
            </View>
            <TouchableOpacity onPress={showSqlHelp} activeOpacity={0.7}>
              <View style={styles.dbBadge}>
                <MaterialIcons
                  name={supabaseStatus.tableExists ? 'cloud-done' : 'cloud-queue'}
                  size={13}
                  color={supabaseStatus.tableExists ? '#6ee7b7' : '#fde047'}
                />
                <Text style={styles.dbBadgeText}>
                  {supabaseStatus.tableExists ? 'DB LIVE' : 'SUPABASE READY'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Hero Titles */}
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroEyebrow}>Collegiate Digital Identity</Text>
            <Text style={styles.heroHeadline}>Academic Access Gateway</Text>
            <ShineEffect
              width={140}
              duration={2600}
              delay={3200}
              outputRange={[-200, 420]}
            />
          </View>
        </View>

        {/* Elevated Auth Card */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            {/* Ambient Card Sweep Shine Animation Constrained to Card Body */}
            <View style={styles.cardShineOverlay} pointerEvents="none">
              <ShineEffect
                width={200}
                duration={2800}
                delay={3600}
                outputRange={[-280, 500]}
              />
            </View>

            {/* RIMT Logo Crest with Protruding Top & Sweep Animation */}
            <View style={styles.crestWrapper}>
              <Image
                source={{ uri: ImageAssets.universityLogo }}
                style={styles.crestImage}
                resizeMode="contain"
              />
              <ShineEffect
                width={80}
                duration={2200}
                delay={2600}
                outputRange={[-120, 240]}
              />
            </View>


            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {authMode === 'signin' ? 'Scholar Sign In' : 'Scholar Registration'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {authMode === 'signin'
                  ? 'Enter your institutional Roll Number to access your academic vault.'
                  : 'Register your name and Roll Number into the university Supabase vault.'}
              </Text>
              <ShineEffect
                width={140}
                duration={2400}
                delay={2800}
                outputRange={[-180, 360]}
              />
            </View>

            {/* Sign Up: Profile Picture Upload */}
            {authMode === 'signup' && (
              <View style={styles.avatarPickerSection}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Scholar Profile Photo</Text>
                  <Text style={styles.recommendedTag}>Identity Verification</Text>
                </View>
                <View style={styles.avatarPickerRow}>
                  <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={handlePickAvatar}
                    activeOpacity={0.8}
                  >
                    {avatarAsset?.uri ? (
                      <Image source={{ uri: avatarAsset.uri }} style={styles.avatarPreviewImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <MaterialIcons name="person-outline" size={32} color={Colors.primary} />
                      </View>
                    )}
                    <View style={styles.avatarCameraBadge}>
                      <MaterialIcons name="photo-camera" size={14} color="#ffffff" />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.avatarPickerTextCol}>
                    <Text style={styles.avatarPickerTitle}>
                      {avatarAsset ? 'Profile Photo Selected' : 'Upload Profile Picture'}
                    </Text>
                    <Text style={styles.avatarPickerHint}>
                      Admin requires a photo to verify and approve your student account.
                    </Text>
                    <View style={styles.avatarActionsRow}>
                      <TouchableOpacity
                        style={styles.avatarActionBtn}
                        onPress={handlePickAvatar}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="photo-library" size={13} color={Colors.primary} />
                        <Text style={styles.avatarActionBtnText}>
                          {avatarAsset ? 'Change Photo' : 'Choose Photo'}
                        </Text>
                      </TouchableOpacity>
                      {avatarAsset && (
                        <TouchableOpacity
                          style={styles.avatarRemoveBtn}
                          onPress={() => setAvatarAsset(null)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="close" size={13} color={Colors.danger} />
                          <Text style={styles.avatarRemoveBtnText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Sign Up: Name Input */}
            {authMode === 'signup' && (
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Full Legal Name</Text>
                  <Text style={styles.requiredTag}>Required</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <MaterialIcons
                    name="badge"
                    size={20}
                    color={Colors.neutralGray}
                    style={styles.inputLeadingIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Harpreet Singh"
                    placeholderTextColor={Colors.neutralGray}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            {/* Roll Number Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>University Roll Number</Text>
                <Text style={styles.requiredTag}>Required</Text>
              </View>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="school"
                  size={20}
                  color={Colors.neutralGray}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={rollNo}
                  onChangeText={(val) => setRollNo(val.toUpperCase())}
                  placeholder="e.g. RIMT/22/BTCSE/0417"
                  placeholderTextColor={Colors.neutralGray}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                {rollNo.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setRollNo('')}
                    activeOpacity={0.6}
                  >
                    <MaterialIcons name="cancel" size={16} color={Colors.neutralGray} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Sign Up: Department & Semester Dropdowns / Pickers */}
            {authMode === 'signup' && (
              <>
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Academic Department</Text>
                    <Text style={styles.requiredTag}>Required</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                    {[
                      'BCA',
                      'B.Sc IT',
                      'B.Sc Cyber Security',
                      'B.Sc (Hons) AI & ML',
                    ].map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setDepartment(d)}
                        style={[
                          styles.chipOption,
                          department === d && styles.chipOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipOptionText,
                            department === d && styles.chipOptionTextSelected,
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Year / Current Semester</Text>
                    <Text style={styles.requiredTag}>Required</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                    {[
                      '1st Year (1st Sem)',
                      '1st Year (2nd Sem)',
                      '2nd Year (3rd Sem)',
                      '2nd Year (4th Sem)',
                      '3rd Year (5th Sem)',
                      '3rd Year (6th Sem)',
                      '4th Year (7th Sem)',
                      '4th Year (8th Sem)',
                    ].map((sem) => (
                      <TouchableOpacity
                        key={sem}
                        onPress={() => setYearSemester(sem)}
                        style={[
                          styles.chipOption,
                          yearSemester === sem && styles.chipOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipOptionText,
                            yearSemester === sem && styles.chipOptionTextSelected,
                          ]}
                        >
                          {sem}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}

            {/* Gated Review Warning Box */}
            {authMode === 'signup' && (
              <View style={styles.gatedBanner}>
                <MaterialIcons name="security" size={20} color="#b45309" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.gatedBannerTitle}>Admin Approval Required</Text>
                  <Text style={styles.gatedBannerDesc}>
                    New accounts enter a PENDING review queue. An administrator will verify your credentials before granting access to portal features.
                  </Text>
                </View>
              </View>
            )}


            {/* Action CTA Button */}
            <TouchableOpacity
              style={styles.submitButtonWrapper}
              onPress={authMode === 'signin' ? handleSignInAction : handleSignUpAction}
              disabled={isLoading || isVerified}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  isVerified
                    ? ['#2E7D4F', '#236B42']
                    : [Colors.primaryContainer, Colors.primary, Colors.crimsonPressed]
                }
                style={styles.submitGradient}
              >
                {isLoading ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.submitButtonText}>
                      {statusMessage || 'Processing...'}
                    </Text>
                  </View>
                ) : isVerified ? (
                  <View style={styles.buttonLoadingRow}>
                    <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                    <Text style={styles.submitButtonText}>
                      {statusMessage || 'Identity Verified'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonLoadingRow}>
                    <Text style={styles.submitButtonText}>
                      {authMode === 'signin' ? 'Sign In to Portal' : 'Register & Enter Vault'}
                    </Text>
                    <MaterialIcons
                      name={authMode === 'signin' ? 'arrow-forward' : 'check'}
                      size={20}
                      color="#ffffff"
                    />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Toggle Helper Link */}
            <TouchableOpacity
              style={styles.toggleModeLink}
              onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              activeOpacity={0.75}
            >
              <Text style={styles.toggleModeText}>
                {authMode === 'signin'
                  ? 'First time here? '
                  : 'Already registered your roll number? '}
                <Text style={styles.toggleModeBold}>
                  {authMode === 'signin' ? 'Sign Up now' : 'Sign In directly'}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Encrypted Proof Footnote */}
            <View style={styles.encryptedBanner}>
              <MaterialIcons name="verified-user" size={17} color={Colors.verifiedGreen} />
              <Text style={styles.encryptedBannerText}>
                Supabase TLS 1.3 encrypted vault storage
              </Text>
            </View>

            {/* Onboarding Tour Link */}
            <TouchableOpacity
              style={styles.onboardingLinkBtn}
              onPress={() => onNavigate?.('onboarding')}
              activeOpacity={0.75}
            >
              <MaterialIcons name="auto-awesome" size={15} color={Colors.primary} />
              <Text style={styles.onboardingLinkText}>
                New scholar? <Text style={styles.onboardingLinkBold}>View Onboarding Tour</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* IT Helpdesk Card */}
          <View style={styles.helpdeskCard}>
            <View style={styles.headsetIconBox}>
              <MaterialIcons name="headset-mic" size={20} color={Colors.secondary} />
            </View>
            <View style={styles.helpdeskTextColumn}>
              <Text style={styles.helpdeskTitle}>Need help with your Roll No.?</Text>
              <Text style={styles.helpdeskSubtitle}>Campus Academic Registrar</Text>
              <Text style={styles.helpdeskContact}>
                registrar@rimt.ac.in · +91 (1765) 523100 · Mon-Fri 9AM-5PM
              </Text>
            </View>
          </View>

          {/* Institutional Compliance Tag */}
          <View style={styles.footerCertRow}>
            <Text style={styles.certText}>Supabase Auth Gateway v2.4</Text>
            <Text style={styles.certDot}>•</Text>
            <Text style={styles.certText}>ISO 27001 Certified</Text>
          </View>
        </View>
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
        icon={notice?.icon || 'info-outline'}
        tone={notice?.tone || 'brand'}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  heroContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    inset: 0,
  },
  topBadgesRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: Spacing.margin,
    right: Spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(220, 226, 235, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.verifiedGreen,
  },
  officialBadgeText: {
    ...Typography.eyebrow,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  dbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(18, 38, 61, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  dbBadgeText: {
    ...Typography.codeXs,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTextContainer: {
    position: 'absolute',
    bottom: 30,
    left: Spacing.margin,
    right: Spacing.margin,
    overflow: 'hidden',
  },
  heroEyebrow: {
    ...Typography.eyebrow,
    color: Colors.secondaryFixed,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroHeadline: {
    ...Typography.headlineMd,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  cardContainer: {
    marginTop: -22,
    paddingHorizontal: Spacing.marginMobile,
    alignItems: 'center',
    zIndex: 10,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: Radii.xl,
    padding: Spacing.spaceLg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#12263D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    position: 'relative',
  },
  cardShineOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  crestWrapper: {
    alignSelf: 'center',
    width: 190,
    height: 64,
    backgroundColor: '#ffffff',
    borderRadius: Radii.lg,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -38,
    marginBottom: Spacing.spaceSm,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#12263D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    zIndex: 20,
  },
  crestImage: {
    width: '100%',
    height: '100%',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: Spacing.spaceMd,
    overflow: 'hidden',
    position: 'relative',
    paddingVertical: 4,
  },
  cardTitle: {
    ...Typography.displayHeroMobile,
    fontSize: 23,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 19,
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: Spacing.spaceSm + 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    ...Typography.labelMd,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  requiredTag: {
    ...Typography.codeXs,
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  inputWrapper: {
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputLeadingIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: '100%',
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  clearBtn: {
    padding: 6,
  },
  helperTip: {
    ...Typography.bodySm,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  submitButtonWrapper: {
    height: 50,
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  submitGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    ...Typography.labelMd,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  toggleModeLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  toggleModeText: {
    ...Typography.bodySm,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  toggleModeBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  encryptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  encryptedBannerText: {
    ...Typography.labelSm,
    fontSize: 11.5,
    color: Colors.verifiedGreen,
    fontWeight: '600',
  },
  onboardingLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
  },
  onboardingLinkText: {
    ...Typography.labelSm,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  onboardingLinkBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  helpdeskCard: {
    width: '100%',
    backgroundColor: Colors.canvasAlt,
    borderRadius: Radii.lg,
    padding: Spacing.spaceMd,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.spaceSm,
    marginTop: Spacing.spaceMd,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headsetIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpdeskTextColumn: {
    flex: 1,
  },
  helpdeskTitle: {
    ...Typography.labelMd,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  helpdeskSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  helpdeskContact: {
    ...Typography.codeXs,
    fontSize: 10.5,
    color: Colors.textSecondary,
    lineHeight: 15,
    marginTop: 4,
  },
  footerCertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.spaceLg,
  },
  certText: {
    ...Typography.eyebrow,
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  certDot: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  chipOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  chipOptionSelected: {
    backgroundColor: '#fef2f2',
    borderColor: Colors.primary,
  },
  chipOptionText: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  gatedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: Radii.lg,
    padding: Spacing.spaceMd,
    marginTop: Spacing.spaceSm,
    marginBottom: Spacing.spaceSm,
  },
  gatedBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  gatedBannerDesc: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
    lineHeight: 16,
  },
  avatarPickerSection: {
    marginBottom: Spacing.margin,
    backgroundColor: '#fffcfc',
    borderRadius: Radii.card,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 29, 44, 0.15)',
  },
  recommendedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: 'rgba(139, 29, 44, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: 'relative',
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: '#fbeeed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarPickerTextCol: {
    flex: 1,
  },
  avatarPickerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  avatarPickerHint: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  avatarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  avatarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(139, 29, 44, 0.08)',
  },
  avatarActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  avatarRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  avatarRemoveBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.danger,
  },
});
