import { Platform } from 'react-native';

// Academic Trust Design System Tokens (from stitch_design_file_implementation/academic_trust/DESIGN.md)

export const FontFamilies = {
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }),
  sansMedium: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }),
};

export const Colors = {
  // Brand Primaries
  primary: '#a31321', // Collegiate Crimson
  primaryContainer: '#c63036',
  crimsonPressed: '#9E2227',
  onPrimary: '#ffffff',
  primaryFixed: '#ffdad7',
  primaryFixedDim: '#ffb3af',
  
  // Brand Secondaries (Institutional Navy)
  secondary: '#3e6186',
  secondaryNavy: '#2A4E72',
  secondaryContainer: '#b2d5ff',
  onSecondary: '#ffffff',
  secondaryFixed: '#d1e4ff',
  
  // Brand Tertiaries (Deep Navy Anchor)
  tertiary: '#40536c',
  tertiaryDeep: '#12263D',
  tertiaryContainer: '#586b86',
  onTertiary: '#ffffff',
  
  // Canvas & Surfaces
  canvas: '#F7F9FC',
  canvasAlt: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceDim: '#d1daeb',
  surfaceBright: '#f8f9ff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#e0e9f9',
  surfaceContainerHighest: '#dae3f4',
  
  // Text & Content Neutrals
  textPrimary: '#1B2430',
  textSecondary: '#5B6776',
  border: '#DDE3EA',
  borderLight: 'rgba(221, 227, 234, 0.85)',
  neutralGray: '#8A94A3',
  neutralChipBg: '#EEF1F5',
  
  // Status Tokens
  verifiedGreen: '#2E7D4F',
  verifiedGreenBg: 'rgba(46, 125, 79, 0.1)',
  verifiedGreenBorder: 'rgba(46, 125, 79, 0.25)',
  pendingAmber: '#B7791F',
  pendingAmberBg: 'rgba(183, 121, 31, 0.12)',
  pendingAmberBorder: 'rgba(245, 158, 11, 0.28)',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',

  // Dark/Gold accents for Harpreet Greeting Card
  goldAccent: '#d4af37',
  goldLight: '#fde68a',
  goldBorder: 'rgba(212, 175, 55, 0.4)',
  cardDarkBg: '#101218',
  cardNavyBg: '#182b42',
};

export const Spacing = {
  space2xs: 4,
  spaceXs: 8,
  spaceSm: 12,
  spaceMd: 16,
  spaceLg: 20,
  spaceXl: 24,
  space2xl: 32,
  // Shorthand aliases for universal component compatibility
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  margin: 20,
  marginMobile: 16,
  gutter: 16,
  gutterCompact: 12,
};

export const Radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  pill: 9999,
  full: 9999,
};

export const Typography = {
  // Compatibility & semantic aliases
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  bodySm: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
    color: Colors.textSecondary,
  },
  titleLarge: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    color: Colors.textPrimary,
  },
  // Source Serif 4 emulation / formal serif style
  displayHero: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    color: Colors.textPrimary,
  },
  displayHeroMobile: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    color: Colors.textPrimary,
  },
  headlineLg: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.4,
    color: Colors.textPrimary,
  },
  headlineMd: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  headlineSm: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  titleFormal: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: -0.25,
    color: Colors.textPrimary,
  },

  // Human-crafted Academic Overview Metric Card typography
  metricValue: {
    fontFamily: FontFamilies.sans,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 30,
    color: '#0F172A',
  },
  metricLabel: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.15,
    lineHeight: 16.5,
    color: '#334155',
  },

  // Human-crafted Credential Vault card typography
  credentialTitle: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.25,
    lineHeight: 20,
    color: '#0F172A',
  },
  credentialMeta: {
    fontFamily: FontFamilies.sans,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 15,
    color: '#64748B',
  },
  credentialBadge: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.25,
    lineHeight: 14,
  },
  credentialVerification: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 16,
    color: Colors.verifiedGreen,
  },

  // Inter emulation / sans-serif functional style
  bodyLg: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodyMd: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  bodyMdMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  labelMd: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  labelSm: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.88,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },

  // Roboto Mono emulation / monospace technical identifiers
  codeSm: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: Colors.textPrimary,
  },
  codeXs: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
    color: Colors.textSecondary,
  },
};

