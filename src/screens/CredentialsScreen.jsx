import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radii, ImageAssets } from '../theme/tokens';
import Header from '../components/Header';
import ZoomCard from '../components/ZoomCard';
import { useAuth } from '../context/AuthContext';
import { getDocumentUri, viewOrOpenDocument } from '../utils/documentViewer';
import {
  listStudentDocuments,
  SUPPORTED_DOCUMENT_TYPES,
  toDocumentCardProps,
  uploadStudentDocument,
  deleteStudentDocument,
} from '../services/documentService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.margin * 2 - 12) / 2;

/**
 * Certificates & Internships Screen
 * Modern visual layout for managing academic certificates, internship experiences,
 * and credential uploads. Replaces the old Credentials + Downloads screens.
 */
export default function CredentialsScreen({ onNavigate }) {
  const { currentStudent, updateProfile } = useAuth();
  const [activeSegment, setActiveSegment] = useState('all');
  const [documents, setDocuments] = useState([]);
  const [internships, setInternships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingInternCert, setIsUploadingInternCert] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showAddInternship, setShowAddInternship] = useState(false);
  const [internshipForm, setInternshipForm] = useState({
    company: '',
    role: '',
    duration: '',
    description: '',
    certificate_url: '',
  });

  // Load certificates and internships
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const result = await listStudentDocuments(currentStudent?.roll_no);
      if (isMounted) {
        const loadedDocs = result.documents && result.documents.length > 0
          ? result.documents
          : (Array.isArray(currentStudent?.certificates) ? currentStudent.certificates : []);
        setDocuments(loadedDocs);

        // Load internships from student profile
        let parsedInternships = [];
        const raw = currentStudent?.internships;
        if (Array.isArray(raw)) parsedInternships = raw;
        else if (typeof raw === 'string') {
          try {
            const p = JSON.parse(raw);
            if (Array.isArray(p)) parsedInternships = p;
          } catch {}
        }
        setInternships(parsedInternships);
        setIsLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [currentStudent?.roll_no, currentStudent?.internships, currentStudent?.certificates]);

  const handleUploadCertificate = async () => {
    if (!currentStudent?.roll_no) {
      Alert.alert('Sign in required', 'Sign in before uploading.');
      return;
    }

    Alert.alert(
      'Upload Certificate',
      'Choose a source for your certificate',
      [
        {
          text: 'Camera / Photo Library',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.85,
              allowsEditing: false,
            });
            if (result.canceled || !result.assets?.[0]) return;
            setIsUploading(true);
            const uploadResult = await uploadStudentDocument({
              asset: result.assets[0],
              rollNo: currentStudent.roll_no,
              title: `${currentStudent.name || 'Scholar'} Certificate`,
              documentType: 'ACADEMIC_CERTIFICATE',
            });
            setIsUploading(false);
            if (!uploadResult.success) {
              Alert.alert('Upload failed', uploadResult.error);
              return;
            }
            const updatedDocs = [uploadResult.document, ...documents];
            setDocuments(updatedDocs);
            if (updateProfile) {
              try {
                await updateProfile({ certificates: updatedDocs });
              } catch (e) {
                console.warn('Sync certificates error:', e);
              }
            }
            Alert.alert('✅ Certificate Uploaded', 'Your certificate has been uploaded and synced to your academic ledger.');
          },
        },
        {
          text: 'Document (PDF/Word)',
          onPress: async () => {
            const selection = await DocumentPicker.getDocumentAsync({
              type: SUPPORTED_DOCUMENT_TYPES,
              copyToCacheDirectory: Platform.OS !== 'android',
              multiple: false,
            });
            if (selection.canceled || !selection.assets?.[0]) return;
            setIsUploading(true);
            const uploadResult = await uploadStudentDocument({
              asset: selection.assets[0],
              rollNo: currentStudent.roll_no,
              title: selection.assets[0].name ? selection.assets[0].name.replace(/\.[^/.]+$/, '') : `${currentStudent.name || 'Scholar'} Document`,
              documentType: 'ACADEMIC_CERTIFICATE',
            });
            setIsUploading(false);
            if (!uploadResult.success) {
              Alert.alert('Upload failed', uploadResult.error);
              return;
            }
            const updatedDocs = [uploadResult.document, ...documents];
            setDocuments(updatedDocs);
            if (updateProfile) {
              try {
                await updateProfile({ certificates: updatedDocs });
              } catch (e) {
                console.warn('Sync certificates error:', e);
              }
            }
            Alert.alert('✅ Certificate Uploaded', 'Your document has been uploaded and synced successfully.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeleteCertificate = async (doc) => {
    Alert.alert(
      'Delete Certificate',
      `Are you sure you want to remove "${doc.title || 'this certificate'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = documents.filter((d) => d.id !== doc.id);
            try {
              await updateProfile?.({ certificates: updated });
              const deletion = await deleteStudentDocument({ documentId: doc.id, rollNo: currentStudent?.roll_no });
              if (!deletion.success) throw new Error(deletion.error || 'Could not delete the document.');
              setDocuments(updated);
            } catch (error) {
              Alert.alert('Unable to delete certificate', error?.message || 'The certificate could not be removed.');
            }
          },
        },
      ]
    );
  };

  const handlePickInternshipCertificate = async () => {
    if (!currentStudent?.roll_no) {
      Alert.alert('Sign in required', 'Sign in before uploading.');
      return;
    }
    Alert.alert(
      'Attach Certificate',
      'Choose a file source for this internship certificate',
      [
        {
          text: 'Camera / Photo Library',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.85,
              allowsEditing: false,
            });
            if (result.canceled || !result.assets?.[0]) return;
            setIsUploadingInternCert(true);
            const uploadResult = await uploadStudentDocument({
              asset: result.assets[0],
              rollNo: currentStudent.roll_no,
              title: `${internshipForm.company || 'Internship'} Certificate`,
              documentType: 'INTERNSHIP_CERTIFICATE',
            });
            setIsUploadingInternCert(false);
            if (!uploadResult.success) {
              Alert.alert('Upload notice', uploadResult.error || 'Could not upload image.');
              return;
            }
            const uploadedUrl = uploadResult.document.cloudinary_url || uploadResult.document.url || uploadResult.document.local_uri;
            setInternshipForm((prev) => ({ ...prev, certificate_url: uploadedUrl }));
            if (uploadResult.document) {
              setDocuments((cur) => [uploadResult.document, ...cur]);
            }
            Alert.alert('✅ Attached', 'Internship completion certificate uploaded and linked.');
          },
        },
        {
          text: 'Document (PDF / Word)',
          onPress: async () => {
            const selection = await DocumentPicker.getDocumentAsync({
              type: SUPPORTED_DOCUMENT_TYPES,
              copyToCacheDirectory: Platform.OS !== 'android',
              multiple: false,
            });
            if (selection.canceled || !selection.assets?.[0]) return;
            setIsUploadingInternCert(true);
            const uploadResult = await uploadStudentDocument({
              asset: selection.assets[0],
              rollNo: currentStudent.roll_no,
              title: `${internshipForm.company || 'Internship'} Certificate`,
              documentType: 'INTERNSHIP_CERTIFICATE',
            });
            setIsUploadingInternCert(false);
            if (!uploadResult.success) {
              Alert.alert('Upload notice', uploadResult.error || 'Could not upload document.');
              return;
            }
            const uploadedUrl = uploadResult.document.cloudinary_url || uploadResult.document.url || uploadResult.document.local_uri;
            setInternshipForm((prev) => ({ ...prev, certificate_url: uploadedUrl }));
            if (uploadResult.document) {
              setDocuments((cur) => [uploadResult.document, ...cur]);
            }
            Alert.alert('✅ Attached', 'Internship completion document uploaded and linked.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAddInternship = async () => {
    if (!internshipForm.company.trim() || !internshipForm.role.trim()) {
      Alert.alert('Missing fields', 'Company name and role are required.');
      return;
    }
    const newInternship = {
      id: `INT-${Date.now()}`,
      company: internshipForm.company.trim(),
      role: internshipForm.role.trim(),
      duration: internshipForm.duration.trim() || 'Verified Tenure',
      description: internshipForm.description.trim() || '',
      certificate_url: internshipForm.certificate_url.trim() || null,
      created_at: new Date().toISOString(),
    };
    const updated = [...internships, newInternship];
    setInternships(updated);
    setShowAddInternship(false);
    setInternshipForm({ company: '', role: '', duration: '', description: '', certificate_url: '' });

    // Persist to profile
    try {
      await updateProfile?.({ internships: updated });
      Alert.alert('✅ Internship Added', 'Your internship experience has been recorded.');
    } catch (e) {
      console.warn('Failed to save internship:', e);
    }
  };

  const handleDeleteInternship = (internshipId) => {
    Alert.alert('Delete Internship', 'Are you sure you want to remove this internship?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = internships.filter((i) => i.id !== internshipId);
          try {
            const removedInternship = internships.find((item) => item.id === internshipId);
            const attachedUrl = removedInternship?.certificate_url;
            let remainingDocuments = documents;
            if (attachedUrl) {
              const linkedDocuments = documents.filter(
                (document) => (document.url || document.cloudinary_url) === attachedUrl
              );
              remainingDocuments = documents.filter(
                (document) => (document.url || document.cloudinary_url) !== attachedUrl
              );
              await updateProfile?.({ internships: updated, certificates: remainingDocuments });
              for (const document of linkedDocuments) {
                const deletion = await deleteStudentDocument({ documentId: document.id, rollNo: currentStudent?.roll_no });
                if (!deletion.success) throw new Error(deletion.error || 'Could not delete the attached document.');
              }
            } else {
              await updateProfile?.({ internships: updated });
            }
            setInternships(updated);
            setDocuments(remainingDocuments);
          } catch (e) {
            Alert.alert('Unable to delete internship', e?.message || 'The internship could not be removed.');
          }
        },
      },
    ]);
  };

  const handleRemoveInternshipDocument = (internship) => {
    Alert.alert('Remove document', 'Remove this internship attachment without deleting the internship?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updatedInternships = internships.map((item) => item.id === internship.id
            ? { ...item, certificate_url: null }
            : item);
          const attachedUrl = internship.certificate_url;
          const linkedDocuments = documents.filter(
            (document) => (document.url || document.cloudinary_url) === attachedUrl
          );
          const remainingDocuments = documents.filter(
            (document) => (document.url || document.cloudinary_url) !== attachedUrl
          );
          try {
            await updateProfile?.({ internships: updatedInternships, certificates: remainingDocuments });
            for (const document of linkedDocuments) {
              const deletion = await deleteStudentDocument({ documentId: document.id, rollNo: currentStudent?.roll_no });
              if (!deletion.success) throw new Error(deletion.error || 'Could not delete the attached document.');
            }
            setInternships(updatedInternships);
            setDocuments(remainingDocuments);
          } catch (error) {
            Alert.alert('Unable to remove attachment', error?.message || 'The document could not be removed.');
          }
        },
      },
    ]);
  };

  const segments = [
    { id: 'all', label: 'All', icon: 'grid-view' },
    { id: 'certificates', label: 'Certificates', icon: 'workspace-premium' },
    { id: 'internships', label: 'Internships', icon: 'work' },
  ];

  const getFileIcon = (doc) => {
    const mime = doc.mime_type || '';
    if (mime.startsWith('image/')) return 'image';
    if (mime.includes('pdf')) return 'picture-as-pdf';
    return 'description';
  };

  const getFileColor = (doc) => {
    const mime = doc.mime_type || '';
    if (mime.startsWith('image/')) return '#6366F1';
    if (mime.includes('pdf')) return '#DC2626';
    return '#0EA5E9';
  };

  const isImageFile = (doc) => {
    const mime = doc.mime_type || '';
    const url = doc.cloudinary_url || doc.url || '';
    return mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Certificates"
        eyebrow="RIMT ACADEMIC TRUST"
        avatarUrl={currentStudent?.avatar_url || ImageAssets.profileAvatarSecondary}
        onNotificationPress={() => Alert.alert('Certificates', 'All credentials verified.')}
        onProfilePress={() => onNavigate?.('profile')}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconWrap}>
                <MaterialIcons name="workspace-premium" size={28} color="#FFD700" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Certificates & Internships</Text>
                <Text style={styles.heroSubtitle}>
                  {documents.length} certificate{documents.length !== 1 ? 's' : ''} · {internships.length} internship{internships.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{documents.length}</Text>
                <Text style={styles.statLabel}>Documents</Text>
              </View>
              <View style={[styles.statDivider]} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{internships.length}</Text>
                <Text style={styles.statLabel}>Internships</Text>
              </View>
              <View style={[styles.statDivider]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#4ADE80' }]}>
                  {documents.length + internships.length > 0 ? '✓' : '—'}
                </Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Segment Control */}
        <View style={styles.segmentRow}>
          {segments.map((seg) => (
            <TouchableOpacity
              key={seg.id}
              style={[styles.segmentBtn, activeSegment === seg.id && styles.segmentBtnActive]}
              onPress={() => setActiveSegment(seg.id)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={seg.icon}
                size={16}
                color={activeSegment === seg.id ? '#ffffff' : Colors.textSecondary}
              />
              <Text style={[styles.segmentText, activeSegment === seg.id && styles.segmentTextActive]}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload Button */}
        {(activeSegment === 'all' || activeSegment === 'certificates') && (
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={handleUploadCertificate}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, '#9B1B30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.uploadBtnGradient}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="cloud-upload" size={20} color="#fff" />
              )}
              <Text style={styles.uploadBtnText}>
                {isUploading ? 'Uploading...' : 'Upload Certificate'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Add Internship Button */}
        {(activeSegment === 'all' || activeSegment === 'internships') && (
          <TouchableOpacity
            style={styles.addInternshipBtn}
            onPress={() => setShowAddInternship(!showAddInternship)}
            activeOpacity={0.8}
          >
            <MaterialIcons name={showAddInternship ? 'close' : 'add-circle-outline'} size={20} color={Colors.secondary} />
            <Text style={styles.addInternshipText}>
              {showAddInternship ? 'Cancel' : 'Add Internship Experience'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Inline Internship Form */}
        {showAddInternship && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Add Internship Experience</Text>

            {/* Company Name */}
            <View style={styles.formField}>
              <MaterialIcons name="business" size={18} color={Colors.textSecondary} />
              <View style={styles.formInputWrap}>
                <TextInput
                  style={styles.formTextInput}
                  placeholder="Company Name *"
                  placeholderTextColor="#94A3B8"
                  value={internshipForm.company}
                  onChangeText={(val) => setInternshipForm((prev) => ({ ...prev, company: val }))}
                />
              </View>
            </View>

            {/* Role / Position */}
            <View style={styles.formField}>
              <MaterialIcons name="work" size={18} color={Colors.textSecondary} />
              <View style={styles.formInputWrap}>
                <TextInput
                  style={styles.formTextInput}
                  placeholder="Role / Position *"
                  placeholderTextColor="#94A3B8"
                  value={internshipForm.role}
                  onChangeText={(val) => setInternshipForm((prev) => ({ ...prev, role: val }))}
                />
              </View>
            </View>

            {/* Duration */}
            <View style={styles.formField}>
              <MaterialIcons name="date-range" size={18} color={Colors.textSecondary} />
              <View style={styles.formInputWrap}>
                <TextInput
                  style={styles.formTextInput}
                  placeholder="Duration (e.g. Jun–Aug 2025)"
                  placeholderTextColor="#94A3B8"
                  value={internshipForm.duration}
                  onChangeText={(val) => setInternshipForm((prev) => ({ ...prev, duration: val }))}
                />
              </View>
            </View>

            {/* Description */}
            <View style={[styles.formField, { alignItems: 'flex-start', paddingTop: 10 }]}>
              <MaterialIcons name="notes" size={18} color={Colors.textSecondary} style={{ marginTop: 2 }} />
              <View style={styles.formInputWrap}>
                <TextInput
                  style={[styles.formTextInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Description / Key Learnings (optional)"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={internshipForm.description}
                  onChangeText={(val) => setInternshipForm((prev) => ({ ...prev, description: val }))}
                />
              </View>
            </View>

            {/* Certificate URL & Upload Action */}
            <View style={styles.formField}>
              <MaterialIcons name="link" size={18} color={Colors.textSecondary} />
              <View style={styles.formInputWrap}>
                <TextInput
                  style={styles.formTextInput}
                  placeholder="Certificate URL (optional)"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={internshipForm.certificate_url}
                  onChangeText={(val) => setInternshipForm((prev) => ({ ...prev, certificate_url: val }))}
                />
              </View>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handlePickInternshipCertificate}
                disabled={isUploadingInternCert}
                activeOpacity={0.7}
              >
                {isUploadingInternCert ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="attach-file" size={15} color={Colors.primary} />
                    <Text style={styles.attachBtnText}>Attach</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.formSubmitBtn} onPress={handleAddInternship} activeOpacity={0.8}>
              <MaterialIcons name="check-circle" size={18} color="#fff" />
              <Text style={styles.formSubmitText}>Save Internship</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your credentials...</Text>
          </View>
        )}

        {/* CERTIFICATES GRID */}
        {!isLoading && (activeSegment === 'all' || activeSegment === 'certificates') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionIconBadge}>
                  <MaterialIcons name="workspace-premium" size={18} color="#FFD700" />
                </View>
                <Text style={styles.sectionTitle}>Certificates & Documents</Text>
              </View>
              <Text style={styles.sectionCount}>{documents.length}</Text>
            </View>

            {documents.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MaterialIcons name="folder-open" size={32} color={Colors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>No Certificates Yet</Text>
                <Text style={styles.emptySubtitle}>Upload your first certificate or document</Text>
              </View>
            ) : (
              <View style={styles.certGrid}>
                {documents.map((doc, idx) => {
                  const isImg = isImageFile(doc);
                  const fileColor = getFileColor(doc);
                  const sizeKb = doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : '';

                  return (
                    <ZoomCard key={doc.id || idx} style={styles.certCard} scaleTo={1.03}>
                      {/* Certificate Thumbnail / Preview */}
                      <TouchableOpacity
                        style={[styles.certThumb, { backgroundColor: `${fileColor}12` }]}
                        onPress={() => setPreviewDoc(doc)}
                        activeOpacity={0.85}
                      >
                        {isImg && getDocumentUri(doc) ? (
                          <Image
                            source={{ uri: getDocumentUri(doc) }}
                            style={styles.certImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.certFileIcon}>
                            <MaterialIcons name={getFileIcon(doc)} size={36} color={fileColor} />
                          </View>
                        )}
                        {/* Status Badge */}
                        <View style={styles.certStatusBadge}>
                          <MaterialIcons name="verified" size={10} color="#fff" />
                          <Text style={styles.certStatusText}>Verified</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Certificate Info */}
                      <View style={styles.certInfo}>
                        <Text style={styles.certTitle} numberOfLines={2}>{doc.title || 'Certificate'}</Text>
                        <Text style={styles.certIssuer} numberOfLines={1}>
                          {doc.issuer || doc.original_filename || 'Institution'}
                        </Text>
                        {sizeKb ? <Text style={styles.certMeta}>{sizeKb}</Text> : null}
                      </View>

                      {/* Action Strip */}
                      <View style={styles.certActions}>
                        {getDocumentUri(doc) && (
                          <TouchableOpacity
                            style={styles.certActionBtn}
                            onPress={() => viewOrOpenDocument(doc)}
                          >
                            <MaterialIcons name="open-in-new" size={16} color={Colors.secondary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.certActionBtn, styles.certDeleteBtn]}
                          onPress={() => handleDeleteCertificate(doc)}
                        >
                          <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </ZoomCard>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* INTERNSHIPS LIST */}
        {!isLoading && (activeSegment === 'all' || activeSegment === 'internships') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <MaterialIcons name="work" size={18} color="#3B82F6" />
                </View>
                <Text style={styles.sectionTitle}>Internship Experience</Text>
              </View>
              <Text style={styles.sectionCount}>{internships.length}</Text>
            </View>

            {internships.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MaterialIcons name="work-outline" size={32} color={Colors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>No Internships Added</Text>
                <Text style={styles.emptySubtitle}>Add your internship experience to build your profile</Text>
              </View>
            ) : (
              <View style={styles.internshipList}>
                {internships.map((intern, idx) => (
                  <ZoomCard key={intern.id || idx} style={styles.internshipCard} scaleTo={1.02}>
                    <View style={styles.internshipHeader}>
                      <View style={styles.internshipLogo}>
                        <MaterialIcons name="business" size={24} color="#3B82F6" />
                      </View>
                      <View style={styles.internshipHeaderInfo}>
                        <Text style={styles.internshipRole} numberOfLines={1}>{intern.role || 'Intern'}</Text>
                        <Text style={styles.internshipCompany} numberOfLines={1}>{intern.company || 'Company'}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteInternship(intern.id)} style={styles.internshipDeleteBtn}>
                        <MaterialIcons name="close" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>

                    {intern.duration && (
                      <View style={styles.internshipMeta}>
                        <MaterialIcons name="schedule" size={14} color="#64748B" />
                        <Text style={styles.internshipDuration}>{intern.duration}</Text>
                      </View>
                    )}

                    {intern.description && (
                      <Text style={styles.internshipDesc} numberOfLines={3}>{intern.description}</Text>
                    )}

                    {intern.certificate_url && (
                      <View style={styles.internshipCertLink}>
                        <TouchableOpacity
                          style={styles.internshipCertLinkAction}
                          onPress={() => viewOrOpenDocument({
                          title: `${intern.company || 'Internship'} Certificate`,
                          url: intern.certificate_url,
                          format: /\.pdf($|\?)/i.test(intern.certificate_url)
                            ? 'pdf'
                            : /\.docx?($|\?)/i.test(intern.certificate_url)
                              ? intern.certificate_url.toLowerCase().includes('.docx') ? 'docx' : 'doc'
                              : undefined,
                          mime_type: /\.pdf($|\?)/i.test(intern.certificate_url)
                            ? 'application/pdf'
                            : /\.docx?($|\?)/i.test(intern.certificate_url)
                              ? intern.certificate_url.toLowerCase().includes('.docx')
                                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                                : 'application/msword'
                              : undefined,
                        })}
                        >
                          <MaterialIcons name="workspace-premium" size={14} color={Colors.primary} />
                          <Text style={styles.internshipCertText}>View Certificate</Text>
                          <MaterialIcons name="open-in-new" size={12} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveInternshipDocument(intern)}
                          style={styles.internshipAttachmentDeleteBtn}
                          accessibilityLabel="Remove internship certificate"
                        >
                          <MaterialIcons name="delete-outline" size={17} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Verified Badge */}
                    <View style={styles.internshipVerifiedBadge}>
                      <MaterialIcons name="verified" size={12} color="#10B981" />
                      <Text style={styles.internshipVerifiedText}>Institutional Record</Text>
                    </View>
                  </ZoomCard>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Certificate / Document Lightbox Preview Modal */}
      <Modal
        visible={Boolean(previewDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalContent}>
            <View style={styles.previewModalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.previewModalTitle} numberOfLines={1}>
                  {previewDoc?.title || 'Academic Credential'}
                </Text>
                <Text style={styles.previewModalSubtitle}>
                  {previewDoc?.issuer || previewDoc?.original_filename || 'RIMT University Verified'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPreviewDoc(null)}
                style={styles.previewModalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewModalBody}>
              {previewDoc && isImageFile(previewDoc) && getDocumentUri(previewDoc) ? (
                <Image
                  source={{ uri: getDocumentUri(previewDoc) }}
                  style={styles.previewModalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewDocPlaceholder}>
                  <MaterialIcons
                    name={previewDoc ? getFileIcon(previewDoc) : 'description'}
                    size={64}
                    color="#FFD700"
                  />
                  <Text style={styles.previewDocName} numberOfLines={2}>{previewDoc?.title || 'Document'}</Text>
                  <Text style={styles.previewDocMeta}>
                    {previewDoc?.mime_type || previewDoc?.format || 'PDF / Document'} · Verified
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.previewModalFooter}>
              {previewDoc && getDocumentUri(previewDoc) && (
                <TouchableOpacity
                  style={styles.previewOpenExtBtn}
                  onPress={() => viewOrOpenDocument(previewDoc)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="open-in-new" size={16} color="#fff" />
                  <Text style={styles.previewOpenExtText}>Open Full Quality</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.previewDoneBtn}
                onPress={() => setPreviewDoc(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.previewDoneText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

  // Hero
  heroSection: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 12,
    paddingBottom: 4,
  },
  heroBanner: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Segments
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.margin,
    gap: 8,
    marginTop: 16,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Upload
  uploadBtn: {
    marginHorizontal: Spacing.margin,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  uploadBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Add internship
  addInternshipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.margin,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addInternshipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // Form
  formContainer: {
    marginHorizontal: Spacing.margin,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  formField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formInputWrap: {
    flex: 1,
  },
  formInput: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  formTextInput: {
    fontSize: 13,
    color: Colors.textPrimary,
    paddingVertical: 2,
  },
  attachBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  attachBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  formSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  formSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Section
  sectionWrap: {
    paddingHorizontal: Spacing.margin,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    backgroundColor: Colors.canvas,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Certificate Grid
  certGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  certCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  certThumb: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  certImage: {
    width: '100%',
    height: '100%',
  },
  certFileIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  certStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10B981',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  certStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  certInfo: {
    padding: 10,
    paddingBottom: 6,
  },
  certTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 16,
    marginBottom: 3,
  },
  certIssuer: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  certMeta: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  certActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  certActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  certDeleteBtn: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },

  // Internship cards
  internshipList: {
    gap: 10,
  },
  internshipCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  internshipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  internshipLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  internshipHeaderInfo: {
    flex: 1,
  },
  internshipRole: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  internshipCompany: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  internshipDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.canvas,
  },
  internshipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingLeft: 56,
  },
  internshipDuration: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  internshipDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
    paddingLeft: 56,
  },
  internshipCertLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(163, 19, 33, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(163, 19, 33, 0.15)',
    marginBottom: 8,
  },
  internshipCertLinkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  internshipAttachmentDeleteBtn: {
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(163, 19, 33, 0.15)',
  },
  internshipCertText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  internshipVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
  },
  internshipVerifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewModalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  previewModalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  previewModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalBody: {
    width: '100%',
    height: 340,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalImage: {
    width: '100%',
    height: '100%',
  },
  previewDocPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  previewDocName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  previewDocMeta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  previewModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewOpenExtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  previewOpenExtText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  previewDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
