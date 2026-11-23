import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from './supabase';

export const FCM_TOKEN_STORAGE_KEY = '@rimt_fcm_token';
export const FCM_CHANNEL_ID = 'rimt_official_alerts';

/**
 * Check if the app is currently running inside the Expo Go client app.
 * In Expo SDK 53+, remote push notification tokens cannot be fetched inside Expo Go
 * and require an Expo Development Build (npx expo run:android).
 */
export function isRunningInExpoGo() {
  try {
    return (
      Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient ||
      Constants?.appOwnership === 'expo'
    );
  } catch {
    return false;
  }
}

// Configure default in-app behavior when notification arrives in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configure high-priority Android Notification Channels
 */
export async function setupAndroidNotificationChannels() {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync(FCM_CHANNEL_ID, {
      name: 'RIMT Campus Announcements',
      description: 'Official notifications for placement drives, internships, and university alerts',
      importance: AndroidImportance?.MAX ?? 7,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A365D',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('rimt_urgent_drives', {
      name: 'RIMT Urgent Placement Drives',
      description: 'Immediate deadline and placement test alerts',
      importance: AndroidImportance?.HIGH ?? 6,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#DC2626',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
      sound: 'default',
    });

    console.log('[FCM] ✅ Android Notification channels configured successfully');
  } catch (err) {
    console.warn('[FCM] ⚠️ Error setting up Android channels:', err?.message);
  }
}

/**
 * Request notification permissions and register device for FCM push tokens
 * @param {string} [studentRoll] - Optional student roll number for server-side token storage
 */
export async function registerForFCMAsync(studentRoll = null) {
  let token = null;

  try {
    await setupAndroidNotificationChannels();

    if (Platform.OS === 'web') {
      console.log('[FCM] Running in web environment; push tokens skipped.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[FCM] Push notification permissions were not granted by user.');
      return null;
    }

    // In Expo SDK 53+, remote notifications (FCM / Expo Push tokens) are removed from Expo Go on Android.
    // They are fully supported in Expo Development Builds (npx expo run:android) or production standalone builds.
    if (isRunningInExpoGo()) {
      console.log(
        '[FCM] ℹ️ Running inside Expo Go: Remote FCM push tokens require an Expo Development Build (npx expo run:android). Real-time delivery via Supabase Realtime and in-app notifications are fully active!'
      );

      let cachedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (!cachedToken) {
        cachedToken = `expo-go-${Platform.OS}-${(studentRoll || 'dev').toLowerCase()}-${Date.now().toString(36)}`;
        await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, cachedToken);
      }
      token = cachedToken;

      if (token && studentRoll) {
        uploadFCMTokenToSupabase(studentRoll, token, 'expo').catch((err) => {
          console.warn('[FCM] Token upload notice:', err?.message);
        });
      }

      return token;
    }

    // When running in a Development Build or Standalone Build:
    // 1. Attempt to obtain native FCM device registration token
    let tokenType = 'fcm';
    try {
      const deviceTokenResult = await Notifications.getDevicePushTokenAsync();
      token = deviceTokenResult?.data;
      if (token) {
        tokenType = 'fcm';
        console.log('[FCM] 🚀 Native FCM Device Token obtained:', token);
        await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      }
    } catch (deviceTokenErr) {
      console.log('[FCM] Native device token fallback:', deviceTokenErr?.message);
    }

    // 2. Fallback to Expo Push Token if native FCM token wasn't returned
    if (!token) {
      try {
        const expoTokenResult = await Notifications.getExpoPushTokenAsync({
          projectId: '892238518748',
        });
        token = expoTokenResult?.data;
        if (token) {
          tokenType = 'expo';
          console.log('[FCM] 📱 Expo Push Token obtained:', token);
          await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
        }
      } catch (expoTokenErr) {
        console.log('[FCM] Expo push token registration note:', expoTokenErr?.message);
      }
    }

    // 3. Upload token to Supabase for server-side storage and topic subscription
    if (token && studentRoll) {
      uploadFCMTokenToSupabase(studentRoll, token, tokenType).catch((err) => {
        console.warn('[FCM] Token upload notice:', err?.message);
      });
    }

    return token;
  } catch (error) {
    console.warn('[FCM] Error in registerForFCMAsync:', error?.message);
    return null;
  }
}

