import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import ZoomCard from '../components/ZoomCard';
import ShineEffect from '../components/ShineEffect';
import {
  RESUME_TEMPLATES,
  loadSavedResumeData,
  saveResumeData,
  buildDefaultResumeData,
  exportResumeToPdf,
  printResumeDirectly,
  shareResumeFile,
  openResumeInDrive,
  openResumePdfViewer,
  AI_SUGGESTIONS,
} from '../services/resumeService';

// Archival Editorial Design Tokens
const ArchivalColors = {
  canvas: '#faf9f6',
  sheet: '#ffffff',
  surfaceRamp: '#f4f3f1',
  spruce: '#143728',
  deepSpruce: '#002114',
  ink: '#1a1c1a',
  mutedInk: '#5d5e64',
  hairline: '#c1c8c2',
  aiAmber: '#f6bd56',
  aiAmberDark: '#c4902d',
  aiAmberBg: '#fff8eb',
  diffRemoveBg: '#ffebee',
  diffRemoveText: '#b71c1c',
  diffAddBg: '#e8f5e9',
  diffAddText: '#1b5e20',
};

export default function ResumeScreen({ onBack }) {
  const { currentStudent } = useAuth();
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'templates' | 'editor' | 'review' | 'ai'
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState('navy_ledger');
  const [activeEditorSection, setActiveEditorSection] = useState('personal'); // 'personal' | 'summary' | 'skills' | 'education' | 'experience' | 'internships' | 'languages' | 'references' | 'projects' | 'additional'
  const [aiSuggestions, setAiSuggestions] = useState(AI_SUGGESTIONS);
  const [appliedCount, setAppliedCount] = useState(0);
  const [exportSuccessModal, setExportSuccessModal] = useState(null);

  // Quick In-Preview Edit Modal State
  const [quickEditSection, setQuickEditSection] = useState(null);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [tempUrlInput, setTempUrlInput] = useState('');

  // New item inputs in Editor
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillPct, setNewSkillPct] = useState('90');
  const [newLangName, setNewLangName] = useState('');
  const [newLangLevel, setNewLangLevel] = useState('Fluent');
  const [newLangDots, setNewLangDots] = useState('5');
  const [newRefName, setNewRefName] = useState('');
  const [newRefCompany, setNewRefCompany] = useState('');
  const [newRefPhone, setNewRefPhone] = useState('');
  const [newRefEmail, setNewRefEmail] = useState('');

  const rollNo = currentStudent?.roll_no || currentStudent?.roll_number || 'DEFAULT_STUDENT';

  // Load Initial Data
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await loadSavedResumeData(rollNo, currentStudent);
        if (isMounted) {
          setResumeData(data);
          if (data.templateId) {
            setActiveTemplateId(data.templateId);
          }
        }
      } catch (err) {
        console.warn('Failed to load resume:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [rollNo, currentStudent]);

  // Auto-Save whenever resumeData or template changes
  const handleUpdateResumeData = (updater) => {
    setResumeData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveResumeData(rollNo, next);
      return next;
    });
  };

  const handleSelectTemplate = (templateId) => {
    setActiveTemplateId(templateId);
    handleUpdateResumeData((prev) => ({ ...prev, templateId }));
  };

  // Image Selection (Gallery, Camera, or URL)
  const handlePickAvatarImage = () => {
    Alert.alert(
      '📷 Customize Profile Picture',
      'Select how you would like to set your resume image. The photo will automatically adjust and crop inside the circle / portrait frame.',
      [
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.9,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const newUri = result.assets[0].uri;
                handleUpdateResumeData((prev) => ({
                  ...prev,
                  personal: { ...prev.personal, avatarUrl: newUri },
                }));
                Alert.alert('✅ Photo Updated', 'Profile photo updated and adjusted to circular frame.');
              }
            } catch (err) {
              Alert.alert('Image Picker Error', err.message || 'Could not pick image.');
            }
          },
        },
        {
          text: '📸 Take Photo with Camera',
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                Alert.alert('Permission Required', 'Camera permission is needed to take a portrait photo.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.9,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const newUri = result.assets[0].uri;
                handleUpdateResumeData((prev) => ({
                  ...prev,
                  personal: { ...prev.personal, avatarUrl: newUri },
                }));
                Alert.alert('✅ Photo Updated', 'Photo captured and fitted into circular frame.');
              }
            } catch (err) {
              Alert.alert('Camera Error', err.message || 'Could not take photo.');
            }
          },
        },
        {
          text: '🌐 Enter Image URL',
          onPress: () => {
            setTempUrlInput(resumeData?.personal?.avatarUrl || '');
            setUrlModalVisible(true);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSaveUrlImage = () => {
    if (!tempUrlInput.trim()) {
      setUrlModalVisible(false);
      return;
    }
    handleUpdateResumeData((prev) => ({
      ...prev,
      personal: { ...prev.personal, avatarUrl: tempUrlInput.trim() },
    }));
    setUrlModalVisible(false);
    Alert.alert('✅ Image URL Updated', 'Resume photo updated successfully.');
  };

  // Option 1: Fetch Data from RIMT Profile
  const handleFetchFromRimtProfile = () => {
    Alert.alert(
      '⚡ Fetch from RIMT App Profile',
      'This will import your live institutional records (Shahzeb · 8.5 CGPA · BSc Cybersecurity · Verified Projects & Credentials) directly into your resume editor.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fetch & Apply',
          style: 'default',
          onPress: () => {
            const freshData = buildDefaultResumeData(currentStudent);
            freshData.templateId = activeTemplateId;
            setResumeData(freshData);
            saveResumeData(rollNo, freshData);
            Alert.alert('✅ Data Synced', 'Your RIMT institutional profile details have been successfully imported.');
          },
        },
      ]
    );
  };

  // Option 2: Reset / Clear Blank
  const handleResetToBlank = () => {
    Alert.alert(
      'Start Blank Resume',
      'Do you want to clear the fields so you can write the entire resume by yourself from scratch?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            const blankData = {
              templateId: activeTemplateId,
              personal: {
                name: '',
                headline: '',
                email: '',
                phone: '',
                location: '',
                website: '',
                linkedin: '',
                github: '',
                avatarUrl: currentStudent?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
                dob: '',
                declaration: '',
              },
              summary: '',
              education: [],
              projects: [],
              skills: [],
              languages: [],
              affiliations: [],
              references: [],
              interests: [],
              experience: [],
              internships: [],
              certifications: [],
              additionalInfo: { languages: '', certificates: '', awards: '' },
              updatedAt: new Date().toISOString(),
            };
            setResumeData(blankData);
            saveResumeData(rollNo, blankData);
          },
        },
      ]
    );
  };

  // Export PDF Handler
  const handleExportPdf = async () => {
    if (!resumeData) return;
    setIsExporting(true);
    try {
      const result = await exportResumeToPdf(resumeData, activeTemplateId);
      setIsExporting(false);
      if (result.success) {
        setExportSuccessModal({
          uri: result.uri,
          pages: result.numberOfPages || 1,
        });
      } else {
        Alert.alert('Export Notice', result.error || 'Could not export PDF.');
      }
    } catch (err) {
      setIsExporting(false);
      Alert.alert('Error', err.message || 'Export error');
    }
  };

  // Direct Print Handler
  const handleDirectPrint = async () => {
    if (!resumeData) return;
    try {
      await printResumeDirectly(resumeData, activeTemplateId);
    } catch (err) {
      Alert.alert('Print Error', err.message || 'Could not initiate printing.');
    }
  };

  // Share Handler
  const handleSharePdf = async (uri) => {
    let fileUri = uri || exportSuccessModal?.uri;
    if (!fileUri || fileUri.includes('/Print/')) {
      setIsExporting(true);
      const res = await exportResumeToPdf(resumeData, activeTemplateId);
      setIsExporting(false);
      if (res.success) {
        setExportSuccessModal({
          uri: res.uri,
          pages: res.numberOfPages || 1,
        });
        fileUri = res.uri;
      } else {
        Alert.alert('Share Error', res.error || 'Failed to prepare PDF for sharing.');
        return;
      }
    }
    await shareResumeFile(fileUri, resumeData?.personal?.name || 'Scholar');
  };

  // Open with Google Drive Handler
  const handleOpenInDrive = async (uri) => {
    let fileUri = uri || exportSuccessModal?.uri;
    if (!fileUri || fileUri.includes('/Print/')) {
      setIsExporting(true);
      const res = await exportResumeToPdf(resumeData, activeTemplateId);
      setIsExporting(false);
      if (res.success) {
        setExportSuccessModal({
          uri: res.uri,
          pages: res.numberOfPages || 1,
        });
        fileUri = res.uri;
      } else {
        Alert.alert('Drive Error', res.error || 'Failed to prepare PDF.');
        return;
      }
    }
    await openResumeInDrive(fileUri);
  };

  // Open with System PDF Viewer Handler
  const handleOpenPdfViewer = async (uri) => {
    let fileUri = uri || exportSuccessModal?.uri;
    if (!fileUri || fileUri.includes('/Print/')) {
      setIsExporting(true);
      const res = await exportResumeToPdf(resumeData, activeTemplateId);
      setIsExporting(false);
      if (res.success) {
        setExportSuccessModal({
          uri: res.uri,
          pages: res.numberOfPages || 1,
        });
        fileUri = res.uri;
      } else {
        Alert.alert('Viewer Error', res.error || 'Failed to prepare PDF.');
        return;
      }
    }
    await openResumePdfViewer(fileUri);
  };


  // Accept AI Suggestion
  const handleApplyAiSuggestion = (suggestion) => {
    if (!resumeData) return;
    if (suggestion.field === 'experience') {
      const expList = [...(resumeData.experience || [])];
      if (expList.length > 0) {
        expList[0].bullets = [suggestion.suggested, ...(expList[0].bullets || []).slice(1)];
        handleUpdateResumeData({ experience: expList });
      }
    } else if (suggestion.field === 'projects') {
      const projList = [...(resumeData.projects || [])];
      if (projList.length > 0) {
        projList[0].summary = suggestion.suggested;
        handleUpdateResumeData({ projects: projList });
      }
    } else if (suggestion.field === 'summary') {
      handleUpdateResumeData({ summary: suggestion.suggested });
    }

    setAiSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, applied: true } : s))
    );
    setAppliedCount((c) => c + 1);
    Alert.alert('✨ AI Suggestion Applied', 'Resume draft updated with quantifiable ATS bullet enhancement.');
  };

  // Skills handlers
  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const current = resumeData.skills || [];
    const newEntry = {
      id: `s_${Date.now()}`,
      name: newSkillName.trim(),
      pct: parseInt(newSkillPct, 10) || 90,
      stars: 5,
    };
    handleUpdateResumeData({ skills: [...current, newEntry] });
    setNewSkillName('');
  };

  const handleRemoveSkill = (skillId) => {
    const updated = (resumeData.skills || []).filter((s) => s.id !== skillId && s.name !== skillId);
    handleUpdateResumeData({ skills: updated });
  };

  // Languages handlers
  const handleAddLanguage = () => {
    if (!newLangName.trim()) return;
    const current = resumeData.languages || [];
    const newEntry = {
      id: `l_${Date.now()}`,
      name: newLangName.trim(),
      level: newLangLevel.trim() || 'Fluent',
      pct: 90,
      dots: parseInt(newLangDots, 10) || 5,
    };
    handleUpdateResumeData({ languages: [...current, newEntry] });
    setNewLangName('');
  };

  const handleRemoveLanguage = (langId) => {
    const updated = (resumeData.languages || []).filter((l) => l.id !== langId && l.name !== langId);
    handleUpdateResumeData({ languages: updated });
  };

  // References handlers
  const handleAddReference = () => {
    if (!newRefName.trim()) return;
    const current = resumeData.references || [];
    const newEntry = {
      id: `r_${Date.now()}`,
      name: newRefName.trim(),
      company: newRefCompany.trim() || 'Company / University',
      phone: newRefPhone.trim() || '+123-456-7890',
      email: newRefEmail.trim() || 'hello@reallygreatsite.com',
    };
    handleUpdateResumeData({ references: [...current, newEntry] });
    setNewRefName('');
    setNewRefCompany('');
    setNewRefPhone('');
    setNewRefEmail('');
  };

  const handleRemoveReference = (refId) => {
    const updated = (resumeData.references || []).filter((r) => r.id !== refId && r.name !== refId);
    handleUpdateResumeData({ references: updated });
  };

  // Education handlers
  const handleAddEducation = () => {
    const current = resumeData.education || [];
    const newEntry = {
      id: `edu_${Date.now()}`,
      degree: 'Master of Business Management',
      institute: 'Wardiere University',
      period: '2029 – 2031',
      score: 'GPA: 3.8 / 4.0',
      highlights: 'Relevant Coursework & Strategic Leadership.',
    };
    handleUpdateResumeData({ education: [...current, newEntry] });
  };

  const handleRemoveEducation = (eduId) => {
    const updated = (resumeData.education || []).filter((e) => e.id !== eduId);
    handleUpdateResumeData({ education: updated });
  };

  // Experience handlers
  const handleAddExperience = () => {
    const current = resumeData.experience || [];
    const newEntry = {
      id: `exp_${Date.now()}`,
      role: 'Marketing Manager & Specialist',
      organization: 'Borcelle Studio',
      period: '2030 – PRESENT',
      location: 'New York, USA',
      bullets: [
        'Develop and execute comprehensive strategies aligning with brand goals.',
        'Lead, mentor, and manage high-performing collaborative teams.',
      ],
    };
    handleUpdateResumeData({ experience: [...current, newEntry] });
  };

  const handleRemoveExperience = (expId) => {
    const updated = (resumeData.experience || []).filter((e) => e.id !== expId);
    handleUpdateResumeData({ experience: updated });
  };

  // Internships handlers
  const handleAddInternship = () => {
    const current = resumeData.internships || [];
    const newEntry = {
      id: `int_${Date.now()}`,
      role: 'Intern HR Associate',
      organization: 'TCS (Tata Consultancy Services)',
      period: 'Jun 2024 – Aug 2024',
      location: 'Indore, India',
      bullets: [
        'Supported superiors in day-to-day candidate evaluation and technical screening.',
        'Managed institutional database entries and maintained strict data integrity.',
      ],
    };
    handleUpdateResumeData({ internships: [...current, newEntry] });
  };

  const handleRemoveInternship = (intId) => {
    const updated = (resumeData.internships || []).filter((it) => it.id !== intId);
    handleUpdateResumeData({ internships: updated });
  };

  // Projects handlers
  const handleAddProject = () => {
    const current = resumeData.projects || [];
    const newEntry = {
      id: `p_${Date.now()}`,
      title: 'Full-Stack Student Management System',
      tech: 'React Native, Node.js, SQLite',
      summary: 'Architected high-efficiency administrative dashboard with real-time analytics and role verification.',
      github: 'https://github.com/rimt-trust/student-system',
    };
    handleUpdateResumeData({ projects: [...current, newEntry] });
  };

  const handleRemoveProject = (projId) => {
    const updated = (resumeData.projects || []).filter((p) => p.id !== projId);
    handleUpdateResumeData({ projects: updated });
  };

  if (loading || !resumeData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading verified student resume...</Text>
      </View>
    );
  }

  const selectedTemplate = RESUME_TEMPLATES.find((t) => t.id === activeTemplateId) || RESUME_TEMPLATES[0];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ZoomCard scaleTo={1.08} onPress={onBack}>
            <View style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={20} color={ArchivalColors.ink} />
              <Text style={styles.backButtonText}>Overview</Text>
            </View>
          </ZoomCard>
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CVForge</Text>
          <Text style={styles.headerSubtitle}>Institutional Resume Builder</Text>
        </View>

        <View style={styles.headerRight}>
          <ZoomCard scaleTo={1.12} onPress={handleExportPdf} disabled={isExporting}>
            <View style={styles.headerActionBtn}>
              {isExporting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <MaterialIcons name="file-download" size={20} color={Colors.primary} />
              )}
            </View>
          </ZoomCard>
        </View>
      </View>

      {/* 5 Navigation Tabs (Horizontally Scrollable, Spacious & Organized) */}
      <View style={styles.tabNavWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabNavScrollContent}
        >
          {[
            { id: 'preview', label: 'Preview', icon: 'visibility' },
            { id: 'templates', label: 'Templates', icon: 'dashboard-customize' },
            { id: 'editor', label: 'Editor', icon: 'edit-note' },
            { id: 'review', label: 'Review', icon: 'rate-review' },
            { id: 'ai', label: 'AI Audit', icon: 'auto-fix-high', badge: '88' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.75}
                style={[styles.tabNavItem, isActive && styles.tabNavItemActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={17}
                  color={isActive ? Colors.primary : ArchivalColors.mutedInk}
                />
                <Text
                  style={[styles.tabNavText, isActive && styles.tabNavTextActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {Boolean(tab.badge) && (
                  <View style={[styles.aiBadge, isActive && styles.aiBadgeActive]}>
                    <Text style={[styles.aiBadgeText, isActive && styles.aiBadgeTextActive]}>{tab.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* MAIN VIEWPORT */}
      <View style={styles.contentArea}>
        {/* ============================================================= */}
        {/* TAB 1: LIVE PREVIEW (Fully Interactive & Tap-to-Edit)          */}
        {/* ============================================================= */}
        {activeTab === 'preview' && (
          <View style={styles.previewContainer}>
            {/* Top Toolbar */}
            <View style={styles.previewToolbar}>
              <View style={styles.templateInfoChip}>
                <View style={[styles.accentDot, { backgroundColor: selectedTemplate.accent }]} />
                <Text style={styles.templateInfoText} numberOfLines={1}>{selectedTemplate.name}</Text>
                <Text style={styles.templateAtsScore}>({selectedTemplate.atsRating})</Text>
              </View>

              <View style={styles.toolbarRight}>
                <ZoomCard scaleTo={1.06} onPress={handleDirectPrint}>
                  <View style={styles.toolBtn}>
                    <MaterialIcons name="print" size={14} color={ArchivalColors.ink} />
                    <Text style={styles.toolBtnText}>Print</Text>
                  </View>
                </ZoomCard>

                <ZoomCard scaleTo={1.06} onPress={() => handleSharePdf()}>
                  <View style={styles.toolBtn}>
                    <MaterialIcons name="share" size={14} color={ArchivalColors.ink} />
                    <Text style={styles.toolBtnText}>Share</Text>
                  </View>
                </ZoomCard>
              </View>
            </View>

            {/* Quick Helper Banner */}
            <View style={styles.previewTipBar}>
              <MaterialIcons name="touch-app" size={14} color={Colors.primary} />
              <Text style={styles.previewTipText}>
                Tap any photo or section to customize text directly, or switch to Editor!
              </Text>
              <TouchableOpacity
                onPress={() => setActiveTab('editor')}
                style={styles.openEditorMiniBtn}
              >
                <Text style={styles.openEditorMiniText}>Editor →</Text>
              </TouchableOpacity>
            </View>

            {/* A4 Paper Scrollview */}
            <ScrollView
              style={styles.paperScrollView}
              contentContainerStyle={styles.paperScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.paperWrapper}>
                {/* ----------------------------------------------------------- */}
                {/* TEMPLATE 1: NAVY EXECUTIVE (Image 1 / Reference 4 marked)   */}
                {/* ----------------------------------------------------------- */}
                {activeTemplateId === 'navy_ledger' && (
                  <View style={styles.navyA4Sheet}>
                    {/* Deep Navy Left Sidebar */}
                    <View style={styles.navySidebar}>
                      {/* Avatar Circle with camera badge */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePickAvatarImage}
                        style={styles.navyAvatarBox}
                      >
                        <Image
                          source={{ uri: resumeData.personal.avatarUrl }}
                          style={styles.navyAvatarImg}
                          resizeMode="cover"
                        />
                        <View style={styles.avatarCameraBadge}>
                          <MaterialIcons name="photo-camera" size={10} color="#ffffff" />
                        </View>
                      </TouchableOpacity>

                      {/* ABOUT ME (Circled by user in Image 1) */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setQuickEditSection('summary')}
                        style={styles.clickableSection}
                      >
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.navySideHeader}>👤 ABOUT ME</Text>
                          <MaterialIcons name="edit" size={10} color="rgba(255,255,255,0.7)" />
                        </View>
                        <Text style={styles.navySideText}>{resumeData.summary}</Text>
                      </TouchableOpacity>

                      {/* CONTACT */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setQuickEditSection('contact')}
                        style={styles.clickableSection}
                      >
                        <View style={styles.sectionHeaderRow}>
                          <Text style={[styles.navySideHeader, { marginTop: 10 }]}>📞 CONTACT</Text>
                          <MaterialIcons name="edit" size={10} color="rgba(255,255,255,0.7)" />
                        </View>
                        <Text style={styles.navySideText}>📞 {resumeData.personal.phone || '+91 9797310798'}</Text>
                        <Text style={styles.navySideText}>✉️ {resumeData.personal.email || 'shahzeb@rimt.ac.in'}</Text>
                        <Text style={styles.navySideText}>📍 {resumeData.personal.location || 'Punjab, India'}</Text>
                        {Boolean(resumeData.personal.website) && (
                          <Text style={styles.navySideText}>🌐 {resumeData.personal.website}</Text>
                        )}
                      </TouchableOpacity>

                      {/* SKILLS */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setQuickEditSection('skills')}
                        style={styles.clickableSection}
                      >
                        <View style={styles.sectionHeaderRow}>
                          <Text style={[styles.navySideHeader, { marginTop: 10 }]}>⚙️ SKILLS</Text>
                          <MaterialIcons name="edit" size={10} color="rgba(255,255,255,0.7)" />
                        </View>
                        {(resumeData.skills || []).slice(0, 5).map((s, idx) => (
                          <View key={s.id || idx} style={{ marginBottom: 5 }}>
                            <Text style={styles.navySkillText}>{s.name || s}</Text>
                            <View style={styles.navyBarTrack}>
                              <View style={[styles.navyBarFill, { width: `${s.pct || 88}%` }]} />
                            </View>
                          </View>
                        ))}
                      </TouchableOpacity>
                    </View>

                    {/* Crisp White Right Canvas */}
                    <View style={styles.navyMainCol}>
                      {/* Name & Headline */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setQuickEditSection('personal')}
                        style={styles.clickableSection}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.navyName}>{resumeData.personal.name || 'SOHEL'}</Text>
                          <MaterialIcons name="edit" size={12} color={Colors.primary} />
                        </View>
                        <Text style={styles.navyHeadline}>{resumeData.personal.headline || 'Full stack developer'}</Text>

                        <View style={styles.navyMetaStrip}>
                          <Text style={styles.navyMetaItem}>📅 {resumeData.personal.dob || '01 Jan 2004'}</Text>
                          <Text style={styles.navyMetaItem}>📍 {resumeData.personal.location || 'Punjab, India'}</Text>
                        </View>
                      </TouchableOpacity>

                      {/* EDUCATION */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setQuickEditSection('education')}
                        style={styles.clickableSection}
                      >
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.navySectionTitle}>🎓 EDUCATION</Text>
                          <MaterialIcons name="edit" size={11} color="#0B2545" />
                        </View>
                        {(resumeData.education || []).map((edu) => (
                          <View key={edu.id} style={styles.navyTimelineNode}>
                            <Text style={styles.navyNodeTitle}>{edu.degree}</Text>
                            <Text style={styles.navyNodeInst}>{edu.institute} ({edu.period})</Text>
                            {Boolean(edu.score) && (
                              <View style={styles.navyScoreBadgeRow}>
                                <View style={styles.navyScoreBadge}>
                                  <Text style={styles.navyScoreBadgeText}>{edu.score}</Text>
                                </View>
                              </View>
                            )}
                          </View>
                        ))}
                      </TouchableOpacity>

                      {/* EXPERIENCE */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setQuickEditSection('experience')}
                        style={styles.clickableSection}
                      >
                        <View style={styles.sectionHeaderRow}>
                          <Text style={[styles.navySectionTitle, { marginTop: 10 }]}>💼 EXPERIENCE</Text>
                          <MaterialIcons name="edit" size={11} color="#0B2545" />
                        </View>
                        {(resumeData.experience || []).map((exp) => (
                          <View key={exp.id} style={styles.navyTimelineNode}>
                            <Text style={styles.navyNodeTitle}>{exp.role}</Text>
                            <Text style={styles.navyNodeInst}>{exp.organization} | {exp.period}</Text>
                            {(exp.bullets || []).map((b, bIdx) => (
                              <Text key={bIdx} style={styles.navyNodeBullet}>• {b}</Text>
                            ))}
                          </View>
                        ))}
                      </TouchableOpacity>

                      {Boolean(resumeData.personal.declaration) && (
                        <View style={styles.navyDeclarationBox}>
                          <Text style={styles.navyDeclHeader}>DECLARATION</Text>
                          <Text style={styles.navyDeclText}>{resumeData.personal.declaration}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* ----------------------------------------------------------- */}
                {/* TEMPLATE 2: EXECUTIVE SLATE SPLIT (Richard Sanchez Image 3) */}
                {/* ----------------------------------------------------------- */}
                {activeTemplateId === 'richard_sanchez' && (
                  <View style={styles.sanchezSheet}>
                    {/* Dark Slate Top Header */}
                    <View style={styles.sanchezHeader}>
                      {/* Overlapping Avatar */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePickAvatarImage}
                        style={styles.sanchezAvatarWrap}
                      >
                        <Image
                          source={{ uri: resumeData.personal.avatarUrl }}
                          style={styles.sanchezAvatarImg}
                          resizeMode="cover"
                        />
                        <View style={styles.avatarCameraBadge}>
                          <MaterialIcons name="photo-camera" size={10} color="#ffffff" />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setQuickEditSection('personal')}
                        style={{ flex: 1 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.sanchezName}>{resumeData.personal.name || 'RICHARD SANCHEZ'}</Text>
                          <MaterialIcons name="edit" size={12} color="#ffffff" />
                        </View>
                        <Text style={styles.sanchezHeadline}>{resumeData.personal.headline || 'MARKETING MANAGER'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Body Split */}
                    <View style={styles.sanchezBody}>
                      {/* Left Light-Grey Column */}
                      <View style={styles.sanchezLeftCol}>
                        {/* CONTACT */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('contact')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.sanchezSectionHeader}>
                            <Text style={styles.sanchezSectionTitle}>CONTACT</Text>
                            <MaterialIcons name="edit" size={10} color="#111827" />
                          </View>
                          <Text style={styles.sanchezContactItem}>📞 {resumeData.personal.phone || '+123-456-7890'}</Text>
                          <Text style={styles.sanchezContactItem}>✉️ {resumeData.personal.email || 'hello@reallygreatsite.com'}</Text>
                          <Text style={styles.sanchezContactItem}>📍 {resumeData.personal.location || '123 Anywhere St., Any City'}</Text>
                          {Boolean(resumeData.personal.website) && (
                            <Text style={styles.sanchezContactItem}>🌐 {resumeData.personal.website}</Text>
                          )}
                        </TouchableOpacity>

                        {/* SKILLS */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('skills')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.sanchezSectionHeader}>
                            <Text style={styles.sanchezSectionTitle}>SKILLS</Text>
                            <MaterialIcons name="edit" size={10} color="#111827" />
                          </View>
                          {(resumeData.skills || []).slice(0, 8).map((sk, idx) => (
                            <Text key={sk.id || idx} style={styles.sanchezBulletItem}>• {sk.name || sk}</Text>
                          ))}
                        </TouchableOpacity>

                        {/* LANGUAGES */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('languages')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.sanchezSectionHeader}>
                            <Text style={styles.sanchezSectionTitle}>LANGUAGES</Text>
                            <MaterialIcons name="edit" size={10} color="#111827" />
                          </View>
                          {(resumeData.languages || []).map((l, idx) => (
                            <Text key={l.id || idx} style={styles.sanchezBulletItem}>
                              • {l.name} ({l.level || 'Fluent'})
                            </Text>
                          ))}
                        </TouchableOpacity>

                        {/* REFERENCES */}
                        {Boolean((resumeData.references || []).length) && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setQuickEditSection('references')}
                            style={styles.clickableSection}
                          >
                            <View style={styles.sanchezSectionHeader}>
                              <Text style={styles.sanchezSectionTitle}>REFERENCE</Text>
                              <MaterialIcons name="edit" size={10} color="#111827" />
                            </View>
                            {(resumeData.references || []).slice(0, 2).map((r, idx) => (
                              <View key={r.id || idx} style={{ marginBottom: 6 }}>
                                <Text style={styles.sanchezRefName}>{r.name}</Text>
                                <Text style={styles.sanchezRefSub}>{r.company}</Text>
                                {Boolean(r.phone) && <Text style={styles.sanchezRefSub}>Phone: {r.phone}</Text>}
                                {Boolean(r.email) && <Text style={styles.sanchezRefSub}>Email: {r.email}</Text>}
                              </View>
                            ))}
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Right White Column */}
                      <View style={styles.sanchezRightCol}>
                        {/* PROFILE */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('summary')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.sanchezRightHeader}>
                            <View style={styles.sanchezIconCircle}><Text style={styles.sanchezIconText}>👤</Text></View>
                            <Text style={styles.sanchezRightTitle}>PROFILE</Text>
                            <MaterialIcons name="edit" size={11} color="#111827" />
                          </View>
                          <Text style={styles.sanchezProfileText}>{resumeData.summary}</Text>
                        </TouchableOpacity>

                        {/* WORK EXPERIENCE */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('experience')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.sanchezRightHeader}>
                            <View style={styles.sanchezIconCircle}><Text style={styles.sanchezIconText}>💼</Text></View>
                            <Text style={styles.sanchezRightTitle}>WORK EXPERIENCE</Text>
                            <MaterialIcons name="edit" size={11} color="#111827" />
                          </View>
                          <View style={styles.sanchezTimelineWrap}>
                            {(resumeData.experience || []).map((exp) => (
                              <View key={exp.id} style={styles.sanchezTimelineNode}>
                                <View style={styles.sanchezNodeHeader}>
                                  <Text style={styles.sanchezNodeCompany}>{exp.organization}</Text>
                                  <Text style={styles.sanchezNodePeriod}>{exp.period}</Text>
                                </View>
                                <Text style={styles.sanchezNodeRole}>{exp.role}</Text>
                                {(exp.bullets || []).map((b, bIdx) => (
                                  <Text key={bIdx} style={styles.sanchezNodeBullet}>• {b}</Text>
                                ))}
                              </View>
                            ))}
                          </View>
                        </TouchableOpacity>

                        {/* EDUCATION */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('education')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.sanchezRightHeader}>
                            <View style={styles.sanchezIconCircle}><Text style={styles.sanchezIconText}>🎓</Text></View>
                            <Text style={styles.sanchezRightTitle}>EDUCATION</Text>
                            <MaterialIcons name="edit" size={11} color="#111827" />
                          </View>
                          <View style={styles.sanchezTimelineWrap}>
                            {(resumeData.education || []).map((edu) => (
                              <View key={edu.id} style={styles.sanchezTimelineNode}>
                                <View style={styles.sanchezNodeHeader}>
                                  <Text style={styles.sanchezNodeCompany}>{edu.degree}</Text>
                                  <Text style={styles.sanchezNodePeriod}>{edu.period}</Text>
                                </View>
                                <Text style={styles.sanchezNodeRole}>{edu.institute}</Text>
                                {Boolean(edu.score) && <Text style={styles.sanchezNodeScore}>{edu.score}</Text>}
                              </View>
                            ))}
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* ----------------------------------------------------------- */}
                {/* TEMPLATE 3: CORPORATE ANALYST CLASSIC (Herman Walton Image 4)*/}
                {/* ----------------------------------------------------------- */}
                {activeTemplateId === 'herman_walton' && (
                  <View style={styles.waltonSheet}>
                    {/* 4 Corner Crop Marks */}
                    <View style={styles.waltonCornerTL} />
                    <View style={styles.waltonCornerTR} />
                    <View style={styles.waltonCornerBL} />
                    <View style={styles.waltonCornerBR} />

                    {/* Header */}
                    <View style={styles.waltonHeaderRow}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setQuickEditSection('personal')}
                        style={{ flex: 1, paddingRight: 10 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.waltonName}>{resumeData.personal.name || 'HERMAN WALTON'}</Text>
                          <MaterialIcons name="edit" size={12} color="#1A56DB" />
                        </View>
                        <Text style={styles.waltonTitle}>{resumeData.personal.headline || 'FINANCIAL ANALYST'}</Text>
                        <Text style={styles.waltonContactLine}>
                          {[
                            resumeData.personal.phone ? `📞 ${resumeData.personal.phone}` : null,
                            resumeData.personal.email ? `✉️ ${resumeData.personal.email}` : null,
                            resumeData.personal.location ? `📍 ${resumeData.personal.location}` : null,
                          ].filter(Boolean).join('  ·  ') || `${resumeData.personal.location || 'New York, USA'} | ${resumeData.personal.phone || '(412) 479-6342'} | ${resumeData.personal.email || 'example@gmail.com'}`}
                        </Text>
                      </TouchableOpacity>

                      {/* Right Photo */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePickAvatarImage}
                        style={styles.waltonPhotoBox}
                      >
                        <Image
                          source={{ uri: resumeData.personal.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400' }}
                          style={styles.waltonPhotoImg}
                          resizeMode="cover"
                        />
                        <View style={styles.avatarCameraBadge}>
                          <MaterialIcons name="photo-camera" size={10} color="#ffffff" />
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* SUMMARY */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setQuickEditSection('summary')}
                      style={styles.clickableSection}
                    >
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>SUMMARY</Text>
                        <MaterialIcons name="edit" size={10} color="#1A56DB" />
                      </View>
                      <Text style={styles.waltonText}>{resumeData.summary}</Text>
                    </TouchableOpacity>

                    {/* PROFESSIONAL EXPERIENCE */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setQuickEditSection('experience')}
                      style={styles.clickableSection}
                    >
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>PROFESSIONAL EXPERIENCE</Text>
                        <MaterialIcons name="edit" size={10} color="#1A56DB" />
                      </View>
                      {(resumeData.experience || []).map((exp) => (
                        <View key={exp.id} style={{ marginBottom: 6 }}>
                          <View style={styles.waltonRow}>
                            <Text style={styles.waltonRoleCompany}>{exp.role}, {exp.organization}</Text>
                            <Text style={styles.waltonDate}>{exp.period}</Text>
                          </View>
                          {(exp.bullets || []).map((b, bIdx) => (
                            <Text key={bIdx} style={styles.waltonBullet}>• {b}</Text>
                          ))}
                        </View>
                      ))}
                    </TouchableOpacity>

                    {/* EDUCATION */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setQuickEditSection('education')}
                      style={styles.clickableSection}
                    >
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>EDUCATION</Text>
                        <MaterialIcons name="edit" size={10} color="#1A56DB" />
                      </View>
                      {(resumeData.education || []).map((edu) => (
                        <View key={edu.id} style={{ marginBottom: 6 }}>
                          <View style={styles.waltonRow}>
                            <Text style={styles.waltonRoleCompany}>{edu.degree}</Text>
                            <Text style={styles.waltonDate}>{edu.period}</Text>
                          </View>
                          <Text style={styles.waltonInst}>{edu.institute}{edu.score ? ` · ${edu.score}` : ''}</Text>
                        </View>
                      ))}
                    </TouchableOpacity>

                    {/* TECHNICAL SKILLS (4-Column Grid) */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setQuickEditSection('skills')}
                      style={styles.clickableSection}
                    >
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>TECHNICAL SKILLS</Text>
                        <MaterialIcons name="edit" size={10} color="#1A56DB" />
                      </View>
                      <View style={styles.waltonSkillsGrid}>
                        {(resumeData.skills || []).map((s, idx) => (
                          <View key={s.id || idx} style={styles.waltonSkillGridItem}>
                            <Text style={styles.waltonSkillText}>{s.name || s}</Text>
                          </View>
                        ))}
                      </View>
                    </TouchableOpacity>

                    {/* ADDITIONAL INFORMATION */}
                    <View style={styles.clickableSection}>
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>ADDITIONAL INFORMATION</Text>
                      </View>
                      <Text style={styles.waltonBullet}>• Languages: {(resumeData.languages || []).map((l) => l.name).join(', ')}</Text>
                      {Boolean((resumeData.certifications || []).length) && (
                        <Text style={styles.waltonBullet}>• Certificates: {(resumeData.certifications || []).map((c) => c.title).join(', ')}</Text>
                      )}
                      <Text style={styles.waltonBullet}>• Awards/Activities: High Academic Honor & Departmental Commendation</Text>
                    </View>
                  </View>
                )}

                {/* ----------------------------------------------------------- */}
                {/* TEMPLATE 4: CRIMSON RECRUITER HORIZON (Sunny Singh Image 5) */}
                {/* ----------------------------------------------------------- */}
                {activeTemplateId === 'sunny_singh' && (
                  <View style={styles.singhSheet}>
                    {/* Top Header */}
                    <View style={styles.singhHeader}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePickAvatarImage}
                        style={styles.singhAvatarWrap}
                      >
                        <Image
                          source={{ uri: resumeData.personal.avatarUrl }}
                          style={styles.singhAvatarImg}
                          resizeMode="cover"
                        />
                        <View style={styles.avatarCameraBadge}>
                          <MaterialIcons name="photo-camera" size={10} color="#ffffff" />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setQuickEditSection('personal')}
                        style={{ flex: 1 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.singhName}>{resumeData.personal.name || 'SUNNY SINGH'}</Text>
                          <MaterialIcons name="edit" size={12} color="#A11B24" />
                        </View>
                        <Text style={styles.singhRole}>{resumeData.personal.headline || 'Technical Recruiter'}</Text>
                        <Text style={styles.singhSummaryText} numberOfLines={4}>{resumeData.summary}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Crimson Banner */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setQuickEditSection('contact')}
                      style={styles.singhCrimsonBanner}
                    >
                      <Text style={styles.singhBannerText}>📞 {resumeData.personal.phone || '+91-9876543210'}</Text>
                      <Text style={styles.singhBannerText}>✉️ {resumeData.personal.email || 'singhsun@gmail.com'}</Text>
                      <Text style={styles.singhBannerText}>📍 {resumeData.personal.location || 'Indore, India'}</Text>
                    </TouchableOpacity>

                    {/* Two-Column Body */}
                    <View style={styles.singhBody}>
                      {/* Left Column (60%) */}
                      <View style={styles.singhLeftCol}>
                        {/* EMPLOYMENT HISTORY */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('experience')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.singhHeadingRow}>
                            <Text style={styles.singhSectionHeading}>EMPLOYMENT HISTORY</Text>
                            <MaterialIcons name="edit" size={10} color="#A11B24" />
                          </View>
                          {(resumeData.experience || []).map((exp) => (
                            <View key={exp.id} style={{ marginBottom: 6 }}>
                              <Text style={styles.singhJobRole}>{exp.role}</Text>
                              <Text style={styles.singhJobCompany}>{exp.organization}</Text>
                              <Text style={styles.singhJobMeta}>{exp.period} | {exp.location || resumeData.personal.location}</Text>
                              {(exp.bullets || []).map((b, bIdx) => (
                                <Text key={bIdx} style={styles.singhJobBullet}>• {b}</Text>
                              ))}
                            </View>
                          ))}
                        </TouchableOpacity>

                        {/* INTERNSHIPS */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('internships')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.singhHeadingRow}>
                            <Text style={styles.singhSectionHeading}>INTERNSHIPS</Text>
                            <MaterialIcons name="edit" size={10} color="#A11B24" />
                          </View>
                          {(resumeData.internships || []).map((it) => (
                            <View key={it.id} style={{ marginBottom: 6 }}>
                              <Text style={styles.singhJobRole}>{it.role}</Text>
                              <Text style={styles.singhJobCompany}>{it.organization}</Text>
                              <Text style={styles.singhJobMeta}>{it.period} | {it.location || 'Indore'}</Text>
                              {(it.bullets || []).map((b, bIdx) => (
                                <Text key={bIdx} style={styles.singhJobBullet}>• {b}</Text>
                              ))}
                            </View>
                          ))}
                        </TouchableOpacity>
                      </View>

                      {/* Right Column (40%) */}
                      <View style={styles.singhRightCol}>
                        {/* EDUCATION */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('education')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.singhHeadingRow}>
                            <Text style={styles.singhSectionHeading}>EDUCATION</Text>
                            <MaterialIcons name="edit" size={10} color="#A11B24" />
                          </View>
                          {(resumeData.education || []).map((edu) => (
                            <View key={edu.id} style={{ marginBottom: 6 }}>
                              <Text style={styles.singhJobRole}>{edu.degree}</Text>
                              <Text style={styles.singhJobCompany}>{edu.institute}</Text>
                              <Text style={styles.singhJobMeta}>{edu.period}</Text>
                            </View>
                          ))}
                        </TouchableOpacity>

                        {/* SKILLS (Maroon Pill Badges) */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('skills')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.singhHeadingRow}>
                            <Text style={styles.singhSectionHeading}>SKILLS</Text>
                            <MaterialIcons name="edit" size={10} color="#A11B24" />
                          </View>
                          {(resumeData.skills || []).map((sk, idx) => (
                            <View key={sk.id || idx} style={styles.singhSkillPill}>
                              <Text style={styles.singhSkillPillText}>{sk.name || sk}</Text>
                            </View>
                          ))}
                        </TouchableOpacity>

                        {/* LANGUAGES (Rating Dots) */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setQuickEditSection('languages')}
                          style={styles.clickableSection}
                        >
                          <View style={styles.singhHeadingRow}>
                            <Text style={styles.singhSectionHeading}>LANGUAGES</Text>
                            <MaterialIcons name="edit" size={10} color="#A11B24" />
                          </View>
                          {(resumeData.languages || []).map((l, idx) => {
                            const count = l.dots || (l.pct ? Math.round(l.pct / 20) : 4);
                            return (
                              <View key={l.id || idx} style={styles.singhLangRow}>
                                <Text style={styles.singhLangName}>{l.name}</Text>
                                <View style={styles.singhDotsRow}>
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <View
                                      key={i}
                                      style={[
                                        styles.singhDot,
                                        i <= count ? styles.singhDotActive : styles.singhDotInactive,
                                      ]}
                                    />
                                  ))}
                                </View>
                              </View>
                            );
                          })}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Bottom Floating CTA Button */}
            <View style={styles.floatingBottomCta}>
              <ZoomCard scaleTo={1.03} onPress={handleExportPdf} disabled={isExporting}>
                <LinearGradient
                  colors={[Colors.primary, '#850012']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.glossyButtonGradient}
                >
                  <ShineEffect />
                  <View style={styles.btnContentRow}>
                    <View style={styles.btnIconBadge}>
                      {isExporting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <MaterialIcons name="picture-as-pdf" size={18} color="#ffffff" />
                      )}
                    </View>
                    <View style={styles.btnTextStack}>
                      <Text style={styles.glossyBtnTitle}>Export Vector PDF</Text>
                      <Text style={styles.glossyBtnSubtitle} numberOfLines={1}>{selectedTemplate.name} · Verified ATS</Text>
                    </View>
                    <View style={styles.btnKpiPill}>
                      <Text style={styles.btnKpiPillText}>99% ATS</Text>
                    </View>
                  </View>
                </LinearGradient>
              </ZoomCard>
            </View>
          </View>
        )}

        {/* ============================================================= */}
        {/* TAB 2: TEMPLATES GALLERY (4 Verified Templates Only)          */}
        {/* ============================================================= */}
        {activeTab === 'templates' && (
          <ScrollView
            style={styles.tabContentScroll}
            contentContainerStyle={styles.galleryContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Sync from Profile Quick Action */}
            <ZoomCard scaleTo={1.02} onPress={handleFetchFromRimtProfile}>
              <View style={styles.syncBanner}>
                <View style={styles.syncBannerLeft}>
                  <View style={styles.syncIconBox}>
                    <MaterialIcons name="bolt" size={24} color="#ffffff" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.syncBannerTitle}>⚡ Fetch from RIMT App Profile</Text>
                    <Text style={styles.syncBannerDesc}>Auto-fill degree, 8.5 CGPA, verified projects, and credentials</Text>
                  </View>
                </View>
                <View style={styles.syncActionBtn}>
                  <Text style={styles.syncActionBtnText}>Fetch</Text>
                </View>
              </View>
            </ZoomCard>

            <View style={styles.galleryHeaderWrap}>
              <Text style={styles.sectionHeading}>Verified Pro Templates ({RESUME_TEMPLATES.length})</Text>
              <Text style={styles.sectionDesc}>Select any layout format below. All templates are 100% customizable.</Text>
            </View>

            {/* List of 4 Templates */}
            <View style={styles.templatesGrid}>
              {RESUME_TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === activeTemplateId;
                return (
                  <ZoomCard
                    key={tmpl.id}
                    scaleTo={1.03}
                    onPress={() => handleSelectTemplate(tmpl.id)}
                  >
                    <View style={[styles.templateCard, isSelected && styles.templateCardSelected]}>
                      {/* High-Fidelity Mini Mockup */}
                      <View style={[styles.tmplMiniA4, { borderColor: isSelected ? Colors.primary : ArchivalColors.hairline }]}>
                        {tmpl.id === 'navy_ledger' && (
                          <View style={{ flex: 1, flexDirection: 'row' }}>
                            <View style={{ width: '36%', backgroundColor: '#0B2545', padding: 2, alignItems: 'center' }}>
                              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ffffff', marginBottom: 2 }} />
                              <View style={{ width: '80%', height: 2, backgroundColor: '#1D63FF', borderRadius: 1, marginBottom: 2 }} />
                              <View style={{ width: '60%', height: 1.5, backgroundColor: '#ffffff', opacity: 0.6 }} />
                            </View>
                            <View style={{ width: '64%', backgroundColor: '#ffffff', padding: 3 }}>
                              <View style={{ width: '80%', height: 3, backgroundColor: '#0B2545', marginBottom: 2 }} />
                              <View style={{ width: '40%', height: 2, backgroundColor: '#1D63FF', borderRadius: 1, marginBottom: 2 }} />
                              <View style={{ width: '90%', height: 1.5, backgroundColor: '#94A3B8' }} />
                            </View>
                          </View>
                        )}

                        {tmpl.id === 'richard_sanchez' && (
                          <View style={{ flex: 1 }}>
                            <View style={{ height: 16, backgroundColor: '#1B2433', padding: 2, justifyContent: 'center' }}>
                              <View style={{ width: '50%', height: 2, backgroundColor: '#ffffff', marginLeft: 16 }} />
                            </View>
                            <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ffffff', position: 'absolute', top: 3, left: 3, backgroundColor: '#333' }} />
                            <View style={{ flex: 1, flexDirection: 'row' }}>
                              <View style={{ width: '35%', backgroundColor: '#EDEEF2', padding: 2 }}>
                                <View style={{ width: '70%', height: 1.5, backgroundColor: '#111827', marginBottom: 2 }} />
                                <View style={{ width: '50%', height: 1, backgroundColor: '#4B5563' }} />
                              </View>
                              <View style={{ width: '65%', backgroundColor: '#ffffff', padding: 2 }}>
                                <View style={{ width: '80%', height: 2, backgroundColor: '#111827', marginBottom: 2 }} />
                                <View style={{ width: '90%', height: 1, backgroundColor: '#9CA3AF' }} />
                              </View>
                            </View>
                          </View>
                        )}

                        {tmpl.id === 'herman_walton' && (
                          <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 2 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                              <View style={{ width: '60%' }}>
                                <View style={{ width: '90%', height: 3, backgroundColor: '#1A56DB', marginBottom: 1 }} />
                                <View style={{ width: '60%', height: 1.5, backgroundColor: '#111827' }} />
                              </View>
                              <View style={{ width: 10, height: 12, backgroundColor: '#CBD5E1', borderRadius: 1 }} />
                            </View>
                            <View style={{ width: '100%', height: 1, backgroundColor: '#1A56DB', marginBottom: 2 }} />
                            <View style={{ width: '80%', height: 1.5, backgroundColor: '#4B5563', marginBottom: 2 }} />
                            <View style={{ width: '100%', height: 1, backgroundColor: '#1A56DB', marginBottom: 2 }} />
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                              <View style={{ width: '22%', height: 6, backgroundColor: '#E2E8F0' }} />
                              <View style={{ width: '22%', height: 6, backgroundColor: '#E2E8F0' }} />
                              <View style={{ width: '22%', height: 6, backgroundColor: '#E2E8F0' }} />
                              <View style={{ width: '22%', height: 6, backgroundColor: '#E2E8F0' }} />
                            </View>
                          </View>
                        )}

                        {tmpl.id === 'sunny_singh' && (
                          <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
                            <View style={{ flexDirection: 'row', padding: 2, alignItems: 'center', gap: 2 }}>
                              <View style={{ width: 10, height: 12, borderRadius: 2, backgroundColor: '#333' }} />
                              <View style={{ flex: 1 }}>
                                <View style={{ width: '80%', height: 2, backgroundColor: '#111827', marginBottom: 1 }} />
                                <View style={{ width: '50%', height: 1, backgroundColor: '#6B7280' }} />
                              </View>
                            </View>
                            <View style={{ height: 4, backgroundColor: '#A11B24', width: '100%' }} />
                            <View style={{ flex: 1, flexDirection: 'row', padding: 2 }}>
                              <View style={{ width: '60%' }}>
                                <View style={{ width: '90%', height: 1.5, backgroundColor: '#A11B24', marginBottom: 2 }} />
                                <View style={{ width: '80%', height: 1, backgroundColor: '#6B7280' }} />
                              </View>
                              <View style={{ width: '40%', alignItems: 'center' }}>
                                <View style={{ width: '80%', height: 2.5, backgroundColor: '#A11B24', borderRadius: 1, marginBottom: 1.5 }} />
                                <View style={{ width: '80%', height: 2.5, backgroundColor: '#A11B24', borderRadius: 1 }} />
                              </View>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Details Block */}
                      <View style={styles.tmplDetails}>
                        <View style={styles.tmplHeaderLine}>
                          <Text style={styles.tmplName} numberOfLines={1}>{tmpl.name}</Text>
                          <View style={styles.atsBadgePill}>
                            <Text style={styles.atsBadgePillText}>{tmpl.atsRating}</Text>
                          </View>
                        </View>

                        <Text style={styles.tmplCategoryTag}>{tmpl.category}</Text>
                        <Text style={styles.tmplDescText} numberOfLines={2}>{tmpl.description}</Text>

                        <View style={styles.tmplFooterRow}>
                          <View style={[styles.stylePill, { backgroundColor: tmpl.accent }]}>
                            <Text style={styles.stylePillText}>{tmpl.badge.split('·')[0].trim()}</Text>
                          </View>

                          {isSelected ? (
                            <View style={styles.selectedStatusWrap}>
                              <MaterialIcons name="check-circle" size={16} color={Colors.primary} />
                              <Text style={styles.selectedStatusText}>Selected</Text>
                            </View>
                          ) : (
                            <Text style={styles.useTemplateAction}>Select Format →</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </ZoomCard>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ============================================================= */}
        {/* TAB 3: COMPLETE RESUME EDITOR (Full Student Customization)    */}
        {/* ============================================================= */}
        {activeTab === 'editor' && (
          <View style={styles.editorContainer}>
            {/* Top Quick Action Bar: Fetch & Reset */}
            <View style={styles.editorTopActionsBar}>
              <ZoomCard scaleTo={1.04} onPress={handleFetchFromRimtProfile}>
                <View style={styles.fetchProfileBtn}>
                  <MaterialIcons name="bolt" size={16} color="#ffffff" />
                  <Text style={styles.fetchProfileBtnText}>Fetch from RIMT Profile</Text>
                </View>
              </ZoomCard>

              <ZoomCard scaleTo={1.04} onPress={handleResetToBlank}>
                <View style={styles.clearBlankBtn}>
                  <MaterialIcons name="restart-alt" size={16} color={ArchivalColors.mutedInk} />
                  <Text style={styles.clearBlankBtnText}>Start Blank</Text>
                </View>
              </ZoomCard>
            </View>

            {/* Horizontal Section Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.editorNavScroll}
              contentContainerStyle={styles.editorNavContent}
            >
              {[
                { id: 'personal', label: 'Personal & Photo', icon: 'person' },
                { id: 'summary', label: 'About Me', icon: 'notes' },
                { id: 'skills', label: 'Key Skills', icon: 'psychology' },
                { id: 'education', label: 'Education', icon: 'school' },
                { id: 'experience', label: 'Experience', icon: 'work' },
                { id: 'internships', label: 'Internships', icon: 'badge' },
                { id: 'languages', label: 'Languages', icon: 'translate' },
                { id: 'references', label: 'References', icon: 'groups' },
                { id: 'projects', label: 'Projects', icon: 'code' },
              ].map((sec) => (
                <ZoomCard
                  key={sec.id}
                  scaleTo={1.08}
                  onPress={() => setActiveEditorSection(sec.id)}
                >
                  <View style={[styles.editorNavChip, activeEditorSection === sec.id && styles.editorNavChipActive]}>
                    <MaterialIcons
                      name={sec.icon}
                      size={15}
                      color={activeEditorSection === sec.id ? '#ffffff' : ArchivalColors.ink}
                    />
                    <Text style={[styles.editorNavChipText, activeEditorSection === sec.id && styles.editorNavChipTextActive]}>
                      {sec.label}
                    </Text>
                  </View>
                </ZoomCard>
              ))}
            </ScrollView>

            <ScrollView
              style={styles.editorFormScroll}
              contentContainerStyle={styles.editorFormContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. PERSONAL DETAILS & PHOTO */}
              {activeEditorSection === 'personal' && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Personal Coordinates & Photo</Text>
                  <Text style={styles.formCardSub}>Change candidate photo and personal info. Image fits automatically inside the circular frame.</Text>

                  {/* Photo Action Row */}
                  <View style={styles.editorPhotoRow}>
                    <View style={styles.editorAvatarBox}>
                      <Image source={{ uri: resumeData.personal.avatarUrl }} style={styles.editorAvatarImg} />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <ZoomCard scaleTo={1.04} onPress={handlePickAvatarImage}>
                        <View style={styles.pickPhotoBtn}>
                          <MaterialIcons name="add-a-photo" size={16} color="#ffffff" />
                          <Text style={styles.pickPhotoBtnText}>Change Photo (Gallery / Camera)</Text>
                        </View>
                      </ZoomCard>
                      <Text style={styles.editorPhotoHint}>Any chosen photo will auto-clip cleanly inside circle.</Text>
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.name}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, name: val } }))}
                    placeholder="e.g. SOHEL"
                  />

                  <Text style={styles.fieldLabel}>Professional Role / Headline</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.headline}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, headline: val } }))}
                    placeholder="e.g. Full stack developer"
                  />

                  <Text style={styles.fieldLabel}>Date of Birth / Ledger Date</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.dob}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, dob: val } }))}
                    placeholder="e.g. 01 Jan 2004"
                  />

                  <Text style={styles.fieldLabel}>Location</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.location}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, location: val } }))}
                    placeholder="Punjab, India"
                  />

                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.email}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, email: val } }))}
                    keyboardType="email-address"
                  />

                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.phone}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, phone: val } }))}
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.fieldLabel}>Website / Portfolio URL</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.website}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, website: val } }))}
                    placeholder="www.reallygreatsite.com"
                  />

                  <Text style={styles.fieldLabel}>LinkedIn Profile</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.linkedin}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, linkedin: val } }))}
                    placeholder="linkedin.com/in/..."
                  />
                </View>
              )}

              {/* 2. ABOUT ME / SUMMARY */}
              {activeEditorSection === 'summary' && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>About Me / Executive Bio</Text>
                  <Text style={styles.formCardSub}>Write or edit your introduction narrative. (Circled in Image 1)</Text>
                  <TextInput
                    style={[styles.inputField, styles.textAreaField, { minHeight: 140 }]}
                    multiline
                    value={resumeData.summary}
                    onChangeText={(val) => handleUpdateResumeData({ summary: val })}
                    placeholder="am shazaeb and am cybersecurity passionate..."
                  />
                </View>
              )}

              {/* 3. KEY SKILLS */}
              {activeEditorSection === 'skills' && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Key Technical Skills</Text>
                  <Text style={styles.formCardSub}>Add core competencies with percentage scoring (used for bars, pills, and grid).</Text>

                  <View style={styles.addRowInline}>
                    <TextInput
                      style={[styles.inputField, { flex: 2.5, marginBottom: 0 }]}
                      placeholder="Skill (e.g. Cybersecurity)"
                      value={newSkillName}
                      onChangeText={setNewSkillName}
                    />
                    <TextInput
                      style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
                      placeholder="Pct %"
                      value={newSkillPct}
                      onChangeText={setNewSkillPct}
                      keyboardType="numeric"
                    />
                    <ZoomCard scaleTo={1.08} onPress={handleAddSkill}>
                      <View style={styles.addBtnSmall}>
                        <Text style={styles.addBtnSmallText}>Add</Text>
                      </View>
                    </ZoomCard>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    {(resumeData.skills || []).map((s, idx) => (
                      <View key={s.id || idx} style={styles.itemRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemRowTitle}>{s.name || s}</Text>
                          <Text style={styles.itemRowSub}>Score: {s.pct || 90}%</Text>
                        </View>
                        <ZoomCard scaleTo={1.15} onPress={() => handleRemoveSkill(s.id || s.name || s)}>
                          <MaterialIcons name="delete-outline" size={20} color={ArchivalColors.diffRemoveText} />
                        </ZoomCard>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 4. EDUCATION */}
              {activeEditorSection === 'education' && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Education & Academic Credentials</Text>
                  <Text style={styles.formCardSub}>Degrees, secondary schooling, and university certifications.</Text>
                  {(resumeData.education || []).map((edu, idx) => (
                    <View key={edu.id} style={styles.nestedEditCard}>
                      <View style={styles.nestedCardHeader}>
                        <Text style={styles.nestedEditTag}>Education #{idx + 1}</Text>
                        <ZoomCard scaleTo={1.15} onPress={() => handleRemoveEducation(edu.id)}>
                          <MaterialIcons name="delete-outline" size={20} color={ArchivalColors.diffRemoveText} />
                        </ZoomCard>
                      </View>
                      <TextInput
                        style={styles.inputField}
                        value={edu.degree}
                        onChangeText={(val) => {
                          const updated = [...resumeData.education];
                          updated[idx].degree = val;
                          handleUpdateResumeData({ education: updated });
                        }}
                        placeholder="Degree / Course"
                      />
                      <TextInput
                        style={styles.inputField}
                        value={edu.institute}
                        onChangeText={(val) => {
                          const updated = [...resumeData.education];
                          updated[idx].institute = val;
                          handleUpdateResumeData({ education: updated });
                        }}
                        placeholder="Institute / Board"
                      />
                      <TextInput
                        style={styles.inputField}
                        value={edu.period}
                        onChangeText={(val) => {
                          const updated = [...resumeData.education];
                          updated[idx].period = val;
                          handleUpdateResumeData({ education: updated });
                        }}
                        placeholder="Duration / Batch"
                      />
                      <TextInput
                        style={styles.inputField}
                        value={edu.score}
                        onChangeText={(val) => {
                          const updated = [...resumeData.education];
                          updated[idx].score = val;
                          handleUpdateResumeData({ education: updated });
                        }}
                        placeholder="Score / CGPA"
                      />
                    </View>
                  ))}

                  <ZoomCard scaleTo={1.04} onPress={handleAddEducation}>
                    <View style={styles.addItemCtaBtn}>
                      <MaterialIcons name="add-circle-outline" size={18} color={Colors.primary} />
                      <Text style={styles.addItemCtaText}>+ Add Education Degree</Text>
                    </View>
                  </ZoomCard>
                </View>
              )}

              {/* 5. EXPERIENCE */}
              {activeEditorSection === 'experience' && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Professional Work Experience</Text>
                  <Text style={styles.formCardSub}>Jobs, technical roles, industry work, and accomplishments.</Text>
                  {(resumeData.experience || []).map((exp, idx) => (
                    <View key={exp.id} style={styles.nestedEditCard}>
                      <View style={styles.nestedCardHeader}>
                        <Text style={styles.nestedEditTag}>Experience #{idx + 1}</Text>
                        <ZoomCard scaleTo={1.15} onPress={() => handleRemoveExperience(exp.id)}>
                          <MaterialIcons name="delete-outline" size={20} color={ArchivalColors.diffRemoveText} />
                        </ZoomCard>
                      </View>
                      <TextInput
                        style={styles.inputField}
                        value={exp.role}
                        onChangeText={(val) => {
                          const updated = [...resumeData.experience];
                          updated[idx].role = val;
                          handleUpdateResumeData({ experience: updated });
                        }}
                        placeholder="Job Role / Position"
                      />
                      <TextInput
                        style={styles.inputField}
                        value={exp.organization}
                        onChangeText={(val) => {
                          const updated = [...resumeData.experience];
                          updated[idx].organization = val;
                          handleUpdateResumeData({ experience: updated });
                        }}
                        placeholder="Company / Department"
                      />
                      <TextInput
                        style={styles.inputField}
                        value={exp.period}
                        onChangeText={(val) => {
                          const updated = [...resumeData.experience];
                          updated[idx].period = val;
                          handleUpdateResumeData({ experience: updated });
                        }}
                        placeholder="Period / Duration"
                      />
                      <TextInput
                        style={[styles.inputField, styles.textAreaField]}
                        multiline
                        value={(exp.bullets || []).join('\n')}
                        onChangeText={(val) => {
                          const updated = [...resumeData.experience];
                          updated[idx].bullets = val.split('\n').filter(Boolean);
                          handleUpdateResumeData({ experience: updated });
                        }}
                        placeholder="Bullet points (1 per line)"
                      />
                    </View>
                  ))}

                  <ZoomCard scaleTo={1.04} onPress={handleAddExperience}>
                    <View style={styles.addItemCtaBtn}>
                      <MaterialIcons name="add-circle-outline" size={18} color={Colors.primary} />
                      <Text style={styles.addItemCtaText}>+ Add Work Experience</Text>
                    </View>
                  </ZoomCard>
                </View>
              )}

              {/* 6. INTERNSHIPS */}
              {activeEditorSection === 'internships' && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Internships & Campus Roles</Text>
                  <Text style={styles.formCardSub}>Internships highlighted in templates like Crimson Recruiter Horizon.</Text>
                  {(resumeData.internships || []).map((it, idx) => (
                    <View key={it.id} style={styles.nestedEditCard}>
                      <View style={styles.nestedCardHeader}>
                        <Text style={styles.nestedEditTag}>Internship #{idx + 1}</Text>
                        <ZoomCard scaleTo={1.15} onPress={() => handleRemoveInternship(it.id)}>
                          <MaterialIcons name="delete-outline" size={20} color={ArchivalColors.diffRemoveText} />
                        </ZoomCard>
                      </View>
                      <TextInput
                        style={styles.inputField}
                        value={it.role}
                        onChangeText={(val) => {
                          const updated = [...(resumeData.internships || [])];
                          updated[idx].role = val;
                          handleUpdateResumeData({ internships: updated });
                        }}
                        placeholder="Internship Title"
                      />
                      <TextInput
                        style={styles.inputField}
                        value={it.organization}
                        onChangeText={(val) => {
                          const updated = [...(resumeData.internships || [])];
                          updated[idx].organization = val;
                          handleUpdateResumeData({ internships: updated });
                        }}
                        placeholder="Company / Department"
                      />
                      <TextInput
                        style={styles.inputField}
                        value={it.period}
                        onChangeText={(val) => {
                          const updated = [...(resumeData.internships || [])];
                          updated[idx].period = val;
                          handleUpdateResumeData({ internships: updated });
                        }}
                        placeholder="Period / Duration"
                      />
                      <TextInput
                        style={[styles.inputField, styles.textAreaField]}
                        multiline
                        value={(it.bullets || []).join('\n')}
                        onChangeText={(val) => {
                          const updated = [...(resumeData.internships || [])];
                          updated[idx].bullets = val.split('\n').filter(Boolean);
                          handleUpdateResumeData({ internships: updated });
                        }}
                        placeholder="Bullet points (1 per line)"
                      />
                    </View>
                  ))}

                  <ZoomCard scaleTo={1.04} onPress={handleAddInternship}>
                    <View style={styles.addItemCtaBtn}>
                      <MaterialIcons name="add-circle-outline" size={18} color={Colors.primary} />
                      <Text style={styles.addItemCtaText}>+ Add Internship</Text>
                    </View>
                  </ZoomCard>
                </View>
              )}

              {/* 7. LANGUAGES */}
              {activeEditorSection === 'languages' && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Languages & Spoken Fluency</Text>
                  <Text style={styles.formCardSub}>Add languages with proficiency level and rating dots (1 to 5).</Text>

                  <View style={styles.addRowInline}>
                    <TextInput
                      style={[styles.inputField, { flex: 2, marginBottom: 0 }]}
                      placeholder="Language (e.g. English)"
                      value={newLangName}
                      onChangeText={setNewLangName}
                    />
                    <TextInput
                      style={[styles.inputField, { flex: 1.5, marginBottom: 0 }]}
                      placeholder="Level (e.g. Fluent)"
                      value={newLangLevel}
                      onChangeText={setNewLangLevel}
                    />
                    <TextInput
                      style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
                      placeholder="Dots (1-5)"
                      value={newLangDots}
                      onChangeText={setNewLangDots}
                      keyboardType="numeric"
                    />
                    <ZoomCard scaleTo={1.08} onPress={handleAddLanguage}>
                      <View style={styles.addBtnSmall}>
                        <Text style={styles.addBtnSmallText}>Add</Text>
                      </View>
                    </ZoomCard>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    {(resumeData.languages || []).map((l, idx) => (
                      <View key={l.id || idx} style={styles.itemRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemRowTitle}>{l.name}</Text>
                          <Text style={styles.itemRowSub}>{l.level || 'Fluent'} • {l.dots || 5}/5 Dots</Text>
                        </View>
                        <ZoomCard scaleTo={1.15} onPress={() => handleRemoveLanguage(l.id || l.name)}>
                          <MaterialIcons name="delete-outline" size={20} color={ArchivalColors.diffRemoveText} />
                        </ZoomCard>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 8. REFERENCES */}
              {activeEditorSection === 'references' && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Professional References & Mentors</Text>
                  <Text style={styles.formCardSub}>Key references with designation, phone, and email.</Text>

                  <TextInput
                    style={styles.inputField}
                    placeholder="Reference Full Name"
                    value={newRefName}
                    onChangeText={setNewRefName}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Company & Designation (e.g. Wardiere Inc. / CTO)"
                    value={newRefCompany}
                    onChangeText={setNewRefCompany}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Phone Number"
                    value={newRefPhone}
                    onChangeText={setNewRefPhone}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Email Address"
                    value={newRefEmail}
                    onChangeText={setNewRefEmail}
                  />
                  <ZoomCard scaleTo={1.04} onPress={handleAddReference}>
                    <View style={styles.addItemCtaBtn}>
                      <MaterialIcons name="add-circle-outline" size={18} color={Colors.primary} />
                      <Text style={styles.addItemCtaText}>+ Add Reference</Text>
                    </View>
                  </ZoomCard>

                  <View style={{ marginTop: 12 }}>
                    {(resumeData.references || []).map((r, idx) => (
                      <View key={r.id || idx} style={styles.itemRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemRowTitle}>{r.name}</Text>
                          <Text style={styles.itemRowSub}>{r.company}</Text>
                          {Boolean(r.phone) && <Text style={styles.itemRowSub}>📞 {r.phone}</Text>}
                          {Boolean(r.email) && <Text style={styles.itemRowSub}>✉️ {r.email}</Text>}
                        </View>
                        <ZoomCard scaleTo={1.15} onPress={() => handleRemoveReference(r.id || r.name)}>
                          <MaterialIcons name="delete-outline" size={20} color={ArchivalColors.diffRemoveText} />
                        </ZoomCard>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 9. PROJECTS */}
              {activeEditorSection === 'projects' && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Technical & Academic Projects</Text>
                  <Text style={styles.formCardSub}>Software builds, security audits, and course capstones.</Text>
                  {(resumeData.projects || []).map((proj, idx) => (
                    <View key={proj.id} style={styles.nestedEditCard}>
                      <View style={styles.nestedCardHeader}>
                        <Text style={styles.nestedEditTag}>Project #{idx + 1}</Text>
                        <ZoomCard scaleTo={1.15} onPress={() => handleRemoveProject(proj.id)}>
                          <MaterialIcons name="delete-outline" size={20} color={ArchivalColors.diffRemoveText} />
                        </ZoomCard>
                      </View>
                      <TextInput
                        style={styles.inputField}
                        value={proj.title}
                        onChangeText={(val) => {
                          const updated = [...resumeData.projects];
                          updated[idx].title = val;
                          handleUpdateResumeData({ projects: updated });
                        }}
                        placeholder="Project Title"
                      />
                      <TextInput
                        style={styles.inputField}
                        value={proj.tech}
                        onChangeText={(val) => {
                          const updated = [...resumeData.projects];
                          updated[idx].tech = val;
                          handleUpdateResumeData({ projects: updated });
                        }}
                        placeholder="Tech Stack"
                      />
                      <TextInput
                        style={[styles.inputField, styles.textAreaField]}
                        multiline
                        value={proj.summary}
                        onChangeText={(val) => {
                          const updated = [...resumeData.projects];
                          updated[idx].summary = val;
                          handleUpdateResumeData({ projects: updated });
                        }}
                        placeholder="Project Description"
                      />
                    </View>
                  ))}

                  <ZoomCard scaleTo={1.04} onPress={handleAddProject}>
                    <View style={styles.addItemCtaBtn}>
                      <MaterialIcons name="add-circle-outline" size={18} color={Colors.primary} />
                      <Text style={styles.addItemCtaText}>+ Add Technical Project</Text>
                    </View>
                  </ZoomCard>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* ============================================================= */}
        {/* TAB 4: AI AUDIT / ATS PROOFREADER                             */}
        {/* ============================================================= */}
        {activeTab === 'ai' && (
          <ScrollView
            style={styles.tabContentScroll}
            contentContainerStyle={styles.aiAuditContainer}
            showsVerticalScrollIndicator={false}
          >
            <ZoomCard scaleTo={1.02}>
              <View style={styles.aiScorecard}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNumber}>88</Text>
                  <Text style={styles.scoreOutOf}>/ 100</Text>
                </View>
                <View style={styles.aiScorecardRight}>
                  <Text style={styles.aiScoreHeading}>High ATS Compatibility</Text>
                  <Text style={styles.aiScoreSub}>Institutional audit confirms high readability across campus recruitment filters.</Text>
                  <View style={styles.miniScoreBarRow}>
                    <Text style={styles.miniScoreLabel}>Action Verbs</Text>
                    <View style={styles.miniScoreTrack}><View style={[styles.miniScoreFill, { width: '92%' }]} /></View>
                    <Text style={styles.miniScoreValue}>92%</Text>
                  </View>
                  <View style={styles.miniScoreBarRow}>
                    <Text style={styles.miniScoreLabel}>Metrics Scope</Text>
                    <View style={styles.miniScoreTrack}><View style={[styles.miniScoreFill, { width: '85%' }]} /></View>
                    <Text style={styles.miniScoreValue}>85%</Text>
                  </View>
                  <View style={styles.miniScoreBarRow}>
                    <Text style={styles.miniScoreLabel}>ATS Layout</Text>
                    <View style={styles.miniScoreTrack}><View style={[styles.miniScoreFill, { width: '98%' }]} /></View>
                    <Text style={styles.miniScoreValue}>98%</Text>
                  </View>
                </View>
              </View>
            </ZoomCard>

            <View style={styles.aiSectionTitleRow}>
              <Text style={styles.sectionHeading}>Intelligent Bullet Improvements</Text>
              <Text style={styles.aiAppliedNotice}>{appliedCount} of {aiSuggestions.length} Applied</Text>
            </View>

            {aiSuggestions.map((sug) => (
              <ZoomCard key={sug.id} scaleTo={1.02}>
                <View style={styles.aiSuggestionCard}>
                  <View style={styles.aiCategoryTag}>
                    <MaterialIcons name="auto-fix-high" size={14} color={ArchivalColors.spruce} />
                    <Text style={styles.aiCategoryTagText}>{sug.category}</Text>
                  </View>
                  <Text style={styles.aiSugTitle}>{sug.title}</Text>

                  <View style={styles.diffContainer}>
                    <View style={styles.diffRemoveBlock}>
                      <Text style={styles.diffRemoveLabel}>Original Draft:</Text>
                      <Text style={styles.diffRemoveContent}>{sug.original}</Text>
                    </View>
                    <View style={styles.diffAddBlock}>
                      <Text style={styles.diffAddLabel}>AI Quantified Suggestion:</Text>
                      <Text style={styles.diffAddContent}>{sug.suggested}</Text>
                    </View>
                  </View>

                  <Text style={styles.diffReasonText}>💡 {sug.reason}</Text>

                  <View style={styles.aiSugActions}>
                    {sug.applied ? (
                      <View style={styles.appliedPill}>
                        <MaterialIcons name="check-circle" size={16} color={Colors.primary} />
                        <Text style={styles.appliedPillText}>Applied to Draft</Text>
                      </View>
                    ) : (
                      <ZoomCard scaleTo={1.05} onPress={() => handleApplyAiSuggestion(sug)}>
                        <View style={styles.applySugBtn}>
                          <MaterialIcons name="done" size={16} color="#ffffff" />
                          <Text style={styles.applySugBtnText}>Apply AI Improvement</Text>
                        </View>
                      </ZoomCard>
                    )}
                  </View>
                </View>
              </ZoomCard>
            ))}
          </ScrollView>
        )}

        {/* ============================================================= */}
        {/* TAB 5: REVIEW — Clean Read-Only Resume (No Edit Overlays)      */}
        {/* ============================================================= */}
        {activeTab === 'review' && (
          <View style={styles.previewContainer}>
            {/* Review Header Banner */}
            <View style={styles.reviewHeaderBanner}>
              <View style={styles.reviewHeaderLeft}>
                <MaterialIcons name="rate-review" size={18} color={ArchivalColors.spruce} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.reviewHeaderTitle}>Final Resume Review</Text>
                  <Text style={styles.reviewHeaderSub} numberOfLines={1}>Clean view without edit controls · {selectedTemplate.name}</Text>
                </View>
              </View>
              <View style={styles.reviewHeaderRightActions}>
                <ZoomCard scaleTo={1.06} onPress={() => handleOpenInDrive()} disabled={isExporting}>
                  <View style={styles.reviewDriveBtn}>
                    <MaterialIcons name="add-to-drive" size={14} color="#ffffff" />
                    <Text style={styles.reviewDriveBtnText}>Drive</Text>
                  </View>
                </ZoomCard>
                <ZoomCard scaleTo={1.06} onPress={handleExportPdf} disabled={isExporting}>
                  <View style={styles.reviewExportBtn}>
                    {isExporting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <MaterialIcons name="picture-as-pdf" size={14} color="#ffffff" />
                    )}
                    <Text style={styles.reviewExportBtnText}>Export PDF</Text>
                  </View>
                </ZoomCard>
              </View>
            </View>

            {/* Clean A4 Paper (No Edit Overlays) */}
            <ScrollView
              style={styles.paperScrollView}
              contentContainerStyle={[styles.paperScrollContent, { paddingBottom: 28 }]}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.paperWrapper}>
                {/* ---- NAVY LEDGER CLEAN ---- */}
                {activeTemplateId === 'navy_ledger' && (
                  <View style={styles.navyA4Sheet}>
                    <View style={styles.navySidebar}>
                      <View style={styles.navyAvatarBox}>
                        <Image source={{ uri: resumeData.personal.avatarUrl }} style={styles.navyAvatarImg} resizeMode="cover" />
                      </View>
                      <View style={styles.reviewCleanSection}>
                        <Text style={styles.navySideHeader}>👤 ABOUT ME</Text>
                        <Text style={styles.navySideText}>{resumeData.summary}</Text>
                      </View>
                      <View style={styles.reviewCleanSection}>
                        <Text style={[styles.navySideHeader, { marginTop: 10 }]}>📞 CONTACT</Text>
                        <Text style={styles.navySideText}>📞 {resumeData.personal.phone || '+91 9797310798'}</Text>
                        <Text style={styles.navySideText}>✉️ {resumeData.personal.email || 'shahzeb@rimt.ac.in'}</Text>
                        <Text style={styles.navySideText}>📍 {resumeData.personal.location || 'Punjab, India'}</Text>
                        {Boolean(resumeData.personal.website) && (
                          <Text style={styles.navySideText}>🌐 {resumeData.personal.website}</Text>
                        )}
                      </View>
                      <View style={styles.reviewCleanSection}>
                        <Text style={[styles.navySideHeader, { marginTop: 10 }]}>⚙️ SKILLS</Text>
                        {(resumeData.skills || []).slice(0, 5).map((s, idx) => (
                          <View key={s.id || idx} style={{ marginBottom: 5 }}>
                            <Text style={styles.navySkillText}>{s.name || s}</Text>
                            <View style={styles.navyBarTrack}>
                              <View style={[styles.navyBarFill, { width: `${s.pct || 88}%` }]} />
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                    <View style={styles.navyMainCol}>
                      <View>
                        <Text style={styles.navyName}>{resumeData.personal.name || 'SOHEL'}</Text>
                        <Text style={styles.navyHeadline}>{resumeData.personal.headline || 'Full stack developer'}</Text>
                        <View style={styles.navyMetaStrip}>
                          <Text style={styles.navyMetaItem}>📅 {resumeData.personal.dob || '01 Jan 2004'}</Text>
                          <Text style={styles.navyMetaItem}>📍 {resumeData.personal.location || 'Punjab, India'}</Text>
                        </View>
                      </View>
                      <View style={styles.reviewCleanSection}>
                        <Text style={styles.navySectionTitle}>🎓 EDUCATION</Text>
                        {(resumeData.education || []).map((edu) => (
                          <View key={edu.id} style={styles.navyTimelineNode}>
                            <Text style={styles.navyNodeTitle}>{edu.degree}</Text>
                            <Text style={styles.navyNodeInst}>{edu.institute} ({edu.period})</Text>
                            {Boolean(edu.score) && (
                              <View style={styles.navyScoreBadgeRow}>
                                <View style={styles.navyScoreBadge}>
                                  <Text style={styles.navyScoreBadgeText}>{edu.score}</Text>
                                </View>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                      <View style={styles.reviewCleanSection}>
                        <Text style={[styles.navySectionTitle, { marginTop: 10 }]}>💼 EXPERIENCE</Text>
                        {(resumeData.experience || []).map((exp) => (
                          <View key={exp.id} style={styles.navyTimelineNode}>
                            <Text style={styles.navyNodeTitle}>{exp.role}</Text>
                            <Text style={styles.navyNodeInst}>{exp.organization} | {exp.period}</Text>
                            {(exp.bullets || []).map((b, bIdx) => (
                              <Text key={bIdx} style={styles.navyNodeBullet}>• {b}</Text>
                            ))}
                          </View>
                        ))}
                      </View>
                      {Boolean(resumeData.personal.declaration) && (
                        <View style={styles.navyDeclarationBox}>
                          <Text style={styles.navyDeclHeader}>DECLARATION</Text>
                          <Text style={styles.navyDeclText}>{resumeData.personal.declaration}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* ---- RICHARD SANCHEZ CLEAN ---- */}
                {activeTemplateId === 'richard_sanchez' && (
                  <View style={styles.sanchezSheet}>
                    <View style={styles.sanchezHeader}>
                      <View style={styles.sanchezAvatarWrap}>
                        <Image
                          source={{ uri: resumeData.personal.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400' }}
                          style={styles.sanchezAvatarImg}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sanchezName}>{resumeData.personal.name || 'RICHARD SANCHEZ'}</Text>
                        <Text style={styles.sanchezHeadline}>{resumeData.personal.headline || 'MARKETING MANAGER'}</Text>
                      </View>
                    </View>

                    <View style={styles.sanchezBody}>
                      {/* Left Light-Grey Column */}
                      <View style={styles.sanchezLeftCol}>
                        {/* CONTACT */}
                        <View style={styles.reviewCleanSection}>
                          <View style={styles.sanchezSectionHeader}>
                            <Text style={styles.sanchezSectionTitle}>CONTACT</Text>
                          </View>
                          <Text style={styles.sanchezContactItem}>📞 {resumeData.personal.phone || '+123-456-7890'}</Text>
                          <Text style={styles.sanchezContactItem}>✉️ {resumeData.personal.email || 'hello@reallygreatsite.com'}</Text>
                          <Text style={styles.sanchezContactItem}>📍 {resumeData.personal.location || '123 Anywhere St., Any City'}</Text>
                          {Boolean(resumeData.personal.website) && (
                            <Text style={styles.sanchezContactItem}>🌐 {resumeData.personal.website}</Text>
                          )}
                        </View>

                        {/* SKILLS */}
                        <View style={styles.reviewCleanSection}>
                          <View style={styles.sanchezSectionHeader}>
                            <Text style={styles.sanchezSectionTitle}>SKILLS</Text>
                          </View>
                          {(resumeData.skills || []).map((sk, idx) => (
                            <Text key={sk.id || idx} style={styles.sanchezBulletItem}>
                              • {sk.name || sk}
                            </Text>
                          ))}
                        </View>

                        {/* LANGUAGES */}
                        <View style={styles.reviewCleanSection}>
                          <View style={styles.sanchezSectionHeader}>
                            <Text style={styles.sanchezSectionTitle}>LANGUAGES</Text>
                          </View>
                          {(resumeData.languages || []).map((l, idx) => (
                            <Text key={l.id || idx} style={styles.sanchezBulletItem}>
                              • {l.name} ({l.level || 'Fluent'})
                            </Text>
                          ))}
                        </View>

                        {/* REFERENCES */}
                        {Boolean((resumeData.references || []).length) && (
                          <View style={styles.reviewCleanSection}>
                            <View style={styles.sanchezSectionHeader}>
                              <Text style={styles.sanchezSectionTitle}>REFERENCE</Text>
                            </View>
                            {(resumeData.references || []).slice(0, 2).map((r, idx) => (
                              <View key={r.id || idx} style={{ marginBottom: 6 }}>
                                <Text style={styles.sanchezRefName}>{r.name}</Text>
                                <Text style={styles.sanchezRefSub}>{r.company}</Text>
                                {Boolean(r.phone) && <Text style={styles.sanchezRefSub}>Phone: {r.phone}</Text>}
                                {Boolean(r.email) && <Text style={styles.sanchezRefSub}>Email: {r.email}</Text>}
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Right White Column */}
                      <View style={styles.sanchezRightCol}>
                        {/* PROFILE */}
                        <View style={styles.reviewCleanSection}>
                          <View style={styles.sanchezRightHeader}>
                            <View style={styles.sanchezIconCircle}><Text style={styles.sanchezIconText}>👤</Text></View>
                            <Text style={styles.sanchezRightTitle}>PROFILE</Text>
                          </View>
                          <Text style={styles.sanchezProfileText}>{resumeData.summary}</Text>
                        </View>

                        {/* WORK EXPERIENCE */}
                        <View style={styles.reviewCleanSection}>
                          <View style={styles.sanchezRightHeader}>
                            <View style={styles.sanchezIconCircle}><Text style={styles.sanchezIconText}>💼</Text></View>
                            <Text style={styles.sanchezRightTitle}>WORK EXPERIENCE</Text>
                          </View>
                          <View style={styles.sanchezTimelineWrap}>
                            {(resumeData.experience || []).map((exp) => (
                              <View key={exp.id} style={styles.sanchezTimelineNode}>
                                <View style={styles.sanchezNodeHeader}>
                                  <Text style={styles.sanchezNodeCompany}>{exp.organization}</Text>
                                  <Text style={styles.sanchezNodePeriod}>{exp.period}</Text>
                                </View>
                                <Text style={styles.sanchezNodeRole}>{exp.role}</Text>
                                {(exp.bullets || []).map((b, bIdx) => (
                                  <Text key={bIdx} style={styles.sanchezNodeBullet}>• {b}</Text>
                                ))}
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* EDUCATION */}
                        <View style={styles.reviewCleanSection}>
                          <View style={styles.sanchezRightHeader}>
                            <View style={styles.sanchezIconCircle}><Text style={styles.sanchezIconText}>🎓</Text></View>
                            <Text style={styles.sanchezRightTitle}>EDUCATION</Text>
                          </View>
                          <View style={styles.sanchezTimelineWrap}>
                            {(resumeData.education || []).map((edu) => (
                              <View key={edu.id} style={styles.sanchezTimelineNode}>
                                <View style={styles.sanchezNodeHeader}>
                                  <Text style={styles.sanchezNodeCompany}>{edu.degree}</Text>
                                  <Text style={styles.sanchezNodePeriod}>{edu.period}</Text>
                                </View>
                                <Text style={styles.sanchezNodeRole}>{edu.institute}</Text>
                                {Boolean(edu.score) && <Text style={styles.sanchezNodeScore}>{edu.score}</Text>}
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* ---- HERMAN WALTON CLEAN ---- */}
                {activeTemplateId === 'herman_walton' && (
                  <View style={styles.waltonSheet}>
                    {/* 4 Corner Crop Marks */}
                    <View style={styles.waltonCornerTL} />
                    <View style={styles.waltonCornerTR} />
                    <View style={styles.waltonCornerBL} />
                    <View style={styles.waltonCornerBR} />

                    {/* Header Row with Profile Photo */}
                    <View style={styles.waltonHeaderRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.waltonName}>{resumeData.personal.name || 'HERMAN WALTON'}</Text>
                        <Text style={styles.waltonTitle}>{resumeData.personal.headline || 'FINANCIAL ANALYST'}</Text>
                        <Text style={styles.waltonContactLine}>
                          {[
                            resumeData.personal.phone ? `📞 ${resumeData.personal.phone}` : null,
                            resumeData.personal.email ? `✉️ ${resumeData.personal.email}` : null,
                            resumeData.personal.location ? `📍 ${resumeData.personal.location}` : null,
                          ].filter(Boolean).join('  ·  ') || `${resumeData.personal.location || 'New York, USA'} | ${resumeData.personal.phone || '(412) 479-6342'} | ${resumeData.personal.email || 'example@gmail.com'}`}
                        </Text>
                      </View>

                      {/* Right Photo Box */}
                      <View style={styles.waltonPhotoBox}>
                        <Image
                          source={{ uri: resumeData.personal.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400' }}
                          style={styles.waltonPhotoImg}
                          resizeMode="cover"
                        />
                      </View>
                    </View>

                    {/* SUMMARY */}
                    <View style={styles.reviewCleanSection}>
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>SUMMARY</Text>
                      </View>
                      <Text style={styles.waltonText}>{resumeData.summary}</Text>
                    </View>

                    {/* PROFESSIONAL EXPERIENCE */}
                    <View style={styles.reviewCleanSection}>
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>PROFESSIONAL EXPERIENCE</Text>
                      </View>
                      {(resumeData.experience || []).map((exp) => (
                        <View key={exp.id} style={{ marginBottom: 6 }}>
                          <View style={styles.waltonRow}>
                            <Text style={styles.waltonRoleCompany}>{exp.role}, {exp.organization}</Text>
                            <Text style={styles.waltonDate}>{exp.period}</Text>
                          </View>
                          {(exp.bullets || []).map((b, bIdx) => (
                            <Text key={bIdx} style={styles.waltonBullet}>• {b}</Text>
                          ))}
                        </View>
                      ))}
                    </View>

                    {/* EDUCATION */}
                    <View style={styles.reviewCleanSection}>
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>EDUCATION</Text>
                      </View>
                      {(resumeData.education || []).map((edu) => (
                        <View key={edu.id} style={{ marginBottom: 6 }}>
                          <View style={styles.waltonRow}>
                            <Text style={styles.waltonRoleCompany}>{edu.degree}</Text>
                            <Text style={styles.waltonDate}>{edu.period}</Text>
                          </View>
                          <Text style={styles.waltonInst}>{edu.institute}{edu.score ? ` · ${edu.score}` : ''}</Text>
                        </View>
                      ))}
                    </View>

                    {/* TECHNICAL SKILLS */}
                    <View style={styles.reviewCleanSection}>
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>TECHNICAL SKILLS</Text>
                      </View>
                      <View style={styles.waltonSkillsGrid}>
                        {(resumeData.skills || []).map((s, idx) => (
                          <View key={s.id || idx} style={styles.waltonSkillGridItem}>
                            <Text style={styles.waltonSkillText}>{s.name || s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* ADDITIONAL INFORMATION */}
                    <View style={styles.reviewCleanSection}>
                      <View style={styles.waltonSectionHeader}>
                        <Text style={styles.waltonSectionTitle}>ADDITIONAL INFORMATION</Text>
                      </View>
                      <Text style={styles.waltonBullet}>• Languages: {(resumeData.languages || []).map((l) => l.name).join(', ')}</Text>
                      {Boolean((resumeData.certifications || []).length) && (
                        <Text style={styles.waltonBullet}>• Certificates: {(resumeData.certifications || []).map((c) => c.title).join(', ')}</Text>
                      )}
                      <Text style={styles.waltonBullet}>• Awards/Activities: High Academic Honor & Departmental Commendation</Text>
                    </View>
                  </View>
                )}

                {/* ---- SUNNY SINGH CLEAN ---- */}
                {activeTemplateId === 'sunny_singh' && (
                  <View style={styles.singhSheet}>
                    <View style={styles.singhHeader}>
                      <View style={styles.singhAvatarWrap}>
                        <Image source={{ uri: resumeData.personal.avatarUrl }} style={styles.singhAvatarImg} resizeMode="cover" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.singhName}>{resumeData.personal.name || 'SUNNY SINGH'}</Text>
                        <Text style={styles.singhRole}>{resumeData.personal.headline || 'Technical Recruiter'}</Text>
                        <Text style={styles.singhSummaryText} numberOfLines={4}>{resumeData.summary}</Text>
                      </View>
                    </View>
                    <View style={styles.singhCrimsonBanner}>
                      <Text style={styles.singhBannerText}>📞 {resumeData.personal.phone || '+91-9876543210'}</Text>
                      <Text style={styles.singhBannerText}>✉️ {resumeData.personal.email || 'singhsun@gmail.com'}</Text>
                      <Text style={styles.singhBannerText}>📍 {resumeData.personal.location || 'Indore, India'}</Text>
                    </View>
                    <View style={styles.singhBody}>
                      <View style={styles.singhLeftCol}>
                        <View style={styles.reviewCleanSection}>
                          <Text style={styles.singhSectionHeading}>EMPLOYMENT HISTORY</Text>
                          {(resumeData.experience || []).map((exp) => (
                            <View key={exp.id} style={{ marginBottom: 6 }}>
                              <Text style={styles.singhJobRole}>{exp.role}</Text>
                              <Text style={styles.singhJobCompany}>{exp.organization}</Text>
                              <Text style={styles.singhJobMeta}>{exp.period} | {exp.location || resumeData.personal.location}</Text>
                              {(exp.bullets || []).map((b, bIdx) => (
                                <Text key={bIdx} style={styles.singhJobBullet}>• {b}</Text>
                              ))}
                            </View>
                          ))}
                        </View>
                        <View style={styles.reviewCleanSection}>
                          <Text style={styles.singhSectionHeading}>INTERNSHIPS</Text>
                          {(resumeData.internships || []).map((it) => (
                            <View key={it.id} style={{ marginBottom: 6 }}>
                              <Text style={styles.singhJobRole}>{it.role}</Text>
                              <Text style={styles.singhJobCompany}>{it.organization}</Text>
                              <Text style={styles.singhJobMeta}>{it.period} | {it.location || 'Indore'}</Text>
                              {(it.bullets || []).map((b, bIdx) => (
                                <Text key={bIdx} style={styles.singhJobBullet}>• {b}</Text>
                              ))}
                            </View>
                          ))}
                        </View>
                      </View>
                      <View style={styles.singhRightCol}>
                        <View style={styles.reviewCleanSection}>
                          <Text style={styles.singhSectionHeading}>EDUCATION</Text>
                          {(resumeData.education || []).map((edu) => (
                            <View key={edu.id} style={{ marginBottom: 6 }}>
                              <Text style={styles.singhJobRole}>{edu.degree}</Text>
                              <Text style={styles.singhJobCompany}>{edu.institute}</Text>
                              <Text style={styles.singhJobMeta}>{edu.period}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.reviewCleanSection}>
                          <Text style={styles.singhSectionHeading}>SKILLS</Text>
                          {(resumeData.skills || []).map((sk, idx) => (
                            <View key={sk.id || idx} style={styles.singhSkillPill}>
                              <Text style={styles.singhSkillPillText}>{sk.name || sk}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.reviewCleanSection}>
                          <Text style={styles.singhSectionHeading}>LANGUAGES</Text>
                          {(resumeData.languages || []).map((l, idx) => {
                            const count = l.dots || (l.pct ? Math.round(l.pct / 20) : 4);
                            return (
                              <View key={l.id || idx} style={styles.singhLangRow}>
                                <Text style={styles.singhLangName}>{l.name}</Text>
                                <View style={styles.singhDotsRow}>
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <View
                                      key={i}
                                      style={[
                                        styles.singhDot,
                                        i <= count ? styles.singhDotActive : styles.singhDotInactive,
                                      ]}
                                    />
                                  ))}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* QUICK SECTION EDIT MODAL (From Preview Tap) */}
      <Modal
        visible={Boolean(quickEditSection)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setQuickEditSection(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quickEditModalCard}>
            <View style={styles.quickEditHeader}>
              <Text style={styles.quickEditTitle}>
                {quickEditSection === 'summary' && '✏️ Customize About Me / Bio'}
                {quickEditSection === 'personal' && '✏️ Customize Personal Header'}
                {quickEditSection === 'contact' && '✏️ Customize Contact Details'}
                {quickEditSection === 'skills' && '✏️ Customize Key Skills'}
                {quickEditSection === 'education' && '✏️ Customize Education Record'}
                {quickEditSection === 'experience' && '✏️ Customize Experience'}
                {quickEditSection === 'internships' && '✏️ Customize Internships'}
                {quickEditSection === 'languages' && '✏️ Customize Languages'}
                {quickEditSection === 'references' && '✏️ Customize References'}
              </Text>
              <TouchableOpacity onPress={() => setQuickEditSection(null)}>
                <MaterialIcons name="close" size={22} color={ArchivalColors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380, width: '100%' }}>
              {/* Summary / About Me Edit */}
              {quickEditSection === 'summary' && (
                <View>
                  <Text style={styles.fieldLabel}>About Me / Profile Summary</Text>
                  <TextInput
                    style={[styles.inputField, styles.textAreaField, { minHeight: 140 }]}
                    multiline
                    value={resumeData.summary}
                    onChangeText={(val) => handleUpdateResumeData({ summary: val })}
                    placeholder="Write your custom bio..."
                  />
                </View>
              )}

              {/* Personal Header Edit */}
              {quickEditSection === 'personal' && (
                <View>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.name}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, name: val } }))}
                  />
                  <Text style={styles.fieldLabel}>Headline / Role</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.headline}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, headline: val } }))}
                  />
                  <Text style={styles.fieldLabel}>Date of Birth</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.dob}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, dob: val } }))}
                  />
                  <Text style={styles.fieldLabel}>Location</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.location}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, location: val } }))}
                  />
                </View>
              )}

              {/* Contact Edit */}
              {quickEditSection === 'contact' && (
                <View>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.phone}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, phone: val } }))}
                  />
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.email}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, email: val } }))}
                  />
                  <Text style={styles.fieldLabel}>Location</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.location}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, location: val } }))}
                  />
                  <Text style={styles.fieldLabel}>Website</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.website}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, website: val } }))}
                  />
                  <Text style={styles.fieldLabel}>LinkedIn</Text>
                  <TextInput
                    style={styles.inputField}
                    value={resumeData.personal.linkedin}
                    onChangeText={(val) => handleUpdateResumeData((p) => ({ ...p, personal: { ...p.personal, linkedin: val } }))}
                  />
                </View>
              )}

              {/* Skills Quick Edit */}
              {quickEditSection === 'skills' && (
                <View>
                  <View style={styles.addRowInline}>
                    <TextInput
                      style={[styles.inputField, { flex: 2, marginBottom: 0 }]}
                      placeholder="Skill name"
                      value={newSkillName}
                      onChangeText={setNewSkillName}
                    />
                    <TextInput
                      style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
                      placeholder="%"
                      value={newSkillPct}
                      onChangeText={setNewSkillPct}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={handleAddSkill} style={styles.addBtnSmall}>
                      <Text style={styles.addBtnSmallText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    {(resumeData.skills || []).map((s, idx) => (
                      <View key={s.id || idx} style={styles.itemRowCard}>
                        <Text style={styles.itemRowTitle}>{s.name || s} ({s.pct || 90}%)</Text>
                        <TouchableOpacity onPress={() => handleRemoveSkill(s.id || s.name || s)}>
                          <MaterialIcons name="delete" size={18} color={ArchivalColors.diffRemoveText} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Education Quick Edit */}
              {quickEditSection === 'education' && (
                <View>
                  {(resumeData.education || []).map((edu, idx) => (
                    <View key={edu.id} style={styles.nestedEditCard}>
                      <TextInput
                        style={styles.inputField}
                        value={edu.degree}
                        placeholder="Degree / Course"
                        onChangeText={(val) => {
                          const updated = [...resumeData.education];
                          updated[idx].degree = val;
                          handleUpdateResumeData({ education: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={edu.institute}
                        placeholder="Institute"
                        onChangeText={(val) => {
                          const updated = [...resumeData.education];
                          updated[idx].institute = val;
                          handleUpdateResumeData({ education: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={edu.period}
                        placeholder="Period"
                        onChangeText={(val) => {
                          const updated = [...resumeData.education];
                          updated[idx].period = val;
                          handleUpdateResumeData({ education: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={edu.score}
                        placeholder="Score / CGPA"
                        onChangeText={(val) => {
                          const updated = [...resumeData.education];
                          updated[idx].score = val;
                          handleUpdateResumeData({ education: updated });
                        }}
                      />
                    </View>
                  ))}
                  <TouchableOpacity onPress={handleAddEducation} style={styles.addItemCtaBtn}>
                    <Text style={styles.addItemCtaText}>+ Add Education Degree</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Experience Quick Edit */}
              {quickEditSection === 'experience' && (
                <View>
                  {(resumeData.experience || []).map((exp, idx) => (
                    <View key={exp.id} style={styles.nestedEditCard}>
                      <TextInput
                        style={styles.inputField}
                        value={exp.role}
                        placeholder="Job Title"
                        onChangeText={(val) => {
                          const updated = [...resumeData.experience];
                          updated[idx].role = val;
                          handleUpdateResumeData({ experience: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={exp.organization}
                        placeholder="Company"
                        onChangeText={(val) => {
                          const updated = [...resumeData.experience];
                          updated[idx].organization = val;
                          handleUpdateResumeData({ experience: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={exp.period}
                        placeholder="Period"
                        onChangeText={(val) => {
                          const updated = [...resumeData.experience];
                          updated[idx].period = val;
                          handleUpdateResumeData({ experience: updated });
                        }}
                      />
                      <TextInput
                        style={[styles.inputField, styles.textAreaField]}
                        multiline
                        value={(exp.bullets || []).join('\n')}
                        placeholder="Bullets (1 per line)"
                        onChangeText={(val) => {
                          const updated = [...resumeData.experience];
                          updated[idx].bullets = val.split('\n').filter(Boolean);
                          handleUpdateResumeData({ experience: updated });
                        }}
                      />
                    </View>
                  ))}
                  <TouchableOpacity onPress={handleAddExperience} style={styles.addItemCtaBtn}>
                    <Text style={styles.addItemCtaText}>+ Add Work Experience</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Internships Quick Edit */}
              {quickEditSection === 'internships' && (
                <View>
                  {(resumeData.internships || []).map((it, idx) => (
                    <View key={it.id} style={styles.nestedEditCard}>
                      <TextInput
                        style={styles.inputField}
                        value={it.role}
                        placeholder="Internship Title"
                        onChangeText={(val) => {
                          const updated = [...(resumeData.internships || [])];
                          updated[idx].role = val;
                          handleUpdateResumeData({ internships: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={it.organization}
                        placeholder="Company"
                        onChangeText={(val) => {
                          const updated = [...(resumeData.internships || [])];
                          updated[idx].organization = val;
                          handleUpdateResumeData({ internships: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={it.period}
                        placeholder="Period"
                        onChangeText={(val) => {
                          const updated = [...(resumeData.internships || [])];
                          updated[idx].period = val;
                          handleUpdateResumeData({ internships: updated });
                        }}
                      />
                      <TextInput
                        style={[styles.inputField, styles.textAreaField]}
                        multiline
                        value={(it.bullets || []).join('\n')}
                        placeholder="Bullets (1 per line)"
                        onChangeText={(val) => {
                          const updated = [...(resumeData.internships || [])];
                          updated[idx].bullets = val.split('\n').filter(Boolean);
                          handleUpdateResumeData({ internships: updated });
                        }}
                      />
                    </View>
                  ))}
                  <TouchableOpacity onPress={handleAddInternship} style={styles.addItemCtaBtn}>
                    <Text style={styles.addItemCtaText}>+ Add Internship</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Languages Quick Edit */}
              {quickEditSection === 'languages' && (
                <View>
                  <View style={styles.addRowInline}>
                    <TextInput
                      style={[styles.inputField, { flex: 2, marginBottom: 0 }]}
                      placeholder="Language"
                      value={newLangName}
                      onChangeText={setNewLangName}
                    />
                    <TextInput
                      style={[styles.inputField, { flex: 1.5, marginBottom: 0 }]}
                      placeholder="Level"
                      value={newLangLevel}
                      onChangeText={setNewLangLevel}
                    />
                    <TouchableOpacity onPress={handleAddLanguage} style={styles.addBtnSmall}>
                      <Text style={styles.addBtnSmallText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    {(resumeData.languages || []).map((l, idx) => (
                      <View key={l.id || idx} style={styles.itemRowCard}>
                        <Text style={styles.itemRowTitle}>{l.name} ({l.level || 'Fluent'})</Text>
                        <TouchableOpacity onPress={() => handleRemoveLanguage(l.id || l.name)}>
                          <MaterialIcons name="delete" size={18} color={ArchivalColors.diffRemoveText} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* References Quick Edit */}
              {quickEditSection === 'references' && (
                <View>
                  {(resumeData.references || []).map((r, idx) => (
                    <View key={r.id || idx} style={styles.nestedEditCard}>
                      <TextInput
                        style={styles.inputField}
                        value={r.name}
                        placeholder="Reference Name"
                        onChangeText={(val) => {
                          const updated = [...(resumeData.references || [])];
                          updated[idx].name = val;
                          handleUpdateResumeData({ references: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={r.company}
                        placeholder="Company / Role"
                        onChangeText={(val) => {
                          const updated = [...(resumeData.references || [])];
                          updated[idx].company = val;
                          handleUpdateResumeData({ references: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={r.phone}
                        placeholder="Phone"
                        onChangeText={(val) => {
                          const updated = [...(resumeData.references || [])];
                          updated[idx].phone = val;
                          handleUpdateResumeData({ references: updated });
                        }}
                      />
                      <TextInput
                        style={styles.inputField}
                        value={r.email}
                        placeholder="Email"
                        onChangeText={(val) => {
                          const updated = [...(resumeData.references || [])];
                          updated[idx].email = val;
                          handleUpdateResumeData({ references: updated });
                        }}
                      />
                    </View>
                  ))}
                  <TouchableOpacity onPress={handleAddReference} style={styles.addItemCtaBtn}>
                    <Text style={styles.addItemCtaText}>+ Add Reference</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.quickEditFooter}>
              <TouchableOpacity
                onPress={() => {
                  const sec = quickEditSection;
                  setQuickEditSection(null);
                  setActiveEditorSection(sec === 'contact' ? 'personal' : sec);
                  setActiveTab('editor');
                }}
                style={styles.openFullEditorBtn}
              >
                <Text style={styles.openFullEditorBtnText}>Open in Full Editor Tab →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setQuickEditSection(null)}
                style={styles.doneBtn}
              >
                <Text style={styles.doneBtnText}>Save & Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* URL INPUT MODAL */}
      <Modal
        visible={urlModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUrlModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter Photo URL</Text>
            <Text style={styles.modalSubtitle}>Paste any public image web link. It will automatically fit the circular frame.</Text>
            <TextInput
              style={[styles.inputField, { width: '100%', marginBottom: 14 }]}
              value={tempUrlInput}
              onChangeText={setTempUrlInput}
              placeholder="https://..."
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setUrlModalVisible(false)}
                style={[styles.modalSecondaryBtn, { flex: 1 }]}
              >
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveUrlImage}
                style={[styles.modalPrimaryBtn, { flex: 1 }]}
              >
                <Text style={styles.modalPrimaryBtnText}>Apply Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EXPORT SUCCESS MODAL */}
      <Modal
        visible={Boolean(exportSuccessModal)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setExportSuccessModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="verified" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Vector PDF Generated!</Text>
            <Text style={styles.modalSubtitle}>
              Your institutional resume is compiled with 99% ATS standard layout.
            </Text>
            <View style={styles.modalButtonStack}>
              {/* Option 1: Open with Google Drive */}
              <TouchableOpacity
                onPress={() => handleOpenInDrive(exportSuccessModal?.uri)}
                style={styles.modalDriveBtn}
              >
                <MaterialIcons name="add-to-drive" size={18} color="#ffffff" />
                <Text style={styles.modalDriveBtnText}>Open with Google Drive</Text>
              </TouchableOpacity>

              {/* Option 2: Open in PDF Viewer */}
              <TouchableOpacity
                onPress={() => handleOpenPdfViewer(exportSuccessModal?.uri)}
                style={styles.modalPrimaryBtn}
              >
                <MaterialIcons name="picture-as-pdf" size={18} color="#ffffff" />
                <Text style={styles.modalPrimaryBtnText}>Open in PDF Viewer</Text>
              </TouchableOpacity>

              {/* Option 3: Share or Save PDF */}
              <TouchableOpacity
                onPress={() => handleSharePdf(exportSuccessModal?.uri)}
                style={styles.modalSecondaryBtn}
              >
                <MaterialIcons name="share" size={18} color={ArchivalColors.ink} />
                <Text style={styles.modalSecondaryBtnText}>Share / Save PDF...</Text>
              </TouchableOpacity>

              {/* Option 4: Direct Print */}
              <TouchableOpacity
                onPress={handleDirectPrint}
                style={styles.modalSecondaryBtn}
              >
                <MaterialIcons name="print" size={18} color={ArchivalColors.ink} />
                <Text style={styles.modalSecondaryBtnText}>Print Directly</Text>
              </TouchableOpacity>

              {/* Dismiss */}
              <TouchableOpacity
                onPress={() => setExportSuccessModal(null)}
                style={styles.modalDismissBtn}
              >
                <Text style={styles.modalDismissBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ArchivalColors.canvas },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: ArchivalColors.canvas },
  loadingText: { marginTop: 12, fontSize: 13, color: ArchivalColors.mutedInk, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: ArchivalColors.sheet,
    borderBottomWidth: 1,
    borderBottomColor: ArchivalColors.hairline,
  },
  headerLeft: { width: 90 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backButtonText: { fontSize: 13, fontWeight: '700', color: ArchivalColors.ink },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: ArchivalColors.ink, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 10, color: ArchivalColors.mutedInk, fontWeight: '500' },
  headerRight: { width: 90, alignItems: 'flex-end' },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(163, 19, 33, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabNavWrapper: {
    backgroundColor: ArchivalColors.sheet,
    borderBottomWidth: 1,
    borderBottomColor: ArchivalColors.hairline,
  },
  tabNavScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  tabNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: ArchivalColors.surfaceRamp,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  tabNavItemActive: {
    backgroundColor: 'rgba(163, 19, 33, 0.08)',
    borderColor: Colors.primary,
  },
  tabNavText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: ArchivalColors.mutedInk,
    letterSpacing: 0.1,
  },
  tabNavTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  aiBadge: {
    backgroundColor: ArchivalColors.hairline,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  aiBadgeActive: {
    backgroundColor: Colors.primary,
  },
  aiBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: ArchivalColors.mutedInk,
  },
  aiBadgeTextActive: {
    color: '#ffffff',
  },

  contentArea: { flex: 1 },

  // TAB 1: PREVIEW
  previewContainer: { flex: 1 },
  previewToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: ArchivalColors.sheet,
    borderBottomWidth: 1,
    borderBottomColor: ArchivalColors.hairline,
  },
  templateInfoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  accentDot: { width: 8, height: 8, borderRadius: 4 },
  templateInfoText: { fontSize: 12, fontWeight: '800', color: ArchivalColors.ink, maxWidth: 180 },
  templateAtsScore: { fontSize: 10.5, fontWeight: '700', color: '#2E7D4F' },
  toolbarRight: { flexDirection: 'row', gap: 8 },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: ArchivalColors.surfaceRamp,
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
  },
  toolBtnText: { fontSize: 11, fontWeight: '700', color: ArchivalColors.ink },

  previewTipBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(163, 19, 33, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(163, 19, 33, 0.1)',
  },
  previewTipText: { fontSize: 10, fontWeight: '600', color: Colors.primary, flex: 1 },
  openEditorMiniBtn: { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  openEditorMiniText: { color: '#ffffff', fontSize: 9.5, fontWeight: '800' },

  paperScrollView: { flex: 1 },
  paperScrollContent: { padding: 12, paddingBottom: 90, alignItems: 'center' },
  paperWrapper: { width: '100%', maxWidth: 440 },

  clickableSection: {
    padding: 2,
    borderRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // 1. Navy Executive Styles (Reference Image 1)
  navyA4Sheet: { width: '100%', flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: ArchivalColors.hairline, elevation: 3, minHeight: 680, overflow: 'hidden' },
  navySidebar: { width: '32%', backgroundColor: '#0B2545', padding: 10 },
  navyAvatarBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#ffffff',
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 8,
    position: 'relative',
    backgroundColor: '#134074',
  },
  navyAvatarImg: { width: '100%', height: '100%' },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navySideHeader: { fontSize: 8.5, fontWeight: '800', color: '#ffffff', marginBottom: 4, letterSpacing: 0.5 },
  navySideText: { fontSize: 7.5, color: '#D0DBE5', marginBottom: 4, lineHeight: 11 },
  navySkillText: { fontSize: 8, color: '#ffffff', marginBottom: 1 },
  navyBarTrack: { height: 3.5, backgroundColor: '#134074', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  navyBarFill: { height: '100%', backgroundColor: '#1D63FF' },
  navyMainCol: { width: '68%', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 12 },
  navyName: { fontSize: 18, fontWeight: '900', color: '#0B2545', textTransform: 'uppercase' },
  navyHeadline: { fontSize: 9.5, fontWeight: '700', color: '#1D63FF', marginBottom: 6 },
  navyMetaStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 8 },
  navyMetaItem: { fontSize: 8, color: '#64748B' },
  navySectionTitle: { fontSize: 9.5, fontWeight: '800', color: '#0B2545', marginBottom: 6 },
  navyTimelineNode: { marginBottom: 9, borderLeftWidth: 2, borderLeftColor: '#CBD5E1', paddingLeft: 8, marginLeft: 2, overflow: 'hidden' },
  navyNodeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  navyNodeTitle: { fontSize: 9.5, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  navyScoreBadgeRow: { flexDirection: 'row', marginTop: 3 },
  navyScoreBadge: { backgroundColor: '#EEF2F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, borderWidth: 0.5, borderColor: '#CBD5E1', alignSelf: 'flex-start' },
  navyScoreBadgeText: { fontSize: 7.5, fontWeight: '800', color: '#0B2545' },
  navyNodeInst: { fontSize: 8.5, color: '#1D63FF', fontWeight: '600', marginBottom: 1 },
  navyNodeBullet: { fontSize: 8, color: '#475569', lineHeight: 11 },
  navyDeclarationBox: { marginTop: 'auto', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#CBD5E1' },
  navyDeclHeader: { fontSize: 8, fontWeight: '800', color: '#0B2545' },
  navyDeclText: { fontSize: 7.5, color: '#64748B' },

  // 2. Richard Sanchez Styles (Image 3)
  sanchezSheet: { width: '100%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: ArchivalColors.hairline, elevation: 3, minHeight: 680, overflow: 'hidden' },
  sanchezHeader: { backgroundColor: '#1B2433', paddingVertical: 14, paddingHorizontal: 12, paddingLeft: 84, position: 'relative' },
  sanchezAvatarWrap: {
    position: 'absolute',
    top: 6,
    left: 10,
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: '#ffffff',
    overflow: 'hidden',
    backgroundColor: '#2B3346',
    zIndex: 10,
  },
  sanchezAvatarImg: { width: '100%', height: '100%' },
  sanchezName: { fontSize: 16, fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  sanchezHeadline: { fontSize: 8.5, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase' },
  sanchezBody: { flexDirection: 'row', flex: 1 },
  sanchezLeftCol: { width: '34%', backgroundColor: '#EDEEF2', padding: 10 },
  sanchezSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: '#111827',
    marginBottom: 6,
    marginTop: 8,
  },
  sanchezSectionTitle: { fontSize: 8.5, fontWeight: '800', color: '#111827', letterSpacing: 0.8 },
  sanchezContactItem: { fontSize: 7.5, color: '#374151', marginBottom: 3 },
  sanchezBulletItem: { fontSize: 7.5, color: '#374151', marginBottom: 2.5 },
  sanchezRefName: { fontSize: 8, fontWeight: '800', color: '#111827' },
  sanchezRefSub: { fontSize: 7.5, color: '#4B5563' },
  sanchezRightCol: { width: '66%', backgroundColor: '#ffffff', padding: 12 },
  sanchezRightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 6,
    marginTop: 8,
  },
  sanchezIconCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#1B2433', alignItems: 'center', justifyContent: 'center' },
  sanchezIconText: { fontSize: 8, color: '#ffffff' },
  sanchezRightTitle: { fontSize: 9.5, fontWeight: '800', color: '#111827', flex: 1, letterSpacing: 0.5 },
  sanchezProfileText: { fontSize: 8, color: '#374151', lineHeight: 11, marginBottom: 4 },
  sanchezTimelineWrap: { borderLeftWidth: 1.5, borderLeftColor: '#CBD5E1', paddingLeft: 8, marginLeft: 3 },
  sanchezTimelineNode: { marginBottom: 8 },
  sanchezNodeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4, marginBottom: 2 },
  sanchezNodeCompany: { fontSize: 8.5, fontWeight: '800', color: '#111827', flex: 1, minWidth: 100, marginRight: 4 },
  sanchezNodePeriod: { fontSize: 7.5, fontWeight: '700', color: '#6B7280', flexShrink: 0 },
  sanchezNodeRole: { fontSize: 8, color: '#374151', fontWeight: '600' },
  sanchezNodeScore: { fontSize: 7.5, color: '#1B2433', fontWeight: '700' },
  sanchezNodeBullet: { fontSize: 7.5, color: '#4B5563', lineHeight: 10 },

  // 3. Herman Walton Styles (Image 4)
  waltonSheet: { width: '100%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: ArchivalColors.hairline, padding: 14, minHeight: 680, position: 'relative', overflow: 'hidden' },
  waltonCornerTL: { position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: '#CBD5E1' },
  waltonCornerTR: { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: '#CBD5E1' },
  waltonCornerBL: { position: 'absolute', bottom: 6, left: 6, width: 10, height: 10, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: '#CBD5E1' },
  waltonCornerBR: { position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: '#CBD5E1' },
  waltonHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  waltonName: { fontSize: 17, fontWeight: '900', color: '#1A56DB', textTransform: 'uppercase' },
  waltonTitle: { fontSize: 10, fontWeight: '800', color: '#111827', textTransform: 'uppercase' },
  waltonContactLine: { fontSize: 7.5, color: '#4B5563', marginTop: 3 },
  waltonPhotoBox: { width: 56, height: 68, borderRadius: 3, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden', backgroundColor: '#F3F4F6' },
  waltonPhotoImg: { width: '100%', height: '100%' },
  waltonSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: '#1A56DB', paddingBottom: 2, marginBottom: 5, marginTop: 8 },
  waltonSectionTitle: { fontSize: 9, fontWeight: '800', color: '#1A56DB', textTransform: 'uppercase' },
  waltonText: { fontSize: 8, color: '#374151', lineHeight: 11 },
  waltonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4, marginBottom: 2 },
  waltonRoleCompany: { fontSize: 8.5, fontWeight: '700', color: '#111827', flex: 1, minWidth: 100, marginRight: 4 },
  waltonDate: { fontSize: 7.5, fontWeight: '700', color: '#111827', flexShrink: 0 },
  waltonInst: { fontSize: 7.5, color: '#4B5563', marginBottom: 2 },
  waltonBullet: { fontSize: 7.5, color: '#4B5563', lineHeight: 10, marginLeft: 4 },
  waltonSkillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 3 },
  waltonSkillGridItem: { width: '23%', paddingVertical: 2 },
  waltonSkillText: { fontSize: 7.5, color: '#374151', fontWeight: '500' },

  // 4. Sunny Singh Styles (Image 5)
  singhSheet: { width: '100%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: ArchivalColors.hairline, minHeight: 680, overflow: 'hidden' },
  singhHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FAFAFA' },
  singhAvatarWrap: { width: 62, height: 74, borderRadius: 10, borderWidth: 2, borderColor: '#2B2D42', overflow: 'hidden', backgroundColor: '#E5E7EB' },
  singhAvatarImg: { width: '100%', height: '100%' },
  singhName: { fontSize: 16, fontWeight: '900', color: '#111827', textTransform: 'uppercase' },
  singhRole: { fontSize: 9.5, fontWeight: '700', color: '#4B5563', marginBottom: 2 },
  singhSummaryText: { fontSize: 7.5, color: '#374151', lineHeight: 10 },
  singhCrimsonBanner: { backgroundColor: '#A11B24', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  singhBannerText: { fontSize: 7.5, color: '#ffffff', fontWeight: '700' },
  singhBody: { flexDirection: 'row', padding: 10 },
  singhLeftCol: { width: '60%', paddingRight: 8 },
  singhRightCol: { width: '40%', paddingLeft: 6 },
  singhHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: '#A11B24', paddingBottom: 2, marginBottom: 5, marginTop: 6 },
  singhSectionHeading: { fontSize: 8.5, fontWeight: '800', color: '#111827', textTransform: 'uppercase' },
  singhJobRole: { fontSize: 8.5, fontWeight: '800', color: '#111827' },
  singhJobCompany: { fontSize: 8, fontWeight: '700', color: '#374151' },
  singhJobMeta: { fontSize: 7, color: '#6B7280', fontStyle: 'italic', marginBottom: 2 },
  singhJobBullet: { fontSize: 7.5, color: '#4B5563', lineHeight: 10 },
  singhSkillPill: { backgroundColor: '#A11B24', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 4, marginBottom: 3, alignItems: 'center' },
  singhSkillPillText: { fontSize: 7.5, color: '#ffffff', fontWeight: '700' },
  singhLangRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  singhLangName: { fontSize: 8, color: '#374151', fontWeight: '600' },
  singhDotsRow: { flexDirection: 'row', gap: 3 },
  singhDot: { width: 5, height: 5, borderRadius: 2.5 },
  singhDotActive: { backgroundColor: '#A11B24' },
  singhDotInactive: { backgroundColor: '#D1D5DB' },

  // Floating CTA
  floatingBottomCta: { position: 'absolute', bottom: 14, left: 16, right: 16 },
  glossyButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  btnContentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btnIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  btnTextStack: { flex: 1, marginLeft: 12 },
  glossyBtnTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  glossyBtnSubtitle: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 11, fontWeight: '500', marginTop: 1 },
  btnKpiPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  btnKpiPillText: { color: '#ffffff', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 },

  // TAB 2: TEMPLATES
  tabContentScroll: { flex: 1, backgroundColor: ArchivalColors.canvas },
  galleryContainer: { padding: 16, paddingBottom: 40 },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ArchivalColors.sheet,
    borderWidth: 1,
    borderColor: 'rgba(163, 19, 33, 0.2)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    elevation: 2,
  },
  syncBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  syncIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBannerTitle: { fontSize: 13.5, fontWeight: '800', color: Colors.primary },
  syncBannerDesc: { fontSize: 11, color: ArchivalColors.mutedInk, marginTop: 2 },
  syncActionBtn: {
    backgroundColor: 'rgba(163, 19, 33, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(163, 19, 33, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  syncActionBtnText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  galleryHeaderWrap: { marginBottom: 14 },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: ArchivalColors.ink },
  sectionDesc: { fontSize: 11.5, color: ArchivalColors.mutedInk, marginTop: 2 },
  templatesGrid: { gap: 12 },
  templateCard: {
    backgroundColor: ArchivalColors.sheet,
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  templateCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: '#ffffff',
  },
  tmplMiniA4: {
    width: 72,
    height: 96,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tmplDetails: { flex: 1 },
  tmplHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tmplName: { fontSize: 13.5, fontWeight: '800', color: ArchivalColors.ink, flex: 1 },
  atsBadgePill: {
    backgroundColor: 'rgba(46, 125, 79, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  atsBadgePillText: { fontSize: 9, fontWeight: '800', color: '#2E7D4F' },
  tmplCategoryTag: { fontSize: 10.5, fontWeight: '600', color: ArchivalColors.mutedInk, marginTop: 1 },
  tmplDescText: { fontSize: 10.5, color: ArchivalColors.mutedInk, marginTop: 4, lineHeight: 14 },
  tmplFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: ArchivalColors.surfaceRamp,
  },
  stylePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  stylePillText: { fontSize: 8.5, fontWeight: '800', color: '#ffffff' },
  selectedStatusWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  selectedStatusText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  useTemplateAction: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  // TAB 3: EDITOR
  editorContainer: { flex: 1, backgroundColor: ArchivalColors.canvas },
  editorTopActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: ArchivalColors.sheet,
    borderBottomWidth: 1,
    borderBottomColor: ArchivalColors.hairline,
  },
  fetchProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  fetchProfileBtnText: { color: '#ffffff', fontSize: 11.5, fontWeight: '700' },
  clearBlankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ArchivalColors.surfaceRamp,
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  clearBlankBtnText: { color: ArchivalColors.ink, fontSize: 11.5, fontWeight: '600' },
  editorNavScroll: {
    backgroundColor: ArchivalColors.sheet,
    borderBottomWidth: 1,
    borderBottomColor: ArchivalColors.hairline,
    maxHeight: 46,
  },
  editorNavContent: { paddingHorizontal: 10, alignItems: 'center', gap: 6 },
  editorNavChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: ArchivalColors.surfaceRamp,
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
  },
  editorNavChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  editorNavChipText: { fontSize: 11, fontWeight: '600', color: ArchivalColors.ink },
  editorNavChipTextActive: { color: '#ffffff', fontWeight: '700' },
  editorFormScroll: { flex: 1 },
  editorFormContent: { padding: 14, paddingBottom: 40 },
  formCard: {
    backgroundColor: ArchivalColors.sheet,
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
    borderRadius: 8,
    padding: 14,
  },
  formCardTitle: { fontSize: 15, fontWeight: '800', color: ArchivalColors.ink },
  formCardSub: { fontSize: 11, color: ArchivalColors.mutedInk, marginBottom: 12, marginTop: 1 },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', color: ArchivalColors.ink, marginTop: 8, marginBottom: 3 },
  inputField: {
    backgroundColor: ArchivalColors.surfaceRamp,
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: ArchivalColors.ink,
    marginBottom: 6,
  },
  textAreaField: { minHeight: 70, textAlignVertical: 'top' },
  addRowInline: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtnSmall: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSmallText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: ArchivalColors.surfaceRamp,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
  },
  itemRowTitle: { fontSize: 12, fontWeight: '700', color: ArchivalColors.ink },
  itemRowSub: { fontSize: 10.5, color: ArchivalColors.mutedInk, marginTop: 1 },
  nestedEditCard: {
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  nestedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nestedEditTag: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  addItemCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(163, 19, 33, 0.06)',
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(163, 19, 33, 0.3)',
    marginTop: 4,
  },
  addItemCtaText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  editorPhotoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  editorAvatarBox: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: Colors.primary, overflow: 'hidden' },
  editorAvatarImg: { width: '100%', height: '100%' },
  pickPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pickPhotoBtnText: { color: '#ffffff', fontSize: 11.5, fontWeight: '700' },
  editorPhotoHint: { fontSize: 10, color: ArchivalColors.mutedInk },

  // TAB 4: AI AUDIT
  aiAuditContainer: { padding: 14, paddingBottom: 40 },
  aiScorecard: {
    backgroundColor: ArchivalColors.sheet,
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ArchivalColors.surfaceRamp,
  },
  scoreNumber: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  scoreOutOf: { fontSize: 8.5, color: ArchivalColors.mutedInk, marginTop: -2 },
  aiScorecardRight: { flex: 1 },
  aiScoreHeading: { fontSize: 13.5, fontWeight: '800', color: ArchivalColors.deepSpruce },
  aiScoreSub: { fontSize: 10.5, color: ArchivalColors.mutedInk, marginVertical: 3, lineHeight: 14 },
  miniScoreBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  miniScoreLabel: { fontSize: 9, color: ArchivalColors.mutedInk, width: 62 },
  miniScoreTrack: { flex: 1, height: 4, backgroundColor: ArchivalColors.surfaceRamp, borderRadius: 2, overflow: 'hidden' },
  miniScoreFill: { height: '100%', backgroundColor: Colors.primary },
  miniScoreValue: { fontSize: 9, fontWeight: '700', color: ArchivalColors.ink, width: 25, textAlign: 'right' },
  aiSectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  aiAppliedNotice: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  aiSuggestionCard: {
    backgroundColor: ArchivalColors.sheet,
    borderWidth: 1,
    borderColor: ArchivalColors.hairline,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  aiCategoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: ArchivalColors.aiAmberBg,
    borderWidth: 1,
    borderColor: ArchivalColors.aiAmber,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  aiCategoryTagText: { fontSize: 9.5, fontWeight: '800', color: ArchivalColors.aiAmberDark },
  aiSugTitle: { fontSize: 12.5, fontWeight: '800', color: ArchivalColors.ink },
  diffContainer: { borderWidth: 1, borderColor: ArchivalColors.hairline, borderRadius: 4, overflow: 'hidden', marginVertical: 6 },
  diffRemoveBlock: { backgroundColor: ArchivalColors.diffRemoveBg, padding: 6, borderBottomWidth: 1, borderBottomColor: '#ffcdd2' },
  diffRemoveLabel: { fontSize: 9, fontWeight: '700', color: ArchivalColors.diffRemoveText },
  diffRemoveContent: { fontSize: 10.5, color: ArchivalColors.diffRemoveText, textDecorationLine: 'line-through' },
  diffAddBlock: { backgroundColor: ArchivalColors.diffAddBg, padding: 6 },
  diffAddLabel: { fontSize: 9, fontWeight: '700', color: ArchivalColors.diffAddText },
  diffAddContent: { fontSize: 10.5, fontWeight: '600', color: ArchivalColors.diffAddText },
  diffReasonText: { fontSize: 10.5, color: ArchivalColors.mutedInk, lineHeight: 14, marginBottom: 8 },
  aiSugActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  applySugBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5 },
  applySugBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  appliedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: ArchivalColors.surfaceRamp, borderRadius: 4 },
  appliedPillText: { fontSize: 10.5, fontWeight: '600', color: Colors.primary },

  // QUICK EDIT MODAL
  quickEditModalCard: { width: '100%', maxWidth: 390, backgroundColor: '#ffffff', borderRadius: 14, padding: 18, maxHeight: '85%' },
  quickEditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: ArchivalColors.hairline, paddingBottom: 10 },
  quickEditTitle: { fontSize: 14, fontWeight: '800', color: ArchivalColors.ink },
  quickEditFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, borderTopWidth: 1, borderTopColor: ArchivalColors.hairline, paddingTop: 10 },
  openFullEditorBtn: { paddingVertical: 6 },
  openFullEditorBtnText: { fontSize: 11.5, fontWeight: '700', color: Colors.primary },
  doneBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  doneBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },

  // MODAL OVERLAY
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#ffffff', borderRadius: 12, padding: 22, alignItems: 'center' },
  modalIconWrap: { marginBottom: 10 },
  modalTitle: { fontSize: 16.5, fontWeight: '800', color: ArchivalColors.ink, textAlign: 'center' },
  modalSubtitle: { fontSize: 11.5, color: ArchivalColors.mutedInk, textAlign: 'center', marginTop: 3, marginBottom: 18, lineHeight: 16 },
  modalButtonStack: { width: '100%', gap: 8 },
  modalDriveBtn: {
    backgroundColor: '#0F9D58', // Google Drive emerald green
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalDriveBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  modalPrimaryBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  modalPrimaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  modalSecondaryBtn: { backgroundColor: ArchivalColors.surfaceRamp, borderWidth: 1, borderColor: ArchivalColors.hairline, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  modalSecondaryBtnText: { color: ArchivalColors.ink, fontSize: 13, fontWeight: '600' },
  modalDismissBtn: { paddingVertical: 6, alignItems: 'center' },
  modalDismissBtnText: { fontSize: 12, fontWeight: '600', color: ArchivalColors.mutedInk },

  // REVIEW TAB STYLES
  reviewHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 2,
    marginBottom: 8,
  },
  reviewHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reviewHeaderTitle: { fontSize: 13, fontWeight: '800', color: ArchivalColors.spruce },
  reviewHeaderSub: { fontSize: 9.5, color: ArchivalColors.mutedInk, marginTop: 1 },
  reviewHeaderRightActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewDriveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F9D58',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  reviewDriveBtnText: { color: '#ffffff', fontSize: 10.5, fontWeight: '800' },
  reviewExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewExportBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  reviewCleanSection: { marginBottom: 2 },
});
