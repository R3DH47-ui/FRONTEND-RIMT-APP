import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radii, Typography, Spacing } from '../theme/tokens';
import { formatDocumentSize, getDocumentIcon } from '../services/documentService';
import {
  isImageDocument,
  getDocumentUri,
  viewOrOpenDocument,
  downloadDocumentToDevice,
} from '../utils/documentViewer';

export default function DocumentDetailModal({
  visible,
  document,
  onClose,
  onDelete,
}) {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  if (!document) return null;

  const uri = getDocumentUri(document);
  const isImage = isImageDocument(document);
  const isCloudinaryPdf = Boolean(
    uri &&
    uri.includes('res.cloudinary.com') &&
    (document.format === 'pdf' || (document.mime_type || '').includes('pdf') || /\.pdf($|\?)/i.test(uri))
  );
  const visualPreviewUri = isCloudinaryPdf ? uri.replace(/\.pdf($|\?)/i, '.jpg$1') : uri;
  const canShowVisualPreview = (isImage || isCloudinaryPdf) && Boolean(visualPreviewUri);
  const isLocal = document.storage_provider === 'local';
  const icon = getDocumentIcon(document);
  const iconColor = document.format === 'pdf' ? '#A31321' : isImage ? '#0284C7' : '#3E6186';
  const iconBgColor = document.format === 'pdf' ? 'rgba(163, 19, 33, 0.08)' : isImage ? 'rgba(2, 132, 199, 0.08)' : 'rgba(62, 97, 134, 0.08)';

  const handleOpen = async () => {
    setIsActionLoading(true);
    setActionMessage('Opening document...');
    await viewOrOpenDocument(document);
    setIsActionLoading(false);
    setActionMessage('');
  };

  const handleDownload = async () => {
    setIsActionLoading(true);
    setActionMessage('Preparing download...');
    await downloadDocumentToDevice(document);
    setIsActionLoading(false);
    setActionMessage('');
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      'Remove Document',
      `Are you sure you want to remove "${document.title || document.original_filename}" from your vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            setActionMessage('Removing document...');
            await onDelete(document);
            setIsActionLoading(false);
            setActionMessage('');
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.eyebrow}>RIMT CREDENTIAL VAULT</Text>
              <Text style={styles.headerTitle}>Document Overview</Text>
            </View>
            <View style={styles.headerActions}>
              {Boolean(onDelete) && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  disabled={isActionLoading}
                  accessibilityLabel="Remove document"
                >
                  <MaterialIcons name="delete-outline" size={20} color="#BA1A1A" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityLabel="Close"
              >
                <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Visual Preview */}
            {canShowVisualPreview ? (
              <View style={styles.imagePreviewWrapper}>
                <Image
                  source={{ uri: visualPreviewUri }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.docIconHeader}>
                <View style={[styles.largeIconWrapper, { backgroundColor: iconBgColor }]}>
                  <MaterialIcons name={icon} size={44} color={iconColor} />
                </View>
                <View style={styles.formatBadge}>
                  <Text style={styles.formatBadgeText}>
                    {(document.format || 'DOC').toUpperCase()}
                  </Text>
                </View>
              </View>
            )}

            {/* Document Title */}
            <Text style={styles.docTitle}>
              {document.title || document.original_filename || 'Academic Document'}
            </Text>

            {/* Trust & Verification Pill */}
            <View style={styles.trustBadgeRow}>
              <View style={styles.trustPill}>
                <MaterialIcons name="verified-user" size={14} color={Colors.verifiedGreen} />
                <Text style={styles.trustPillText}>Digitally Sealed &amp; Verified</Text>
              </View>
              <View style={[styles.storagePill, isLocal ? styles.storagePillLocal : styles.storagePillCloud]}>
                <MaterialIcons
                  name={isLocal ? 'phone-android' : 'cloud-done'}
                  size={13}
                  color={isLocal ? '#334155' : Colors.verifiedGreen}
                />
                <Text style={[styles.storagePillText, isLocal ? styles.storagePillTextLocal : styles.storagePillTextCloud]}>
                  {isLocal ? 'Saved on Device' : 'Academic Cloud'}
                </Text>
              </View>
            </View>

            {/* Details Key-Value List */}
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>File Name</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {document.original_filename || document.title || 'Unknown'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>File Size</Text>
                <Text style={styles.detailValue}>
                  {formatDocumentSize(document.file_size)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Format / MIME</Text>
                <Text style={styles.detailValue}>
                  {(document.format || 'unknown').toUpperCase()} ({document.mime_type || 'octet-stream'})
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Student Roll No</Text>
                <Text style={styles.detailValueMono}>
                  {document.roll_no || 'RIMT-STUDENT'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Storage Vault</Text>
                <Text style={styles.detailValue}>
                  {isLocal
                    ? 'Local Device Sandbox'
                    : document.storage_provider === 'supabase'
                    ? 'RIMT Supabase Storage'
                    : 'Cloudinary CDN Vault'}
                </Text>
              </View>
            </View>

            {/* Status / Loading Message */}
            {isActionLoading && (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>{actionMessage}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.openBtn}
              onPress={handleOpen}
              disabled={isActionLoading}
              activeOpacity={0.8}
            >
              <MaterialIcons name="visibility" size={18} color="#ffffff" />
              <Text style={styles.openBtnText}>Open / View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={handleDownload}
              disabled={isActionLoading}
              activeOpacity={0.8}
            >
              <MaterialIcons name="download" size={18} color={Colors.textPrimary} />
              <Text style={styles.downloadBtnText}>Download</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.margin,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: Radii.xxl,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitleGroup: {
    flex: 1,
  },
  eyebrow: {
    ...Typography.eyebrow,
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    ...Typography.headlineSm,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: 380,
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
    borderRadius: Radii.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  docIconHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  largeIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  formatBadge: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  formatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  docTitle: {
    ...Typography.headlineSm,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.verifiedGreenBg,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: Radii.full,
  },
  trustPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.verifiedGreen,
  },
  storagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: Radii.full,
  },
  storagePillLocal: {
    backgroundColor: '#F1F5F9',
  },
  storagePillCloud: {
    backgroundColor: 'rgba(46, 125, 79, 0.08)',
  },
  storagePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  storagePillTextLocal: {
    color: '#475569',
  },
  storagePillTextCloud: {
    color: Colors.verifiedGreen,
  },
  detailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  detailValueMono: {
    fontFamily: 'monospace',
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 3,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  openBtn: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  openBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  downloadBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