/**
 * Upload FCM token to Supabase fcm_tokens table for server-side management.
 * Also triggers server-side topic subscription via the admin portal API.
 *
 * @param {string} rollNo - Student roll number
 * @param {string} token - FCM or Expo push token
 * @param {string} tokenType - 'fcm' or 'expo'
 */
export async function uploadFCMTokenToSupabase(rollNo, token, tokenType = 'fcm') {
  if (!rollNo || !token) return;

  const normalizedRoll = String(rollNo).toUpperCase().trim();
  const now = new Date().toISOString();

  try {
    // Direct Supabase REST upsert using the client's credentials
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          roll_no: normalizedRoll,
          token: String(token).trim(),
          device_platform: Platform.OS || 'android',
          token_type: tokenType,
          is_active: true,
          last_refreshed_at: now,
          updated_at: now,
        },
        { onConflict: 'roll_no,token' }
      );

    if (error) {
      console.warn('[FCM] Supabase token upsert notice:', error.message);
    } else {
      console.log('[FCM] ✅ Token uploaded to Supabase for', normalizedRoll);
    }
  } catch (e) {
    console.warn('[FCM] uploadFCMTokenToSupabase error:', e?.message);
  }

  // Also try the admin portal API endpoint for topic subscription
  try {
    const ADMIN_BASE_URL = process.env.EXPO_PUBLIC_ADMIN_API_URL;
    if (ADMIN_BASE_URL && tokenType === 'fcm') {
      fetch(`${ADMIN_BASE_URL}/api/fcm/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_no: normalizedRoll,
          token,
          device_platform: Platform.OS || 'android',
          token_type: tokenType,
        }),
      }).catch(() => {});
    }
  } catch {
    // Admin API may not be reachable from student device — that's OK
    // Topic subscription happens server-side when the admin portal processes it
  }
}

/**
 * Retrieve cached push token from storage
 */
export async function getCachedFCMToken() {
  try {
    return await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Format raw notification from FCM or Expo Notifications into RIMT format
 */
export function formatIncomingFCMNotification(notification) {
  const content = notification?.request?.content || {};
  const rawData = content.data || {};

  let parsedPayload = rawData;
  if (typeof rawData.data === 'string') {
    try {
      parsedPayload = JSON.parse(rawData.data);
    } catch {
      parsedPayload = rawData;
    }
  }

  const notificationType =
    rawData.type ||
    parsedPayload.type ||
    (content.title?.toLowerCase().includes('drive') ? 'drive' : 'internship');

  // Prioritize canonical database UUID to ensure cross-transport deduplication (FCM + Realtime)
  const canonicalId =
    rawData.notification_id ||
    rawData.id ||
    parsedPayload?.notification_id ||
    parsedPayload?.id ||
    notification.request?.identifier ||
    `fcm-${Date.now()}`;

  return {
    id: canonicalId,
    title: content.title || 'New Announcement',
    message: content.body || 'New update from RIMT Training & Placement Cell.',
    type: notificationType,
    priority: rawData.priority || 'HIGH',
    data: parsedPayload || {},
    action_route: rawData.action_route || (notificationType === 'drive' ? 'placement' : 'placement'),
    created_by: rawData.created_by || 'T&P Administration',
    created_at: new Date().toISOString(),
    is_read: false,
    is_fcm_live: true,
  };
}

/**
 * Trigger immediate local notification to test FCM channel and in-app banner UI
 */
export async function triggerLocalTestFCM({
  title = 'Placement Drive: Google Cloud 2026',
  message = 'Google Cloud on-campus drive registered for 28th Nov. Package: 14 - 18 LPA.',
  type = 'drive',
  data = {},
} = {}) {
  try {
    await setupAndroidNotificationChannels();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        sound: 'default',
        channelId: type === 'drive' ? 'rimt_urgent_drives' : FCM_CHANNEL_ID,
        data: {
          type,
          priority: 'HIGH',
          ...data,
        },
      },
      trigger: null, // immediate
    });

    console.log('[FCM] 🔔 Test notification triggered immediately');
    return true;
  } catch (e) {
    console.warn('[FCM] Failed to trigger test notification:', e?.message);
    return false;
  }
}

