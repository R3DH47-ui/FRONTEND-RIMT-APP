import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radii, Typography, Spacing } from '../theme/tokens';
import ZoomCard from './ZoomCard';

export const TABS = [
  { id: 'home', label: 'Home', icon: 'dashboard' },
  { id: 'placement', label: 'Placement', icon: 'stars' },
  { id: 'projects', label: 'Projects', icon: 'folder-special' },
  { id: 'credentials', label: 'Certificates', icon: 'workspace-premium' },
  { id: 'profile', label: 'Profile', icon: 'badge' },
];

/**
 * BottomNav — Dock-style magnification bottom tab bar
 *
 * Per Mega Update Section 2.2:
 * - On discrete tap (mobile), the selected icon gets a strong scale-up + settle animation
 * - Icon + label move together as one unit
 * - Label becomes bolder on the active/hovered icon
 * - Each tab uses ZoomCard with the shared zoom interaction
 */
export default function BottomNav({ activeTab = 'home', onTabPress }) {
  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <ZoomCard
              key={tab.id}
              style={styles.tabButton}
              onPress={() => onTabPress?.(tab.id)}
              scaleTo={isActive ? 1.18 : 1.09}
              friction={5}
              tension={140}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <MaterialIcons
                  name={tab.icon}
                  size={22}
                  color={isActive ? Colors.primary : Colors.textSecondary}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                isActive && styles.activeTabLabel,
              ]}>
                {tab.label}
              </Text>
            </ZoomCard>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 14,
    left: Spacing.margin,
    right: Spacing.margin,
    alignItems: 'center',
    zIndex: 99,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#12263D',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    width: 44,
    height: 30,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(163, 19, 33, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(163, 19, 33, 0.18)',
  },
  tabLabel: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activeTabLabel: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
