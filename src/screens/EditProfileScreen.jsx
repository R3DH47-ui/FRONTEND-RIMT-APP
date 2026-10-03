import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontFamilies, ImageAssets, Radii, Spacing, Typography } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { AVAILABLE_COURSES } from './OnboardingScreen';
import ZoomCard from '../components/ZoomCard';
import NoticeModal from '../components/NoticeModal';

export default function EditProfileScreen({ onBack }) {
  const { currentStudent, updateProfile } = useAuth();
  const currentCourse = AVAILABLE_COURSES.find((course) => course.code === currentStudent?.course);
  const [name, setName] = useState(currentStudent?.name || '');
  const [phone, setPhone] = useState(currentStudent?.phone || '');
  const [batch, setBatch] = useState(currentStudent?.batch || '');
  const [bio, setBio] = useState(currentStudent?.bio || '');
  const [aboutMe, setAboutMe] = useState(currentStudent?.about_me || '');
  const [headline, setHeadline] = useState(currentStudent?.headline || '');
  const [skills, setSkills] = useState(() => {
    const raw = currentStudent?.skills;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });
  const [newSkill, setNewSkill] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(currentCourse || null);
  const [avatarAsset, setAvatarAsset] = useState(null);
  const [bannerAsset, setBannerAsset] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const pickImage = async (kind) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: kind === 'avatar' ? [1, 1] : [16, 6],
        quality: 0.85,
      });
      if (result.canceled) return;
      if (kind === 'avatar') setAvatarAsset(result.assets[0]);
      else setBannerAsset(result.assets[0]);
    } catch (error) {
      setNotice({ title: 'Image unavailable', message: error.message || 'Choose an image again.' });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNotice({ title: 'Name required', message: 'Enter your full legal name to update the scholar record.' });
      return;
    }
    if (!selectedCourse) {
      setNotice({ title: 'Select a course', message: 'Choose the course linked to your academic record.' });
      return;
    }

    setSaving(true);
    try {
      const result = await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        batch: batch.trim(),
        bio: bio.trim(),
        about_me: aboutMe.trim(),
        headline: headline.trim(),
        skills: skills.filter(Boolean),
        course: selectedCourse.code,
        department: selectedCourse.department,
        avatarAsset,
        bannerAsset,
      });
      setNotice(result.success
        ? {
            title: result.warning ? 'Profile saved with setup pending' : 'Profile updated',
            message: result.warning
              ? `Your academic details were saved. ${result.warning}`
              : 'Your profile details and selected course have been saved to your scholar record.',
            actionLabel: 'Return to profile',
            onAction: () => {
              setNotice(null);
              onBack?.();
            },
          }
        : {
            title: 'Update needs attention',
            message: result.error || 'The profile could not be saved to the academic record.',
          });
    } catch (error) {
      setNotice({ title: 'Update failed', message: error.message || 'The profile could not be saved.' });
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = avatarAsset?.uri || currentStudent?.avatar_url || ImageAssets.studentAvatar;
  const bannerUri = bannerAsset?.uri || currentStudent?.banner_url || ImageAssets.campusHero;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.75}>
          <MaterialIcons name="arrow-back" size={20} color={Colors.secondary} />
        </TouchableOpacity>
        <View style={styles.topBarTitle}>
          <Text style={styles.eyebrow}>RIMT ACADEMIC TRUST</Text>
          <Text style={styles.screenTitle}>Edit profile</Text>
        </View>
        <View style={styles.rollChip}>
          <Text style={styles.rollText}>{currentStudent?.roll_no || 'Scholar'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.imageCard}>
          <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
          <LinearGradient
            colors={['rgba(18,38,61,0.12)', 'rgba(18,38,61,0.88)']}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            style={styles.bannerAction}
            onPress={() => pickImage('banner')}
            activeOpacity={0.8}
          >
            <MaterialIcons name="photo-camera" size={15} color="#ffffff" />
            <Text style={styles.bannerActionText}>Change banner</Text>
          </TouchableOpacity>
          <View style={styles.avatarRow}>
            <View style={styles.avatarFrame}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            </View>
            <View style={styles.avatarCopy}>
              <Text style={styles.avatarTitle}>Scholar portrait</Text>
              <Text style={styles.avatarSubtitle}>Stored with your academic profile</Text>
            </View>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => pickImage('avatar')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={17} color={Colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ZoomCard style={styles.formCard} scaleTo={1.018}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <MaterialIcons name="badge" size={19} color={Colors.secondary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Personal details</Text>
              <Text style={styles.sectionHint}>Keep your registrar record current</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Full legal name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.neutralGray}
            autoCapitalize="words"
          />
          <Text style={styles.fieldLabel}>Phone number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Add a contact number"
            placeholderTextColor={Colors.neutralGray}
            keyboardType="phone-pad"
          />
          <Text style={styles.fieldLabel}>Academic batch</Text>
          <TextInput
            style={styles.input}
            value={batch}
            onChangeText={setBatch}
            placeholder="e.g. 2024-2027"
            placeholderTextColor={Colors.neutralGray}
          />
          <Text style={styles.fieldLabel}>Professional Bio &amp; Summary</Text>
          <TextInput
            style={[styles.input, styles.textareaInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Write a brief professional summary about your skills & interests"
            placeholderTextColor={Colors.neutralGray}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.fieldLabel}>Headline / Tagline</Text>
          <TextInput
            style={styles.input}
            value={headline}
            onChangeText={setHeadline}
            placeholder="e.g. BCA Scholar @ RIMT | Full-Stack Developer"
            placeholderTextColor={Colors.neutralGray}
          />
          <Text style={styles.fieldLabel}>About Me</Text>
          <TextInput
            style={[styles.input, styles.textareaInput]}
            value={aboutMe}
            onChangeText={setAboutMe}
            placeholder="Tell more about yourself, your interests, and career goals"
            placeholderTextColor={Colors.neutralGray}
            multiline
            numberOfLines={4}
          />
          <Text style={styles.fieldLabel}>Skills</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {skills.map((skill, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSkills(skills.filter((_, i) => i !== idx))}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: Colors.secondaryFixed,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: Radii.full,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.secondary }}>{skill}</Text>
                <MaterialIcons name="close" size={12} color={Colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newSkill}
              onChangeText={setNewSkill}
              placeholder="Add a skill (e.g. React Native)"
              placeholderTextColor={Colors.neutralGray}
              onSubmitEditing={() => {
                if (newSkill.trim() && !skills.includes(newSkill.trim())) {
                  setSkills([...skills, newSkill.trim()]);
                  setNewSkill('');
                }
              }}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={{
                width: 46,
                height: 46,
                borderRadius: Radii.md,
                backgroundColor: Colors.secondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => {
                if (newSkill.trim() && !skills.includes(newSkill.trim())) {
                  setSkills([...skills, newSkill.trim()]);
                  setNewSkill('');
                }
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </ZoomCard>

        <View style={styles.courseSection}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, styles.courseSectionIcon]}>
              <MaterialIcons name="school" size={19} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Academic course</Text>
              <Text style={styles.sectionHint}>Select the program on your record</Text>
            </View>
          </View>
          <View style={styles.courseList}>
            {AVAILABLE_COURSES.map((course) => {
              const isSelected = selectedCourse?.id === course.id;
              return (
                <ZoomCard
                  key={course.id}
                  scaleTo={1.035}
                  onPress={() => setSelectedCourse(course)}
                >
                  <View style={[styles.courseCard, isSelected && styles.courseCardSelected]}>
                    <View style={[styles.courseIcon, { backgroundColor: course.iconBg }]}>
                      <MaterialIcons name={course.icon} size={20} color={course.iconColor} />
                    </View>
                    <View style={styles.courseCopy}>
                      <Text style={[styles.courseCode, isSelected && styles.courseCodeSelected]}>
                        {course.code}
                      </Text>
                      <Text style={styles.courseName} numberOfLines={2}>{course.name}</Text>
                    </View>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <MaterialIcons name="check" size={13} color="#ffffff" />}
                    </View>
                  </View>
                </ZoomCard>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.86}
        >
          <LinearGradient
            colors={[Colors.primaryContainer, Colors.primary, Colors.crimsonPressed]}
            style={styles.saveGradient}
          >
            {saving ? <ActivityIndicator color="#ffffff" /> : <MaterialIcons name="save" size={19} color="#ffffff" />}
            <Text style={styles.saveText}>{saving ? 'Saving profile...' : 'Save profile changes'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.bottomSpace} />
      </ScrollView>

      <NoticeModal
        visible={!!notice}
        title={notice?.title}
        message={notice?.message}
        actionLabel={notice?.actionLabel || 'Understood'}
        onAction={notice?.onAction || (() => setNotice(null))}
        onDismiss={() => setNotice(null)}
        icon={notice?.title === 'Profile updated' ? 'check-circle' : 'info-outline'}
        tone={notice?.title === 'Profile updated'
          ? 'success'
          : notice?.title === 'Profile saved with setup pending'
            ? 'warning'
            : 'brand'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  topBar: {
    minHeight: 68,
    paddingHorizontal: Spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.canvasAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  topBarTitle: { flex: 1 },
  eyebrow: { ...Typography.eyebrow, fontSize: 9, color: Colors.textSecondary },
  screenTitle: { ...Typography.headlineSm, fontSize: 18, color: Colors.textPrimary },
  rollChip: {
    maxWidth: 112,
    backgroundColor: Colors.canvasAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  rollText: { ...Typography.codeXs, fontSize: 9, color: Colors.secondary, fontWeight: '700' },
  content: { padding: Spacing.margin, paddingBottom: 20, gap: Spacing.spaceMd },
  imageCard: {
    height: 192,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    backgroundColor: Colors.tertiaryDeep,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'flex-end',
  },
  bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bannerAction: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(18,38,61,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  bannerActionText: { fontFamily: FontFamilies.sansMedium, fontSize: 11, fontWeight: '700', color: '#ffffff' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  avatarFrame: {
    width: 58,
    height: 58,
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: Colors.canvasAlt,
  },
  avatar: { width: '100%', height: '100%' },
  avatarCopy: { flex: 1 },
  avatarTitle: { fontFamily: FontFamilies.sansMedium, color: '#ffffff', fontSize: 14, fontWeight: '700' },
  avatarSubtitle: { fontFamily: FontFamilies.sans, color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 3 },
  photoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.spaceMd,
    shadowColor: Colors.tertiaryDeep,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: Colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseSectionIcon: { backgroundColor: '#FCEDEF' },
  sectionTitle: { ...Typography.headlineSm, fontSize: 16, color: Colors.textPrimary },
  sectionHint: { fontFamily: FontFamilies.sans, color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  fieldLabel: {
    fontFamily: FontFamilies.sansMedium,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 9,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.canvasAlt,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontFamily: FontFamilies.sans,
    fontSize: 14,
  },
  textareaInput: {
    minHeight: 88,
    maxHeight: 140,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingBottom: 12,
    lineHeight: 20,
  },
  courseSection: { gap: 2 },
  courseList: { gap: 9 },
  courseCard: {
    minHeight: 76,
    padding: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  courseCardSelected: { borderColor: Colors.primary, backgroundColor: '#FFFBFB', elevation: 2 },
  courseIcon: { width: 40, height: 40, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  courseCopy: { flex: 1 },
  courseCode: { fontFamily: FontFamilies.sansMedium, color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  courseCodeSelected: { color: Colors.primary },
  courseName: { fontFamily: FontFamilies.sans, color: Colors.textSecondary, fontSize: 11, lineHeight: 15, marginTop: 3 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  saveButton: { borderRadius: Radii.md, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 9, elevation: 3 },
  saveButtonDisabled: { opacity: 0.75 },
  saveGradient: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  saveText: { fontFamily: FontFamilies.sansMedium, color: '#ffffff', fontSize: 14, fontWeight: '800' },
  bottomSpace: { height: 78 },
});