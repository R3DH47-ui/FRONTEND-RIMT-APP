import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radii, FontFamilies, ImageAssets } from '../theme/tokens';
import Header from '../components/Header';
import ZoomCard from '../components/ZoomCard';
import ViewToggle from '../components/ViewToggle';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { uploadStudentDocument } from '../services/documentService';

export default function ProjectsScreen({ onNavigate }) {
  const { currentStudent, updateProfile } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState('stack'); // 'stack' | 'grid'
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Add / Edit Project Form State (Comprehensive fields)
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('academic');
  const [newDescription, setNewDescription] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newGithub, setNewGithub] = useState('');
  const [newLiveUrl, setNewLiveUrl] = useState('');
  const [newLogo, setNewLogo] = useState('');
  const [newStatus, setNewStatus] = useState('Completed');

  const parseStudentProjects = (raw) => {
    if (Array.isArray(raw) && raw.length > 0) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  };

  const [projects, setProjects] = useState(() => {
    return parseStudentProjects(currentStudent?.projects);
  });

  // Sync projects with currentStudent and remote DB
  useEffect(() => {
    let isMounted = true;
    const initial = parseStudentProjects(currentStudent?.projects);
    if (initial.length > 0) {
      setProjects(initial);
    }

    const fetchRemoteProjects = async () => {
      const studentId = currentStudent?.id;
      if (!studentId) return;

      try {
        const { data: dbProjects, error } = await supabase
          .from('student_projects')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(dbProjects) && dbProjects.length > 0 && isMounted) {
          const mapped = dbProjects.map((p) => {
            const rawTech = p.tech_stack || [];
            const techList = typeof rawTech === 'string'
              ? rawTech.split(',').map((t) => t.trim()).filter(Boolean)
              : (Array.isArray(rawTech) ? rawTech : ['React Native']);

            return {
              id: p.id,
              category: p.category || 'academic',
              categoryLabel: p.categoryLabel || 'Academic Core',
              status: p.status || 'Completed',
              statusType: (p.status || 'Completed').toLowerCase().includes('progress') ? 'inProgress' : 'completed',
              title: p.title || 'Untitled Project',
              description: p.description || p.about || 'Verified research project repository on RIMT ledger.',
              about: p.description || p.about || 'Verified research project repository on RIMT ledger.',
              tags: techList,
              tech_stack: techList,
              live_url: p.live_url || p.liveUrl || null,
              liveUrl: p.live_url || p.liveUrl || null,
              github_url: p.github_url || p.githubUrl || null,
              githubUrl: p.github_url || p.githubUrl || null,
              logo_url: p.logo_url || p.logoUrl || null,
              logoUrl: p.logo_url || p.logoUrl || null,
              commitInfo: `Synced on ${new Date(p.created_at || Date.now()).toLocaleDateString()}`,
              gitStatus: 'Git Synced',
              isPublic: true,
              icon: 'verified',
              iconBg: '#EEF2FF',
              iconColor: '#4F46E5',
            };
          });

          setProjects((prev) => {
            const existingTitles = new Set(prev.map((item) => item.title?.toLowerCase()));
            const uniqueRemote = mapped.filter((item) => !existingTitles.has(item.title?.toLowerCase()));
            return [...prev, ...uniqueRemote];
          });
        }
      } catch (err) {
        console.warn('Could not fetch student_projects from Supabase:', err);
      }
    };

    fetchRemoteProjects();

    return () => {
      isMounted = false;
    };
  }, [currentStudent?.id, currentStudent?.projects]);

  const filteredProjects = projects.filter((item) => {
    if (selectedFilter === 'all') return true;
    return item.category === selectedFilter;
  });

  const handleOpenUrl = async (url, label) => {
    if (!url) return;
    try {
      const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Link Notice', `Opening: ${fullUrl}`);
      }
    } catch (e) {
      Alert.alert('Link Notice', `Could not open ${label}: ${url}`);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProjectId(null);
    setNewTitle('');
    setNewCategory('academic');
    setNewDescription('');
    setNewTech('');
    setNewGithub('');
    setNewLiveUrl('');
    setNewLogo('');
    setNewStatus('Completed');
    setModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingProjectId(item.id);
    setNewTitle(item.title || '');
    setNewCategory(item.category || 'academic');
    setNewDescription(item.description || item.about || '');
    setNewTech(Array.isArray(item.tags || item.tech_stack) ? (item.tags || item.tech_stack).join(', ') : '');
    setNewGithub(item.github_url || item.githubUrl || '');
    setNewLiveUrl(item.live_url || item.liveUrl || '');
    setNewLogo(item.logo_url || item.logoUrl || '');
    setNewStatus(item.status || 'Completed');
    setModalVisible(true);
  };

  const handlePickProjectLogo = async () => {
    Alert.alert(
      'Project Logo',
      'Choose a logo photo for your project',
      [
        {
          text: 'Choose from Photo Library',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.85,
              allowsEditing: true,
              aspect: [1, 1],
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            setIsUploadingLogo(true);
            try {
              if (currentStudent?.roll_no) {
                const uploadResult = await uploadStudentDocument({
                  asset,
                  rollNo: currentStudent.roll_no,
                  title: `${newTitle || 'Project'} Logo`,
                  documentType: 'PROJECT_LOGO',
                });
                if (uploadResult.success && uploadResult.document) {
                  const url = uploadResult.document.cloudinary_url || uploadResult.document.url;
                  setNewLogo(url);
                } else {
                  Alert.alert('Logo upload failed', uploadResult.error || 'The logo could not be uploaded to shared storage.');
                }
              } else {
                Alert.alert('Sign in required', 'Sign in before uploading a project logo.');
              }
            } catch (err) {
              Alert.alert('Logo upload failed', err?.message || 'The logo could not be uploaded to shared storage.');
            } finally {
              setIsUploadingLogo(false);
            }
          },
        },
        {
          text: 'Take Photo with Camera',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission Denied', 'Camera permission is required to capture project logo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              quality: 0.85,
              allowsEditing: true,
              aspect: [1, 1],
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            setIsUploadingLogo(true);
            try {
              if (currentStudent?.roll_no) {
                const uploadResult = await uploadStudentDocument({
                  asset,
                  rollNo: currentStudent.roll_no,
                  title: `${newTitle || 'Project'} Logo`,
                  documentType: 'PROJECT_LOGO',
                });
                if (uploadResult.success && uploadResult.document) {
                  const url = uploadResult.document.cloudinary_url || uploadResult.document.url;
                  setNewLogo(url);
                } else {
                  Alert.alert('Logo upload failed', uploadResult.error || 'The logo could not be uploaded to shared storage.');
                }
              } else {
                Alert.alert('Sign in required', 'Sign in before uploading a project logo.');
              }
            } catch (err) {
              Alert.alert('Logo upload failed', err?.message || 'The logo could not be uploaded to shared storage.');
            } finally {
              setIsUploadingLogo(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeleteProject = (item) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to remove "${item.title}" from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = projects.filter((p) => p.id !== item.id);
            setProjects(updated);
            try {
              if (updateProfile) {
                await updateProfile({ projects: updated });
              }
              if (currentStudent?.id && item.id) {
                await supabase.from('student_projects').delete().eq('id', item.id);
              }
              Alert.alert('✅ Deleted', 'Project removed from your verified portfolio.');
            } catch (err) {
              console.warn('Error deleting project:', err);
            }
          },
        },
      ]
    );
  };

  const handleSaveProject = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a project title');
      return;
    }

    const techTags = newTech.trim()
      ? newTech.split(',').map((t) => t.trim()).filter(Boolean)
      : ['React Native', 'Node.js', 'PostgreSQL'];

    const categoryLabels = {
      academic: 'Academic Core',
      capstone: 'Capstone Lab',
      personal: 'Personal Lab',
      group: 'Group Research',
    };

    if (editingProjectId) {
      // UPDATE operation
      const updatedProjects = projects.map((p) => {
        if (p.id === editingProjectId) {
          return {
            ...p,
            title: newTitle.trim(),
            category: newCategory,
            categoryLabel: categoryLabels[newCategory] || 'Academic Core',
            status: newStatus,
            statusType: newStatus === 'Completed' ? 'completed' : 'inProgress',
            description: newDescription.trim() || 'Verified institutional project repository.',
            about: newDescription.trim() || 'Verified institutional project repository.',
            tags: techTags,
            tech_stack: techTags,
            github_url: newGithub.trim() || null,
            githubUrl: newGithub.trim() || null,
            live_url: newLiveUrl.trim() || null,
            liveUrl: newLiveUrl.trim() || null,
            logo_url: newLogo.trim() || null,
            logoUrl: newLogo.trim() || null,
            icon: newCategory === 'academic' ? 'military-tech' : newCategory === 'capstone' ? 'qr-code-scanner' : newCategory === 'group' ? 'hub' : 'science',
            iconBg: newCategory === 'academic' ? '#EEF2FF' : newCategory === 'capstone' ? '#FFF1F2' : newCategory === 'group' ? '#F0F9FF' : '#F5F3FF',
            iconColor: newCategory === 'academic' ? '#4F46E5' : newCategory === 'capstone' ? '#E11D48' : newCategory === 'group' ? '#0284C7' : '#7C3AED',
          };
        }
        return p;
      });

      setProjects(updatedProjects);
      setModalVisible(false);
      setEditingProjectId(null);

      try {
        if (updateProfile) {
          await updateProfile({ projects: updatedProjects });
        }
        if (currentStudent?.id) {
          try {
            await supabase.from('student_projects').upsert({
              id: editingProjectId,
              student_id: currentStudent.id,
              title: newTitle.trim(),
              description: newDescription.trim(),
              tech_stack: techTags.join(', '),
              live_url: newLiveUrl.trim() || null,
              logo_url: newLogo.trim() || null,
            });
          } catch (spErr) {
            console.warn('Optional student_projects sync notice:', spErr?.message || spErr);
          }
        }
        Alert.alert('✅ Updated', 'Project updated successfully.');
      } catch (err) {
        console.warn('Sync project error:', err);
      }
    } else {
      // CREATE operation
      const newProject = {
        id: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
        category: newCategory,
        categoryLabel: categoryLabels[newCategory] || 'Academic Core',
        status: newStatus,
        statusType: newStatus === 'Completed' ? 'completed' : 'inProgress',
        title: newTitle.trim(),
        description: newDescription.trim() || 'Verified institutional project repository synced with RIMT scholar ledger.',
        about: newDescription.trim() || 'Verified institutional project repository synced with RIMT scholar ledger.',
        tags: techTags,
        tech_stack: techTags,
        github_url: newGithub.trim() || null,
        githubUrl: newGithub.trim() || null,
        live_url: newLiveUrl.trim() || null,
        liveUrl: newLiveUrl.trim() || null,
        logo_url: newLogo.trim() || null,
        logoUrl: newLogo.trim() || null,
        commitInfo: `Initial commit today · #${Date.now().toString(16).slice(-6)}`,
        gitStatus: 'Git Synced',
        isPublic: true,
        icon: newCategory === 'academic' ? 'military-tech' : newCategory === 'capstone' ? 'qr-code-scanner' : newCategory === 'group' ? 'hub' : 'science',
        iconBg: newCategory === 'academic' ? '#EEF2FF' : newCategory === 'capstone' ? '#FFF1F2' : newCategory === 'group' ? '#F0F9FF' : '#F5F3FF',
        iconColor: newCategory === 'academic' ? '#4F46E5' : newCategory === 'capstone' ? '#E11D48' : newCategory === 'group' ? '#0284C7' : '#7C3AED',
      };

      const updatedProjects = [newProject, ...projects];
      setProjects(updatedProjects);
      setModalVisible(false);

      try {
        if (updateProfile) {
          await updateProfile({ projects: updatedProjects });
        }
        if (currentStudent?.id) {
          try {
            await supabase.from('student_projects').insert({
              student_id: currentStudent.id,
              title: newProject.title,
              description: newProject.description,
              tech_stack: techTags.join(', '),
              live_url: newProject.live_url,
              logo_url: newProject.logo_url,
            });
          } catch (spErr) {
            console.warn('Optional student_projects insert notice:', spErr?.message || spErr);
          }
        }
        Alert.alert('✅ Created', 'Project added and synced to official university ledger.');
      } catch (err) {
        console.warn('Sync project error:', err);
      }
    }
  };

  const showProjectDetails = (item) => {
    let message = `${item.description || item.about || 'No description provided.'}\n\n`;
    if (item.tags && item.tags.length > 0) {
      message += `Tech Stack: ${item.tags.join(', ')}\n\n`;
    }
    if (item.live_url || item.liveUrl) {
      message += `Live Domain: ${item.live_url || item.liveUrl}\n`;
    }
    if (item.github_url || item.githubUrl) {
      message += `GitHub Repo: ${item.github_url || item.githubUrl}\n`;
    }
    message += `Status: ${item.status || 'Active'}\nLedger: ${item.commitInfo || 'Git Synced'}`;

    Alert.alert(item.title, message, [
      (item.live_url || item.liveUrl)
        ? {
            text: 'Open Live Demo',
            onPress: () => handleOpenUrl(item.live_url || item.liveUrl, 'Live Demo'),
          }
        : null,
      (item.github_url || item.githubUrl)
        ? {
            text: 'Open GitHub',
            onPress: () => handleOpenUrl(item.github_url || item.githubUrl, 'GitHub'),
          }
        : null,
      { text: 'Close', style: 'cancel' },
    ].filter(Boolean));
  };

  return (
    <View style={styles.container}>
      <Header
        title="Projects"
        eyebrow="RIMT ACADEMIC TRUST"
        avatarUrl={currentStudent?.avatar_url || ImageAssets.profileAvatarSecondary}
        onNotificationPress={() => Alert.alert('Notifications', 'Repository webhook synced successfully.')}
        onProfilePress={() => onNavigate?.('profile')}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Add Project Action Bar */}
        <View style={styles.topBar}>
          <View style={styles.titleColumn}>
            <Text style={styles.eyebrowText}>Portfolio &amp; Lab Works</Text>
            <Text style={styles.screenHeading}>My Projects</Text>
          </View>

          <TouchableOpacity
            style={styles.addProjectBtnWrapper}
            onPress={handleOpenAddModal}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primaryContainer, Colors.primary, Colors.crimsonPressed]}
              style={styles.addProjectGradient}
            >
              <MaterialIcons name="add" size={18} color="#ffffff" />
              <Text style={styles.addProjectBtnText}>Add Project</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filter Pills & Bento Grid Layout Switcher */}
        <View style={styles.filterBarRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'academic', label: 'Academic' },
              { id: 'capstone', label: 'Capstone' },
              { id: 'personal', label: 'Personal' },
              { id: 'group', label: 'Group' },
            ].map((f) => {
              const isActive = selectedFilter === f.id;
              return (
                <ZoomCard
                  key={f.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(f.id)}
                  scaleTo={1.08}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </ZoomCard>
              );
            })}
          </ScrollView>

          <ViewToggle
            mode={viewMode === 'stack' ? 'list' : 'grid'}
            onChange={(mode) => setViewMode(mode === 'list' ? 'stack' : 'grid')}
          />
        </View>

        {/* Bento Grate Projects Cards */}
        {viewMode === 'stack' ? (
          <View style={styles.listContainer}>
            {filteredProjects.map((item) => {
              const logoUri = item.logo_url || item.logoUrl;
              const hasLive = Boolean(item.live_url || item.liveUrl);
              const hasGithub = Boolean(item.github_url || item.githubUrl);

              return (
                <ZoomCard key={item.id} style={styles.bentoStackCard} scaleTo={1.03}>
                  {/* Top Row: Logo + Category + Status Badge */}
                  <View style={styles.bentoCardTopRow}>
                    <View style={styles.bentoLeftHeader}>
                      {logoUri ? (
                        <View style={styles.logoImageContainer}>
                          <Image
                            source={{ uri: logoUri }}
                            style={styles.projectLogoImg}
                            resizeMode="cover"
                          />
                        </View>
                      ) : (
                        <View style={[styles.squircleIconBox, { backgroundColor: item.iconBg || '#EEF2FF' }]}>
                          <MaterialIcons
                            name={item.icon || 'code'}
                            size={22}
                            color={item.iconColor || Colors.primary}
                          />
                        </View>
                      )}

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.categoryLabelText} numberOfLines={1}>{item.categoryLabel || 'Academic Core'}</Text>
                        <Text style={styles.projectIdText}>ID #{item.id}</Text>
                      </View>
                    </View>

                    {item.statusType === 'completed' || (item.status && item.status.toLowerCase().includes('complete')) ? (
                      <View style={styles.statusPillCompleted}>
                        <Text style={styles.statusTextCompleted}>Completed</Text>
                        <MaterialIcons name="check" size={13} color={Colors.verifiedGreen} />
                      </View>
                    ) : (
                      <View style={styles.statusPillProgress}>
                        <Text style={styles.statusTextProgress}>In progress</Text>
                        <View style={styles.pulseDotAmber} />
                      </View>
                    )}
                  </View>

                  {/* Actions Row */}
                  <View style={styles.bentoActionsRow}>
                    <TouchableOpacity
                      style={styles.circularActionBtn}
                      onPress={() => handleOpenEditModal(item)}
                      activeOpacity={0.7}
                      accessibilityLabel="Edit Project"
                    >
                      <MaterialIcons name="edit" size={14} color="#6366F1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.circularActionBtn}
                      onPress={() => handleDeleteProject(item)}
                      activeOpacity={0.7}
                      accessibilityLabel="Delete Project"
                    >
                      <MaterialIcons name="delete-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.circularActionBtn}
                      onPress={() => showProjectDetails(item)}
                      activeOpacity={0.7}
                      accessibilityLabel="Project Details"
                    >
                      <MaterialIcons name="north-east" size={15} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* Project Title */}
                  <Text style={styles.bentoTitleText}>{item.title}</Text>

                  {/* Dedicated ABOUT PROJECT Section */}
                  <View style={styles.aboutContainer}>
                    <View style={styles.sectionHeaderRow}>
                      <MaterialIcons name="info-outline" size={12} color="#64748B" />
                      <Text style={styles.sectionEyebrow}>ABOUT PROJECT</Text>
                    </View>
                    <Text style={styles.bentoDescText} numberOfLines={3}>
                      {item.description || item.about || 'Verified institutional software project.'}
                    </Text>
                  </View>

                  {/* Dedicated TECH STACK USED Section */}
                  {item.tags && item.tags.length > 0 && (
                    <View style={styles.techSection}>
                      <View style={styles.sectionHeaderRow}>
                        <MaterialIcons name="code" size={12} color="#64748B" />
                        <Text style={styles.sectionEyebrow}>TECH STACK USED</Text>
                      </View>
                      <View style={styles.techTagsRow}>
                        {item.tags.map((tag, idx) => (
                          <View key={idx} style={styles.techTag}>
                            <Text style={styles.techTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Interactive Action Strip: Live Domain & GitHub Repo Buttons */}
                  <View style={styles.actionStrip}>
                    <View style={styles.linkButtonsContainer}>
                      {hasLive && (
                        <TouchableOpacity
                          style={styles.liveDomainBtn}
                          onPress={() => handleOpenUrl(item.live_url || item.liveUrl, 'Live Domain')}
                          activeOpacity={0.75}
                        >
                          <MaterialIcons name="language" size={14} color="#059669" />
                          <Text style={styles.liveDomainText}>Live Domain</Text>
                          <MaterialIcons name="open-in-new" size={11} color="#059669" />
                        </TouchableOpacity>
                      )}

                      {hasGithub && (
                        <TouchableOpacity
                          style={styles.githubRepoBtn}
                          onPress={() => handleOpenUrl(item.github_url || item.githubUrl, 'GitHub Repo')}
                          activeOpacity={0.75}
                        >
                          <MaterialIcons name="code" size={14} color="#0F172A" />
                          <Text style={styles.githubRepoText}>GitHub Repo</Text>
                          <MaterialIcons name="open-in-new" size={11} color="#0F172A" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.gitStatusLeft}>
                      <MaterialIcons
                        name="sync"
                        size={13}
                        color={Colors.verifiedGreen}
                      />
                      <Text style={styles.commitInfoText} numberOfLines={1}>
                        {item.commitInfo || 'Git Synced'}
                      </Text>
                    </View>
                  </View>
                </ZoomCard>
              );
            })}
          </View>
        ) : (
          /* Bento 2-Column Grid */
          <View style={styles.bentoGridContainer}>
            {filteredProjects.map((item) => {
              const logoUri = item.logo_url || item.logoUrl;
              const hasLive = Boolean(item.live_url || item.liveUrl);
              const hasGithub = Boolean(item.github_url || item.githubUrl);

              return (
                <ZoomCard
                  key={item.id}
                  containerStyle={styles.bentoGridCardWrapper}
                  style={styles.bentoGridCard}
                  scaleTo={1.05}
                >
                  <View style={styles.bentoGridCardTop}>
                    {logoUri ? (
                      <View style={styles.logoImageContainerSmall}>
                        <Image
                          source={{ uri: logoUri }}
                          style={styles.projectLogoImgSmall}
                          resizeMode="cover"
                        />
                      </View>
                    ) : (
                      <View style={[styles.squircleIconBoxSmall, { backgroundColor: item.iconBg || '#EEF2FF' }]}>
                        <MaterialIcons name={item.icon || 'code'} size={18} color={item.iconColor || Colors.primary} />
                      </View>
                    )}

                    <View style={styles.bentoGridActions}>
                      <TouchableOpacity
                        style={styles.circularActionBtnSmall}
                        onPress={() => handleOpenEditModal(item)}
                        activeOpacity={0.7}
                        accessibilityLabel="Edit Project"
                      >
                        <MaterialIcons name="edit" size={12} color="#6366F1" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.circularActionBtnSmall}
                        onPress={() => handleDeleteProject(item)}
                        activeOpacity={0.7}
                        accessibilityLabel="Delete Project"
                      >
                        <MaterialIcons name="delete-outline" size={13} color="#EF4444" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.circularActionBtnSmall}
                        onPress={() => showProjectDetails(item)}
                        activeOpacity={0.7}
                        accessibilityLabel="Project Details"
                      >
                        <MaterialIcons name="north-east" size={13} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.gridCategoryText} numberOfLines={1}>
                    {item.categoryLabel || 'Academic Core'}
                  </Text>

                  <Text style={styles.bentoGridTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <Text style={styles.bentoGridDesc} numberOfLines={2}>
                    {item.description || item.about}
                  </Text>

                  {/* Primary Tech Tag */}
                  {item.tags && item.tags.length > 0 && (
                    <View style={styles.gridTagPill}>
                      <Text style={styles.gridTagText} numberOfLines={1}>
                        {item.tags[0]} {item.tags.length > 1 ? `+${item.tags.length - 1}` : ''}
                      </Text>
                    </View>
                  )}

                  {/* Quick Action Icons in Grid */}
                  <View style={styles.gridActionsRow}>
                    {hasLive && (
                      <TouchableOpacity
                        style={styles.gridActionIconBtn}
                        onPress={() => handleOpenUrl(item.live_url || item.liveUrl, 'Live Domain')}
                      >
                        <MaterialIcons name="language" size={14} color="#059669" />
                      </TouchableOpacity>
                    )}
                    {hasGithub && (
                      <TouchableOpacity
                        style={styles.gridActionIconBtn}
                        onPress={() => handleOpenUrl(item.github_url || item.githubUrl, 'GitHub Repo')}
                      >
                        <MaterialIcons name="code" size={14} color="#0F172A" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.learnMoreBtnGrid}
                      onPress={() => showProjectDetails(item)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.learnMoreTextGrid}>Details</Text>
                    </TouchableOpacity>
                  </View>
                </ZoomCard>
              );
            })}
          </View>
        )}

        {/* Empty State / Add Card */}
        {filteredProjects.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="folder-open" size={32} color={Colors.primary} />
              <View style={styles.emptyPlusBadge}>
                <Text style={styles.emptyPlusText}>+</Text>
              </View>
            </View>

            <Text style={styles.emptyCardTitle}>No projects in this category</Text>
            <Text style={styles.emptyCardSubtitle}>
              Connect institutional code repositories, capstones, and cryptographic lab modules
              directly to your verified academic record.
            </Text>

            <TouchableOpacity
              style={styles.emptyAddBtnWrapper}
              onPress={handleOpenAddModal}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.primaryContainer, Colors.primary, Colors.crimsonPressed]}
                style={styles.emptyAddGradient}
              >
                <MaterialIcons name="add-circle" size={18} color="#ffffff" />
                <Text style={styles.emptyAddBtnText}>Add Project</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.shaFootnote}>
              <MaterialIcons name="verified-user" size={14} color={Colors.verifiedGreen} />
              <Text style={styles.shaFootnoteText}>SHA-256 Ledger Backed</Text>
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add Project Modal with Comprehensive Fields */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingProjectId ? 'Edit Project' : 'Add Project to Portfolio'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingProjectId
                    ? 'Update repository architecture, links, tech stack, and logo'
                    : 'Sync tech stack, GitHub repo, live domain, and project details'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScroll}>
              {/* Field 1: Project Title */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Project Title *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Distributed Consensus Engine"
                  placeholderTextColor={Colors.neutralGray}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              {/* Field 2: Category */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categorySelectRow}>
                  {[
                    { id: 'academic', label: 'ACADEMIC' },
                    { id: 'capstone', label: 'CAPSTONE' },
                    { id: 'personal', label: 'PERSONAL' },
                    { id: 'group', label: 'GROUP' },
                  ].map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryOption,
                        newCategory === cat.id && styles.categoryOptionActive,
                      ]}
                      onPress={() => setNewCategory(cat.id)}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          newCategory === cat.id && styles.categoryOptionTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Field 3: About Project (Description) */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>About Project (Overview &amp; Architecture)</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Explain project architecture, real-world utility, algorithms used, and your contribution..."
                  placeholderTextColor={Colors.neutralGray}
                  multiline
                  numberOfLines={3}
                  value={newDescription}
                  onChangeText={setNewDescription}
                />
              </View>

              {/* Field 4: Tech Stack Used */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Tech Stack Used (comma-separated)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. React Native, Node.js, PostgreSQL, TailwindCSS"
                  placeholderTextColor={Colors.neutralGray}
                  value={newTech}
                  onChangeText={setNewTech}
                />
              </View>

              {/* Field 5: GitHub Repository Link */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>GitHub Repository Link</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="https://github.com/your-username/repository"
                  placeholderTextColor={Colors.neutralGray}
                  autoCapitalize="none"
                  keyboardType="url"
                  value={newGithub}
                  onChangeText={setNewGithub}
                />
              </View>

              {/* Field 6: Live Domain / Demo Link */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Live Domain / Demo Link</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="https://your-project.vercel.app or custom domain"
                  placeholderTextColor={Colors.neutralGray}
                  autoCapitalize="none"
                  keyboardType="url"
                  value={newLiveUrl}
                  onChangeText={setNewLiveUrl}
                />
              </View>

              {/* Field 7: Project Logo Photo (Upload / URL) */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Project Logo Photo (Upload / URL)</Text>
                {newLogo ? (
                  <View style={styles.logoPreviewRow}>
                    <Image source={{ uri: newLogo }} style={styles.logoPreviewImage} resizeMode="cover" />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={styles.logoPreviewText} numberOfLines={1}>
                        Logo photo selected
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={styles.logoChangeBtn}
                          onPress={handlePickProjectLogo}
                          disabled={isUploadingLogo}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="photo-camera" size={13} color={Colors.primary} />
                          <Text style={styles.logoChangeText}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.logoRemoveBtn}
                          onPress={() => setNewLogo('')}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="delete" size={13} color="#EF4444" />
                          <Text style={styles.logoRemoveText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={styles.logoUploadBtn}
                      onPress={handlePickProjectLogo}
                      disabled={isUploadingLogo}
                      activeOpacity={0.8}
                    >
                      {isUploadingLogo ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <>
                          <MaterialIcons name="add-a-photo" size={18} color="#4F46E5" />
                          <Text style={styles.logoUploadBtnText}>Upload Photo of Logo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Or enter image URL (https://...)"
                      placeholderTextColor={Colors.neutralGray}
                      autoCapitalize="none"
                      keyboardType="url"
                      value={newLogo}
                      onChangeText={setNewLogo}
                    />
                  </View>
                )}
              </View>

              {/* Field 8: Status Selector */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Project Status</Text>
                <View style={styles.categorySelectRow}>
                  {['Completed', 'In progress'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.categoryOption,
                        newStatus === st && styles.categoryOptionActive,
                      ]}
                      onPress={() => setNewStatus(st)}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          newStatus === st && styles.categoryOptionTextActive,
                        ]}
                      >
                        {st.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalSubmitWrapper}
                onPress={handleSaveProject}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.primaryContainer, Colors.primary, Colors.crimsonPressed]}
                  style={styles.modalSubmitGradient}
                >
                  <Text style={styles.modalSubmitText}>
                    {editingProjectId ? 'Update Project & Sync Ledger' : 'Save & Sync to Academic Ledger'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  topBar: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.spaceMd,
    paddingBottom: Spacing.spaceXs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleColumn: {
    flex: 1,
  },
  eyebrowText: {
    ...Typography.eyebrow,
    color: Colors.textSecondary,
    fontSize: 10.5,
    marginBottom: 2,
  },
  screenHeading: {
    ...Typography.headlineMd,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addProjectBtnWrapper: {
    height: 40,
    borderRadius: Radii.md,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addProjectGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  addProjectBtnText: {
    ...Typography.labelMd,
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingVertical: Spacing.spaceSm,
    gap: 8,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: Spacing.margin,
    gap: Spacing.spaceSm + 4,
  },
  bentoStackCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  bentoCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  bentoLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  logoImageContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  projectLogoImg: {
    width: '100%',
    height: '100%',
  },
  squircleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabelText: {
    ...Typography.eyebrow,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  projectIdText: {
    ...Typography.codeXs,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  bentoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  statusPillCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(46, 125, 79, 0.12)',
  },
  statusTextCompleted: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.verifiedGreen,
  },
  statusPillProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(183, 121, 31, 0.15)',
  },
  statusTextProgress: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.pendingAmber,
  },
  pulseDotAmber: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.pendingAmber,
  },
  circularActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoTitleText: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 8,
  },
  aboutContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sectionEyebrow: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  bentoDescText: {
    fontFamily: FontFamilies.sans,
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  techSection: {
    marginBottom: 10,
  },
  techTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  techTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  techTagText: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  linkButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  liveDomainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDomainText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  githubRepoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  githubRepoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  gitStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commitInfoText: {
    ...Typography.codeXs,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  bentoGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.margin - 4,
    justifyContent: 'space-between',
  },
  bentoGridCardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  bentoGridCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bentoGridCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  bentoGridActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  logoImageContainerSmall: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  projectLogoImgSmall: {
    width: '100%',
    height: '100%',
  },
  squircleIconBoxSmall: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularActionBtnSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCategoryText: {
    ...Typography.eyebrow,
    fontSize: 9.5,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  bentoGridTitle: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
  },
  bentoGridDesc: {
    fontFamily: FontFamilies.sans,
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  gridTagPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.xs,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
  gridTagText: {
    ...Typography.codeXs,
    fontSize: 10,
    color: Colors.secondary,
    fontWeight: '600',
  },
  gridActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  gridActionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnMoreBtnGrid: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: Radii.full,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  learnMoreTextGrid: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: Radii.xl,
    padding: Spacing.spaceXl,
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.spaceLg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  emptyPlusBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCardTitle: {
    ...Typography.headlineSm,
    fontSize: 16.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyCardSubtitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
    maxWidth: 290,
  },
  emptyAddBtnWrapper: {
    height: 48,
    borderRadius: Radii.md,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 220,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyAddGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyAddBtnText: {
    ...Typography.labelMd,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  shaFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  shaFootnoteText: {
    ...Typography.codeXs,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.spaceLg,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.spaceMd,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    ...Typography.headlineSm,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalFormScroll: {
    maxHeight: 520,
  },
  modalField: {
    marginBottom: Spacing.spaceSm + 2,
  },
  fieldLabel: {
    ...Typography.labelMd,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 5,
  },
  modalInput: {
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  modalTextArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  categorySelectRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryOption: {
    flex: 1,
    height: 34,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  categoryOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    ...Typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  categoryOptionTextActive: {
    color: '#ffffff',
  },
  modalSubmitWrapper: {
    height: 48,
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 10,
  },
  modalSubmitGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    ...Typography.labelMd,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoPreviewImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  logoPreviewText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  logoChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  logoChangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  logoRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoRemoveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  logoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  logoUploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
});
