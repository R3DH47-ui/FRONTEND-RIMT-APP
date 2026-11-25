import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  Linking,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { useNotifications } from '../context/NotificationContext';
import { getActiveScholar } from '../services/authService';
import ZoomCard from '../components/ZoomCard';

// Format relative timestamp
function formatRelativeTime(isoString) {
  if (!isoString) return 'Recent';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

export default function NotificationScreen({ onNavigate, onBack }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'internship' | 'drive' | 'unread'
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [registrationModal, setRegistrationModal] = useState({
    visible: false,
    url: '',
    title: '',
    error: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  // Filter & Search Logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Category filter
      if (activeFilter === 'internship' && notif.type !== 'internship') return false;
      if (activeFilter === 'drive' && notif.type !== 'drive') return false;
      if (activeFilter === 'unread' && notif.is_read) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (notif.title || '').toLowerCase().includes(q);
        const msgMatch = (notif.message || '').toLowerCase().includes(q);
        const companyMatch = (notif.data?.company_name || '').toLowerCase().includes(q);
        const roleMatch = (notif.data?.title || notif.data?.role_title || '').toLowerCase().includes(q);
        return titleMatch || msgMatch || companyMatch || roleMatch;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: notifications.length,
      internship: notifications.filter((n) => n.type === 'internship').length,
      drive: notifications.filter((n) => n.type === 'drive').length,
      unread: notifications.filter((n) => !n.is_read).length,
    };
  }, [notifications]);

  // Handle deep-link to career portal
  const handleActionRoute = (notification) => {
    markAsRead(notification.id);
    if (onNavigate) {
      onNavigate(notification.action_route || 'placement');
    }
  };

  // Handle student registration redirect for event/drive
  const handleRegisterForEvent = async (notification) => {
    markAsRead(notification.id);

    // Dynamic Host Resolution Algorithm
    // 1. Dynamic Metro host IP: works on both Android emulator and physical devices on local network
    const metroHostIp = Constants?.expoConfig?.hostUri
      ? Constants.expoConfig.hostUri.split(':')[0]
      : null;
    const metroOrigin = metroHostIp ? `http://${metroHostIp}:3000` : null;

    // 2. Active environment variable (excluding any stale 10.53.* subnet)
    const envOrigin =
      process.env.EXPO_PUBLIC_ADMIN_PORTAL_URL &&
      !process.env.EXPO_PUBLIC_ADMIN_PORTAL_URL.includes('10.53.')
        ? process.env.EXPO_PUBLIC_ADMIN_PORTAL_URL
        : null;

    // 3. Android emulator loopback alias fallback
    const emulatorOrigin =
      Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

    const adminOrigin =
      metroOrigin ||
      envOrigin ||
      (typeof window !== 'undefined' && window.location?.hostname
        ? `http://${window.location.hostname}:3000`
        : emulatorOrigin);

    const regUrl = notification.data?.registration_url;
    let targetPath = '';

    if (regUrl && regUrl !== 'null' && regUrl !== 'undefined') {
      targetPath = regUrl.startsWith('/') ? regUrl : `/${regUrl}`;
    } else {
      // Build slug from available notification data
      const formSlug =
        notification.data?.form_slug ||
        notification.data?.event_id ||
        (notification.title
          ? notification.title
              .toLowerCase()
              .replace(/^placement drive:\s*/i, '')
              .replace(/^cultural event:\s*/i, '')
              .replace(/^technical event:\s*/i, '')
              .replace(/^workshop:\s*/i, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
          : notification.data?.drive_id || 'event');

      targetPath = formSlug && String(formSlug).trim() ? `/register/${String(formSlug).trim()}` : '/register/event';
    }

    let targetUrl = targetPath.startsWith('http') ? targetPath : `${adminOrigin}${targetPath}`;

    // Read active scholar credentials and attach as URL query parameters so form auto-fills
    try {
      const scholar = await getActiveScholar();
      const params = [];
      if (scholar?.name || scholar?.student_name) {
        params.push(`name=${encodeURIComponent(scholar.name || scholar.student_name)}`);
      }
      if (scholar?.roll_no) {
        params.push(`roll_no=${encodeURIComponent(scholar.roll_no)}`);
      }
      if (scholar?.email) {
        params.push(`email=${encodeURIComponent(scholar.email)}`);
      }
      if (scholar?.phone) {
        params.push(`phone=${encodeURIComponent(scholar.phone)}`);
      }
      if (scholar?.department) {
        params.push(`department=${encodeURIComponent(scholar.department)}`);
      }
      if (scholar?.semester) {
        params.push(`semester=${encodeURIComponent(scholar.semester)}`);
      }
      if (params.length > 0) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + params.join('&');
      }
    } catch (e) {
      console.warn('[handleRegisterForEvent] Scholar credentials prefill note:', e?.message);
    }

    console.log('[handleRegisterForEvent] Redirecting student to browser:', targetUrl);

    // Redirect student directly to external browser per requirement
    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (canOpen) {
        await Linking.openURL(targetUrl);
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch (err) {
      console.warn('[handleRegisterForEvent] Failed to launch browser:', err?.message || err);
      Alert.alert(
        'Open Registration',
        `Tap Open to launch the registration form in your browser:\n\n${targetUrl}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Browser', onPress: () => Linking.openURL(targetUrl).catch(() => {}) },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack || (() => onNavigate?.('home'))}
            accessibilityLabel="Back to Dashboard"
          >
            <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <View style={styles.headerEyebrowRow}>
              <Text style={styles.eyebrowText}>RIMT T&P DIVISION</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>{unreadCount} unread</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerTitle}>Notifications & Alerts</Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllReadBtn}
            onPress={markAllAsRead}
            accessibilityLabel="Mark all as read"
          >
            <MaterialIcons name="done-all" size={16} color={Colors.primary} />
            <Text style={styles.markAllReadText}>Mark Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Real-time Status Toolbar */}
      <View style={styles.statusBar}>
        <View style={styles.liveSyncPill}>
          <View style={styles.greenBeacon} />
          <Text style={styles.liveSyncText}>FCM Push & Real-Time Sync Active</Text>
        </View>

        <View style={styles.officialPill}>
          <MaterialIcons name="verified" size={12} color="#0284C7" style={{ marginRight: 3 }} />
          <Text style={styles.officialPillText}>Verified T&P Feeds</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search internships, drives, companies..."
            placeholderTextColor={Colors.neutralGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="cancel" size={18} color={Colors.neutralGray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segmented Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
            All ({counts.all})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, activeFilter === 'internship' && styles.filterPillActive]}
          onPress={() => setActiveFilter('internship')}
        >
          <MaterialIcons
            name="work-outline"
            size={14}
            color={activeFilter === 'internship' ? '#ffffff' : '#7C3AED'}
            style={styles.filterIcon}
          />
          <Text style={[styles.filterText, activeFilter === 'internship' && styles.filterTextActive]}>
            Internships ({counts.internship})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, activeFilter === 'drive' && styles.filterPillActive]}
          onPress={() => setActiveFilter('drive')}
        >
          <MaterialIcons
            name="rocket-launch"
            size={14}
            color={activeFilter === 'drive' ? '#ffffff' : Colors.primary}
            style={styles.filterIcon}
          />
          <Text style={[styles.filterText, activeFilter === 'drive' && styles.filterTextActive]}>
            Drives ({counts.drive})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, activeFilter === 'unread' && styles.filterPillActive]}
          onPress={() => setActiveFilter('unread')}
        >
          <View style={[styles.unreadDot, activeFilter === 'unread' && { backgroundColor: '#ffffff' }]} />
          <Text style={[styles.filterText, activeFilter === 'unread' && styles.filterTextActive]}>
            Unread ({counts.unread})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Main Notifications Feed */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="notifications-none" size={48} color={Colors.neutralGray} />
            </View>
            <Text style={styles.emptyTitle}>No Notifications Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No alerts matching "${searchQuery}". Try a different keyword.`
                : 'All caught up! New internship opportunities and campus recruitment drives will appear here in real time.'}
            </Text>
            {Boolean(searchQuery || activeFilter !== 'all') && (
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
              >
                <Text style={styles.resetFilterText}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredNotifications.map((notif) => {
            const isInternship = notif.type === 'internship';
            const isDrive = notif.type === 'drive';
            const isExpanded = expandedId === notif.id;

            const categoryTheme = isInternship
              ? {
                  badgeBg: '#F3E8FF',
                  badgeBorder: '#D8B4FE',
                  badgeText: '#7C3AED',
                  icon: 'work',
                  label: 'INTERNSHIP MONITORING',
                  gradient: ['#7C3AED', '#6D28D9'],
                }
              : {
                  badgeBg: '#FEE2E2',
                  badgeBorder: '#FECACA',
                  badgeText: Colors.primary,
                  icon: 'rocket-launch',
                  label: 'PLACEMENT DRIVE',
                  gradient: ['#A31321', '#7A0E19'],
                };

            return (
              <ZoomCard
                key={notif.id}
                style={[
                  styles.notifCard,
                  !notif.is_read && styles.notifCardUnread,
                ]}
                scaleTo={1.015}
                raiseOnScale={false}
                onPress={() => {
                  if (!notif.is_read) markAsRead(notif.id);
                  setExpandedId(isExpanded ? null : notif.id);
                }}
              >
                {/* Unread Accent Bar */}
                {!notif.is_read && <View style={styles.unreadAccentBar} />}

                <View style={styles.cardHeaderRow}>
                  {/* Category Pill with Icon */}
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: categoryTheme.badgeBg, borderColor: categoryTheme.badgeBorder },
                    ]}
                  >
                    <MaterialIcons
                      name={categoryTheme.icon}
                      size={12}
                      color={categoryTheme.badgeText}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.categoryBadgeText, { color: categoryTheme.badgeText }]}>
                      {categoryTheme.label}
                    </Text>
                  </View>

                  <View style={styles.headerRightSection}>
                    <Text style={styles.relativeTime}>{formatRelativeTime(notif.created_at)}</Text>
                    {!notif.is_read && <View style={styles.unreadPulseDot} />}
                  </View>
                </View>

                {/* Title & Organization */}
                <View style={styles.cardBody}>
                  <Text style={[styles.notifTitle, !notif.is_read && styles.notifTitleBold]}>
                    {notif.title}
                  </Text>
                  <Text style={styles.notifMessage} numberOfLines={isExpanded ? undefined : 3}>
                    {notif.message}
                  </Text>
                </View>

                {/* Key Attributes Chips */}
                {Boolean(notif.data) && (
                  <View style={styles.chipsRow}>
                    {Boolean(notif.data?.stipend_amount) && (
                      <View style={[styles.metaChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                        <MaterialIcons name="payments" size={12} color="#059669" />
                        <Text style={[styles.metaChipText, { color: '#059669' }]}>
                          ₹{Number(notif.data.stipend_amount).toLocaleString('en-IN')}/mo
                        </Text>
                      </View>
                    )}

                    {Boolean(notif.data?.package_min) && (
                      <View style={[styles.metaChip, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                        <MaterialIcons name="grade" size={12} color="#D97706" />
                        <Text style={[styles.metaChipText, { color: '#D97706' }]}>
                          {notif.data.package_min}
                          {notif.data.package_max ? ` - ${notif.data.package_max}` : ''} LPA
                        </Text>
                      </View>
                    )}

                    {Boolean(notif.data?.work_mode || notif.data?.mode) && (
                      <View style={styles.metaChip}>
                        <MaterialIcons name="location-city" size={12} color={Colors.textSecondary} />
                        <Text style={styles.metaChipText}>
                          {notif.data.work_mode || notif.data.mode}
                        </Text>
                      </View>
                    )}

                    {Boolean(notif.data?.application_deadline || notif.data?.registration_deadline) && (
                      <View style={styles.metaChip}>
                        <MaterialIcons name="event" size={12} color={Colors.textSecondary} />
                        <Text style={styles.metaChipText}>
                          Due {new Date(notif.data.application_deadline || notif.data.registration_deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Expanded Details Section */}
                {isExpanded && Boolean(notif.data?.required_skills) && (
                  <View style={styles.skillsSection}>
                    <Text style={styles.skillsHeading}>Required Skills / Qualifications:</Text>
                    <View style={styles.skillsList}>
                      {notif.data.required_skills.map((skill, idx) => (
                        <View key={idx} style={styles.skillTag}>
                          <Text style={styles.skillTagText}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Action Buttons Row */}
                <View style={styles.cardActionsRow}>
                  {isDrive ? (
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => handleRegisterForEvent(notif)}
                    >
                      <LinearGradient
                        colors={['#9B1D2C', '#6E1521']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryActionGradient}
                      >
                        <MaterialIcons
                          name="how-to-reg"
                          size={15}
                          color="#ffffff"
                          style={{ marginRight: 5 }}
                        />
                        <Text style={styles.primaryActionText}>
                          Register Yourself for Drive
                        </Text>
                        <MaterialIcons
                          name="open-in-new"
                          size={13}
                          color="#ffffff"
                          style={{ marginLeft: 3 }}
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => handleActionRoute(notif)}
                    >
                      <LinearGradient
                        colors={categoryTheme.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryActionGradient}
                      >
                        <Text style={styles.primaryActionText}>
                          Explore Opportunity
                        </Text>
                        <MaterialIcons name="arrow-forward" size={14} color="#ffffff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  <View style={styles.cardSecondaryActions}>
                    {!notif.is_read ? (
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => markAsRead(notif.id)}
                        accessibilityLabel="Mark read"
                      >
                        <MaterialIcons name="check" size={18} color={Colors.secondary} />
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() => deleteNotification(notif.id)}
                      accessibilityLabel="Delete notification"
                    >
                      <MaterialIcons name="delete-outline" size={18} color={Colors.neutralGray} />
                    </TouchableOpacity>
                  </View>
                </View>
              </ZoomCard>
            );
          })
        )}
      </ScrollView>

      {/* IN-APP REGISTRATION WEBVIEW MODAL */}
      <Modal
        visible={registrationModal.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRegistrationModal({ visible: false, url: '', title: '', error: false })}
      >
        <SafeAreaView style={styles.regModalContainer}>
          <View style={styles.regModalHeader}>
            <TouchableOpacity
              style={styles.regModalCloseBtn}
              onPress={() => setRegistrationModal({ visible: false, url: '', title: '', error: false })}
            >
              <MaterialIcons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.regModalTitleCol}>
              <Text style={styles.regModalTitle} numberOfLines={1}>
                {registrationModal.title || 'Event Registration'}
              </Text>
              <Text style={styles.regModalSubtitle}>RIMT University • Registration Portal</Text>
            </View>

            <TouchableOpacity
              style={styles.regModalExternalBtn}
              onPress={() => {
                if (registrationModal.url) {
                  Linking.openURL(registrationModal.url).catch(() => {});
                }
              }}
            >
              <MaterialIcons name="open-in-browser" size={20} color="#ffdf9b" />
            </TouchableOpacity>
          </View>

          {registrationModal.error ? (
            /* Error State — WebView failed to load */
            <View style={styles.regModalLoading}>
              <MaterialIcons name="wifi-off" size={48} color={Colors.neutralGray} />
              <Text style={[styles.regModalLoadingText, { marginTop: 12, fontWeight: '700', color: Colors.textPrimary }]}>
                Unable to Load Registration Form
              </Text>
              <Text style={[styles.regModalLoadingText, { fontSize: 11, marginTop: 4, color: Colors.textSecondary }]}>
                The registration portal may be temporarily unavailable.{'\n'}Try opening in your browser instead.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: Colors.canvasAlt,
                    borderWidth: 1,
                    borderColor: Colors.borderLight,
                  }}
                  onPress={() => setRegistrationModal((prev) => ({ ...prev, error: false }))}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: '#9B1D2C',
                  }}
                  onPress={() => {
                    if (registrationModal.url) {
                      Linking.openURL(registrationModal.url).catch(() => {});
                    }
                    setRegistrationModal({ visible: false, url: '', title: '', error: false });
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>Open in Browser</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : registrationModal.url ? (
            <WebView
              source={{ uri: registrationModal.url }}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.regModalLoading}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.regModalLoadingText}>Loading Registration Form...</Text>
                </View>
              )}
              onError={(syntheticEvent) => {
                console.warn('[WebView] Registration form load error:', syntheticEvent.nativeEvent.description);
                setRegistrationModal((prev) => ({ ...prev, error: true }));
              }}
              onHttpError={(syntheticEvent) => {
                const { statusCode } = syntheticEvent.nativeEvent;
                console.warn('[WebView] Registration form HTTP error:', statusCode);
                if (statusCode >= 400) {
                  setRegistrationModal((prev) => ({ ...prev, error: true }));
                }
              }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
              mixedContentMode="compatibility"
              allowsInlineMediaPlayback={true}
              style={{ flex: 1 }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  header: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.spaceMd,
    paddingBottom: Spacing.spaceSm,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.spaceSm,
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    backgroundColor: Colors.canvasAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  eyebrowText: {
    ...Typography.eyebrow,
    fontSize: 9.5,
    letterSpacing: 1.1,
    color: Colors.textSecondary,
  },
  unreadCountBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radii.full,
  },
  unreadCountText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
  },
  headerTitle: {
    ...Typography.headlineSm,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  markAllReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(163, 19, 33, 0.08)',
  },
  markAllReadText: {
    ...Typography.labelButton,
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primary,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingVertical: 8,
    backgroundColor: '#FAF5FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9D5FF',
  },
  liveSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenBeacon: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  liveSyncText: {
    ...Typography.bodySm,
    fontSize: 10.5,
    fontWeight: '600',
    color: '#6B21A8',
  },
  officialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 0.8,
    borderColor: '#BAE6FD',
  },
  officialPillText: {
    ...Typography.bodySm,
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  searchWrapper: {
    paddingHorizontal: Spacing.margin,
    paddingVertical: Spacing.spaceXs,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.canvasAlt,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.spaceSm,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.spaceXs,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyDefault,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  filtersScroll: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    maxHeight: 48,
  },
  filtersContent: {
    paddingHorizontal: Spacing.margin,
    paddingVertical: 8,
    gap: Spacing.spaceXs,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: Colors.canvasAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterIcon: {
    marginRight: 4,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  filterText: {
    ...Typography.labelButton,
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.margin,
    paddingBottom: 40,
    gap: Spacing.spaceSm,
  },
  notifCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.spaceMd,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#12263D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notifCardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(163, 19, 33, 0.25)',
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  unreadAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: Colors.primary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.spaceXs,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 0.8,
  },
  categoryBadgeText: {
    ...Typography.eyebrow,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  relativeTime: {
    ...Typography.bodySm,
    fontSize: 11,
    color: Colors.neutralGray,
  },
  unreadPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
  cardBody: {
    marginBottom: Spacing.spaceXs,
  },
  notifTitle: {
    ...Typography.headlineSm,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  notifTitleBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  notifMessage: {
    ...Typography.bodyDefault,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.spaceSm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.canvasAlt,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: Radii.sm,
    borderWidth: 0.6,
    borderColor: Colors.border,
  },
  metaChipText: {
    ...Typography.codeXs,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  skillsSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.md,
    padding: Spacing.spaceSm,
    marginBottom: Spacing.spaceSm,
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
  },
  skillsHeading: {
    ...Typography.eyebrow,
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  skillTag: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.xs,
    borderWidth: 0.6,
    borderColor: '#CBD5E1',
  },
  skillTagText: {
    ...Typography.codeXs,
    fontSize: 10.5,
    color: '#334155',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.spaceXs,
    borderTopWidth: 0.6,
    borderTopColor: Colors.borderLight,
  },
  primaryActionBtn: {
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  primaryActionText: {
    ...Typography.labelButton,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardSecondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.canvasAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.margin,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.canvasAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.spaceMd,
  },
  emptyTitle: {
    ...Typography.headlineSm,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    ...Typography.bodyDefault,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
    marginBottom: Spacing.spaceLg,
  },
  resetFilterBtn: {
    backgroundColor: Colors.canvasAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetFilterText: {
    ...Typography.labelButton,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  regModalContainer: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  regModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#15151F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  regModalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  regModalTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  regModalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  regModalSubtitle: {
    fontSize: 10,
    color: '#ffdf9b',
    marginTop: 1,
  },
  regModalExternalBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  regModalLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF6F0',
  },
  regModalLoadingText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
