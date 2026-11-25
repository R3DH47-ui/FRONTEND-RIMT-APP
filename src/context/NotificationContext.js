import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
  fetchNotifications,
  markNotificationAsRead as apiMarkRead,
  markAllNotificationsAsRead as apiMarkAllRead,
  deleteNotification as apiDelete,
  subscribeToRealtimeNotifications,
  simulateNotification,
} from '../services/notificationService';
import {
  registerForFCMAsync,
  formatIncomingFCMNotification,
  triggerLocalTestFCM,
  isRunningInExpoGo,
} from '../services/fcmService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { currentStudent } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentAlert, setRecentAlert] = useState(null); // Active in-app banner alert
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [fcmToken, setFcmToken] = useState(null);
  const bannerTimerRef = useRef(null);
  const processedKeysRef = useRef(new Map()); // Deduplication tracker: id/signature -> timestamp

  const studentRoll = currentStudent?.roll_no || currentStudent?.roll_number || 'anon';

  // Compute unread count helper
  const computeUnread = useCallback((items) => {
    if (!Array.isArray(items)) return 0;
    return items.filter((item) => !item.is_read).length;
  }, []);

  // Display floating banner alert at the header for 6.5 seconds
  const displayBannerAlert = useCallback((notification) => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }
    setRecentAlert(notification);
    bannerTimerRef.current = setTimeout(() => {
      setRecentAlert(null);
    }, 6500);
  }, []);

  // Dismiss floating banner alert manually
  const dismissAlert = useCallback(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }
    setRecentAlert(null);
  }, []);

  // Load notifications from cloud/cache for manual refresh
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchNotifications(studentRoll);
      if (res.success && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
        setUnreadCount(computeUnread(res.notifications));
      }
    } catch (e) {
      console.warn('[NotificationContext] Load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [studentRoll, computeUnread]);

  // Initial load when studentRoll changes
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchNotifications(studentRoll);
        if (active && res.success && Array.isArray(res.notifications)) {
          setNotifications(res.notifications);
          setUnreadCount(computeUnread(res.notifications));
        }
      } catch (e) {
        console.warn('[NotificationContext] Initial load error:', e);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [studentRoll, computeUnread]);

  // Handle incoming notification (unified pipeline for FCM Push & Supabase Realtime)
  // Strictly deduplicated so each real notification is processed and shown at UI EXACTLY ONCE
  const handleIncomingNotification = useCallback(
    (newNotif) => {
      if (!newNotif) return;

      // Parse JSONB 'data' field if it arrives as a string
      let parsedData = newNotif.data;
      if (parsedData && typeof parsedData === 'string') {
        try { parsedData = JSON.parse(parsedData); } catch { /* keep as-is */ }
      }

      // Canonical identity resolution across FCM and Supabase
      const canonicalId =
        newNotif.id ||
        newNotif.notification_id ||
        parsedData?.notification_id ||
        parsedData?.id;

      const entityId =
        parsedData?.drive_id ||
        parsedData?.event_id ||
        parsedData?.opportunity_id ||
        '';

      const contentKey = `${newNotif.type || 'general'}:${entityId}:${String(newNotif.title || '').trim()}:${String(newNotif.message || '').trim()}`;

      const now = Date.now();
      const existingById = canonicalId ? processedKeysRef.current.get(canonicalId) : null;
      const existingByContent = processedKeysRef.current.get(contentKey);

      // Deduplication guard: If already processed in the last 45 seconds, drop duplicate
      if ((existingById && now - existingById < 45000) || (existingByContent && now - existingByContent < 45000)) {
        console.log(`[NotificationContext] ⚡ Deduplicated duplicate notification for UI: "${newNotif.title}"`);
        return;
      }

      // Mark as processed immediately
      if (canonicalId) processedKeysRef.current.set(canonicalId, now);
      processedKeysRef.current.set(contentKey, now);

      // Prune keys older than 2 minutes
      if (processedKeysRef.current.size > 100) {
        const cutoff = now - 120000;
        for (const [k, ts] of processedKeysRef.current.entries()) {
          if (ts < cutoff) processedKeysRef.current.delete(k);
        }
      }

      const formatted = {
        ...newNotif,
        id: canonicalId || `notif-${now}`,
        data: parsedData || {},
        is_read: false,
        created_at: newNotif.created_at || new Date().toISOString(),
      };

      setNotifications((prev) => {
        // Prevent duplicate insertion into state by ID or content signature
        const exists = prev.some((item) => {
          if (item.id === formatted.id) return true;
          const itemEntity = item.data?.drive_id || item.data?.event_id || item.data?.opportunity_id || '';
          return (
            item.title === formatted.title &&
            item.message === formatted.message &&
            itemEntity === entityId
          );
        });
        if (exists) return prev;
        const updated = [formatted, ...prev];
        setUnreadCount(computeUnread(updated));
        return updated;
      });

      // Display in-app official banner alert ONCE
      displayBannerAlert(formatted);
    },
    [computeUnread, displayBannerAlert]
  );

  // 1. Initialize FCM Push Notifications & Realtime Event Listeners
  useEffect(() => {
    let isMounted = true;
    let notificationSub = null;
    let responseSub = null;
    let tokenRefreshSub = null;

    async function initFCM() {
      try {
        // Pass studentRoll so the token gets uploaded to Supabase and subscribed to FCM topic
        const token = await registerForFCMAsync(studentRoll !== 'anon' ? studentRoll : null);
        if (isMounted && token) {
          setFcmToken(token);
          console.log('[NotificationContext] 🎯 FCM Push Notification Registered:', token);
        }
      } catch (err) {
        console.warn('[NotificationContext] FCM init error:', err?.message);
      }

      // Foreground Push Notification Listener:
      // When a push notification arrives while the app is actively open,
      // expo-notifications fires this listener. We route it straight to our banner UI!
      notificationSub = Notifications.addNotificationReceivedListener((notification) => {
        try {
          const formatted = formatIncomingFCMNotification(notification);
          console.log('[NotificationContext] ⚡ FCM Foreground Notification Received:', formatted.title);
          handleIncomingNotification(formatted);
        } catch (e) {
          console.warn('[NotificationContext] Error in notification listener:', e);
        }
      });

      // Background / System Tray Tap Listener:
      // When the user taps on the system tray notification, this listener is triggered.
      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const formatted = formatIncomingFCMNotification(response?.notification);
          console.log('[NotificationContext] 🚀 Push Notification Clicked from Tray:', formatted.title);
          handleIncomingNotification(formatted);
        } catch (e) {
          console.warn('[NotificationContext] Error in response listener:', e);
        }
      });

      // Token Refresh Listener:
      // Firebase may rotate device tokens. When that happens, re-upload the new token.
      // Note: Remote token listeners are removed in Expo Go (Expo SDK 53+) and only run in Dev/Standalone builds.
      if (!isRunningInExpoGo() && typeof Notifications.addPushTokenListener === 'function') {
        try {
          tokenRefreshSub = Notifications.addPushTokenListener((newToken) => {
            try {
              const tokenData = newToken?.data;
              if (tokenData && isMounted) {
                setFcmToken(tokenData);
                console.log('[NotificationContext] 🔄 FCM Token refreshed:', tokenData);
                // Re-upload the refreshed token to Supabase
                if (studentRoll !== 'anon') {
                  import('../services/fcmService').then(({ uploadFCMTokenToSupabase }) => {
                    uploadFCMTokenToSupabase(studentRoll, tokenData, 'fcm').catch(() => {});
                  });
                }
              }
            } catch (e) {
              console.warn('[NotificationContext] Token refresh listener error:', e);
            }
          });
        } catch (tokenSubErr) {
          console.log('[NotificationContext] Push token listener skipped:', tokenSubErr?.message);
        }
      }
    }

    initFCM();

    return () => {
      isMounted = false;
      if (notificationSub) notificationSub.remove();
      if (responseSub) responseSub.remove();
      if (tokenRefreshSub) tokenRefreshSub.remove();
    };
  }, [handleIncomingNotification, studentRoll]);

  // 2. Subscribe to live PostgreSQL replication via Supabase Realtime
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeNotifications(
      (newNotif) => {
        handleIncomingNotification(newNotif);
      },
      (status) => {
        setIsLiveConnected(status === 'SUBSCRIBED');
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [handleIncomingNotification]);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      setNotifications((prev) => {
        const updated = prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        );
        setUnreadCount(computeUnread(updated));
        return updated;
      });
      await apiMarkRead(notificationId, studentRoll);
    },
    [studentRoll, computeUnread]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const allIds = notifications.map((n) => n.id);
    setNotifications((prev) => {
      const updated = prev.map((item) => ({ ...item, is_read: true }));
      setUnreadCount(0);
      return updated;
    });
    await apiMarkAllRead(allIds, studentRoll);
  }, [notifications, studentRoll]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId) => {
      setNotifications((prev) => {
        const updated = prev.filter((item) => item.id !== notificationId);
        setUnreadCount(computeUnread(updated));
        return updated;
      });
      await apiDelete(notificationId);
    },
    [computeUnread]
  );

  // Simulation trigger helper for interactive demoing & testing
  const triggerSimulatedNotification = useCallback(
    async (type = 'internship', customData = {}) => {
      const notif = await simulateNotification(type, customData);
      if (notif) {
        handleIncomingNotification(notif);
      }
      return notif;
    },
    [handleIncomingNotification]
  );

  // Immediate FCM local push test helper
  const triggerTestFCM = useCallback(
    async (options) => {
      return await triggerLocalTestFCM(options);
    },
    []
  );

  const value = {
    notifications,
    unreadCount,
    recentAlert,
    isLoading,
    isLiveConnected,
    fcmToken,
    displayBannerAlert,
    dismissAlert,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: loadNotifications,
    triggerSimulatedNotification,
    triggerTestFCM,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
