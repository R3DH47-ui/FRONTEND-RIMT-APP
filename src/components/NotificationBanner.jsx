import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radii } from '../theme/tokens';
import { useNotifications } from '../context/NotificationContext';

const RIMT_LOGO = require('../../assets/rimt-logo.png');
const RIMT_CREST = require('../../assets/icon.png');

export default function NotificationBanner({ onNavigate }) {
  const { recentAlert, dismissAlert } = useNotifications();
  const [translateY] = useState(() => new Animated.Value(-140));
  const [opacity] = useState(() => new Animated.Value(0));
  const [progressAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (recentAlert) {
      // Reset values
      translateY.setValue(-140);
      opacity.setValue(0);
      progressAnim.setValue(1);

      // Slide down spring animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 13,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate progress bar depleting over 6.5 seconds
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 6500,
        useNativeDriver: false,
      }).start();
    } else {
      // Slide up hide animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -140,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [recentAlert, translateY, opacity, progressAnim]);

  if (!recentAlert) return null;

  const isInternship = recentAlert.type === 'internship';

  // Institutional Theming: Royal Navy, Collegiate Crimson, and Academic Gold
  const theme = isInternship
    ? {
        gradient: ['#0B132B', '#111D42', '#1C2541'],
        border: 'rgba(56, 189, 248, 0.45)',
        glow: '#38BDF8',
        tagText: 'INTERNSHIP NOTICE',
        tagColor: '#38BDF8',
        tagBg: 'rgba(56, 189, 248, 0.16)',
        tagBorder: 'rgba(56, 189, 248, 0.35)',
        icon: 'school',
        accentBadge: recentAlert.data?.stipend_amount
          ? `₹${Number(recentAlert.data.stipend_amount).toLocaleString('en-IN')}/mo`
          : 'Industrial Training',
        badgeBg: 'rgba(56, 189, 248, 0.2)',
        badgeColor: '#7DD3FC',
        progressColor: '#38BDF8',
      }
    : {
        gradient: ['#1A0B10', '#2D1118', '#1A1829'],
        border: 'rgba(245, 158, 11, 0.45)',
        glow: '#F59E0B',
        tagText: 'PLACEMENT DRIVE',
        tagColor: '#FBBF24',
        tagBg: 'rgba(245, 158, 11, 0.18)',
        tagBorder: 'rgba(245, 158, 11, 0.38)',
        icon: 'rocket-launch',
        accentBadge: recentAlert.data?.package_min
          ? `${recentAlert.data.package_min}${recentAlert.data.package_max ? ` - ${recentAlert.data.package_max}` : ''} LPA`
          : (recentAlert.data?.company_name || 'Campus Drive'),
        badgeBg: 'rgba(245, 158, 11, 0.22)',
        badgeColor: '#FDE68A',
        progressColor: '#F59E0B',
      };

  const handlePress = () => {
    dismissAlert();
    if (onNavigate) {
      onNavigate('notifications');
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.94}
        onPress={handlePress}
        style={styles.touchableCard}
        accessibilityRole="button"
        accessibilityLabel={`Official Notification: ${recentAlert.title}`}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: theme.border }]}
        >
          {/* Subtle Ambient Radial Highlight */}
          <View style={[styles.ambientGlow, { backgroundColor: theme.glow }]} />

          {/* ============================================================== */}
          {/* 1. OFFICIAL RIMT UNIVERSITY HEADER ROW                          */}
          {/* ============================================================== */}
          <View style={styles.officialHeaderRow}>
            {/* Left: Official University Seal & Logo */}
            <View style={styles.brandContainer}>
              <View style={styles.crestCircle}>
                <Image
                  source={RIMT_CREST}
                  style={styles.crestImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.brandTitleCol}>
                <View style={styles.univNameRow}>
                  <Text style={styles.univNameText}>RIMT UNIVERSITY</Text>
                  <View style={styles.verifiedBadge}>
                    <MaterialIcons name="verified" size={13} color="#38BDF8" />
                  </View>
                </View>
                <Text style={styles.departmentText}>TRAINING & PLACEMENT CELL • OFFICIAL</Text>
              </View>
            </View>

            {/* Right: Live Beacon & Dismiss Button */}
            <View style={styles.headerRightControls}>
              <View style={styles.liveBroadcastPill}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveBroadcastText}>OFFICIAL</Text>
              </View>

              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={dismissAlert}
                style={styles.closeBtn}
                accessibilityLabel="Dismiss banner"
              >
                <MaterialIcons name="close" size={16} color="rgba(255, 255, 255, 0.75)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider with subtle gold/cyan glow */}
          <View style={[styles.brandDivider, { backgroundColor: theme.border }]} />

          {/* ============================================================== */}
          {/* 2. TAGS & KEY METRICS (Package / Stipend / Mode)               */}
          {/* ============================================================== */}
          <View style={styles.metadataRow}>
            <View style={[styles.typeBadge, { backgroundColor: theme.tagBg, borderColor: theme.tagBorder }]}>
              <MaterialIcons name={theme.icon} size={13} color={theme.tagColor} style={styles.typeIcon} />
              <Text style={[styles.typeText, { color: theme.tagColor }]}>{theme.tagText}</Text>
            </View>

            {Boolean(theme.accentBadge) && (
              <View style={[styles.accentPill, { backgroundColor: theme.badgeBg }]}>
                <MaterialIcons
                  name={isInternship ? 'payments' : 'workspace-premium'}
                  size={12}
                  color={theme.badgeColor}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.accentText, { color: theme.badgeColor }]}>{theme.accentBadge}</Text>
              </View>
            )}
          </View>

          {/* ============================================================== */}
          {/* 3. NOTIFICATION BODY & COMPANY EMBLEM                          */}
          {/* ============================================================== */}
          <View style={styles.bodyRow}>
            {/* Horizontal RIMT Official Emblem */}
            <View style={styles.logoBadgeContainer}>
              <Image
                source={RIMT_LOGO}
                style={styles.horizontalLogo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.textColumn}>
              <Text style={styles.titleText} numberOfLines={1}>
                {recentAlert.title || 'Official Campus Announcement'}
              </Text>
              <Text style={styles.messageText} numberOfLines={2}>
                {recentAlert.message || 'New notification published by the University Training & Placement Office.'}
              </Text>
            </View>
          </View>

          {/* ============================================================== */}
          {/* 4. OFFICIAL ISSUER FOOTER & INTERACTIVE CTA                    */}
          {/* ============================================================== */}
          <View style={styles.footerRow}>
            <View style={styles.issuerInfo}>
              <MaterialIcons name="campaign" size={14} color="#94A3B8" />
              <Text style={styles.issuerText}>
                {recentAlert.created_by || 'Dean T&P Division'} · Real-Time Alert
              </Text>
            </View>

            <View style={styles.actionPill}>
              <Text style={styles.actionText}>View Notice</Text>
              <MaterialIcons name="arrow-forward" size={13} color="#FFFFFF" />
            </View>
          </View>

          {/* ============================================================== */}
          {/* 5. ANIMATED AUTO-DISMISS PROGRESS BAR                          */}
          {/* ============================================================== */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: theme.progressColor,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 22,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  touchableCard: {
    width: '100%',
    maxWidth: 540,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.2,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0A1128',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  ambientGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.14,
  },

  // 1. Official Header Row
  officialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crestCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  crestImage: {
    width: 24,
    height: 24,
  },
  brandTitleCol: {
    justifyContent: 'center',
  },
  univNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  univNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  verifiedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  departmentText: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 0.5,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBroadcastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderWidth: 0.8,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: Radii.full,
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  liveBroadcastText: {
    color: '#4ADE80',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandDivider: {
    height: 1,
    width: '100%',
    opacity: 0.4,
    marginBottom: 8,
  },

  // 2. Metadata Row
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 0.8,
  },
  typeIcon: {
    marginRight: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  accentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  accentText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // 3. Body Row
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoBadgeContainer: {
    width: 48,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  horizontalLogo: {
    width: '100%',
    height: '100%',
  },
  textColumn: {
    flex: 1,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 18,
    marginBottom: 2,
  },
  messageText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },

  // 4. Footer Row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 0.8,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  issuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  issuerText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: Radii.full,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },

  // 5. Progress Bar
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: '100%',
  },
});