export const ImageAssets = {
  campusHero: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU0WxpQlbpxQiarnBUYXOm-UdffEHgfxRgYqHcpYW81UL5rGmsBSXxfhK8URFbOue13YJBfR1xcybNvdgqxCugUlL7eXsIsoI1LErveZBZyvEmMH4tTZ6HZdrrNzGqBBtdwIM_rGSe9idFsJn4uZz8vYonAF5dSDL1gvVbZ7xNazKnW4Gju4oR13POPiAN5oPuq68udftDyi3-cSHXEx6Exzkh1oitFx8Od_g_DO9GpZbD8BgpyZZD2A',
  universityLogo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYu7wEqEho2HzKdFJ1-f9X8GqvaK7LN8aj3MXC0GrK_VF7qROIqfjlIJZH-aM-vLTIeRa23FU3Xt0hQQ9gYLslfyaHFNvI8tRy0ob4h5GPz5XN3fNkV3iQWlsAz7n3DdNEYtyIDNlCXBzFIdU_AdUtMu_06JiFsfJg3MNuaNSQF1zttIm7CGt3GUShMLaVPN4DYBAfxRHmhVt95m1LChjUeRj4W9Z-EPahmqyawfkaOBFTBOwBCHjuUvGNqNRah7l51Eg',
  universityLogoAlt: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCY-fnLUkZMOj6CKXbXhPDz5G8qKB2oDaTHnsHe-hERjJ-2S_vudVHYlRRDvmqS2hT6aP1HRw8-Vg8TYZRbtO2IPr0QdEc68FzBA580Z4TcxilS2jqepgz20kU2czF0FheX4d_QtKiCQbzqT1wDOZAYwL0OYHodmROsCP4IK7RAjWPW4gIzDDdHdJi_qLyKVrM0D2SKz5lLamOW6vJAbVC0GE35TWodQsGwARNEKJ-D0DyB-9moRH_tuxvI2b3UG0ao-Ro',
  defaultAvatar: require('../../assets/default-avatar.png'),
  studentAvatar: require('../../assets/default-avatar.png'),
  profileAvatarSecondary: require('../../assets/default-avatar.png'),
};

/**
 * Returns a valid React Native Image source object or local asset reference.
 * Guarantees that if a student hasn't uploaded a photo, the standard default silhouette is shown.
 */
export const getAvatarSource = (avatar) => {
  if (!avatar) return ImageAssets.defaultAvatar;
  if (typeof avatar === 'number') return avatar;
  if (typeof avatar === 'string') {
    const trimmed = avatar.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
      return ImageAssets.defaultAvatar;
    }
    return { uri: trimmed };
  }
  if (typeof avatar === 'object') {
    if (avatar.uri && typeof avatar.uri === 'string' && avatar.uri.trim() && avatar.uri !== 'null') {
      return avatar;
    }
    return ImageAssets.defaultAvatar;
  }
  return ImageAssets.defaultAvatar;
};

export const getImageSource = (src, fallback = ImageAssets.campusHero) => {
  if (!src) return typeof fallback === 'string' ? { uri: fallback } : fallback;
  if (typeof src === 'number') return src;
  if (typeof src === 'string') {
    const trimmed = src.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
      return typeof fallback === 'string' ? { uri: fallback } : fallback;
    }
    return { uri: trimmed };
  }
  if (typeof src === 'object') {
    if (src.uri && typeof src.uri === 'string' && src.uri.trim() && src.uri !== 'null') {
      return src;
    }
  }
  return typeof fallback === 'string' ? { uri: fallback } : fallback;
};

