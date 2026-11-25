import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const NOTIFICATIONS_CACHE_KEY = '@rimt_notifications_cache';
const READ_RECEIPTS_PREFIX = '@rimt_read_receipts_';

// Initial realistic default notifications for immediate offline and first-launch experience
export const INITIAL_SEED_NOTIFICATIONS = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    title: 'New Internship: Cloud & DevOps Intern',
    message: 'Infosys SpringBoard opened applications for Cloud & DevOps Interns (₹25,000/month). Duration: 6 months. Mode: Hybrid (Chandigarh/Mohali). Open to BCA and B.Sc Cyber Security students.',
    type: 'internship',
    priority: 'HIGH',
    target_type: 'all',
    target_id: null,
    data: {
      opportunity_id: 'opp-infosys-cloud-2026',
      company_name: 'Infosys SpringBoard',
      title: 'Cloud & DevOps Intern',
      compensation_type: 'stipend',
      stipend_amount: 25000,
      duration_months: 6,
      work_mode: 'hybrid',
      location: 'Chandigarh / Mohali',
      application_deadline: '2026-11-15',
      required_skills: ['AWS', 'Docker', 'Linux', 'Python'],
    },
    action_route: 'placement',
    created_by: 'Prof. H. S. Bawa (Dean T&P)',
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    title: 'Placement Drive: TCS Digital & Ninja 2026',
    message: 'Tata Consultancy Services (TCS) on-campus recruitment drive is scheduled for 28th October 2026. CTC Package: 7.5 - 11.5 LPA. Eligibility: Minimum 65% aggregate with zero active backlogs. Register by 24th Oct.',
    type: 'drive',
    priority: 'URGENT',
    target_type: 'all',
    target_id: null,
    data: {
      drive_id: 'drive-tcs-2026',
      form_slug: 'tcs-digital-ninja-2026',
      registration_url: '/register/tcs-digital-ninja-2026',
      company_name: 'Tata Consultancy Services',
      role_title: 'Software Engineer / Systems Engineer',
      package_min: 7.5,
      package_max: 11.5,
      mode: 'On-campus',
      venue: 'RIMT Central Auditorium & Lab 4',
      starts_at: '2026-10-28T09:30:00Z',
      registration_deadline: '2026-10-24T23:59:00Z',
      min_cgpa: 6.5,
    },
    action_route: 'register',
    created_by: 'T&P Administration',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
  },
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    title: 'New Internship: Cyber Security Analyst Trainee',
    message: 'QuickHeal Security Labs is inviting applications for a 4-month Cyber Security Analyst Trainee role (₹20,000/month stipend). Focus: Penetration testing and network forensics.',
    type: 'internship',
    priority: 'NORMAL',
    target_type: 'all',
    target_id: null,
    data: {
      opportunity_id: 'opp-quickheal-cyber-2026',
      company_name: 'QuickHeal Security Labs',
      title: 'Cyber Security Analyst Trainee',
      compensation_type: 'stipend',
      stipend_amount: 20000,
      duration_months: 4,
      work_mode: 'remote',
      location: 'Remote',
      application_deadline: '2026-11-05',
      required_skills: ['Network Security', 'Wireshark', 'Ethical Hacking'],
    },
    action_route: 'placement',
    created_by: 'T&P Administration',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
  },
  {
    id: 'e0000000-0000-0000-0000-000000000004',
    title: 'Placement Drive: Capgemini Tech Challenge 2026',
    message: 'Capgemini national campus hiring registrations are now live for Software Analyst and Cloud Support Engineer positions. Package: 6.0 - 8.5 LPA. Pre-placement talk on 30th October.',
    type: 'drive',
    priority: 'HIGH',
    target_type: 'all',
    target_id: null,
    data: {
      drive_id: 'drive-capgemini-2026',
      company_name: 'Capgemini Technology Services',
      role_title: 'Software Analyst',
      package_min: 6.0,
      package_max: 8.5,
      mode: 'Hybrid / Virtual Assessment',
      venue: 'Online Assessment Platform',
      starts_at: '2026-10-30T10:00:00Z',
      registration_deadline: '2026-10-26T18:00:00Z',
      min_cgpa: 6.0,
    },
    action_route: 'placement',
    created_by: 'T&P Administration',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
  },
];

/**
 * Get read notification IDs for a student roll number
 */
async function getReadNotificationIds(rollNo) {
  try {
    const key = `${READ_RECEIPTS_PREFIX}${String(rollNo || 'anon').toUpperCase()}`;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[notificationService] Error reading read receipts:', e);
    return [];
  }
}

/**
 * Save read notification IDs for a student roll number
 */
async function saveReadNotificationIds(rollNo, ids) {
  try {
    const key = `${READ_RECEIPTS_PREFIX}${String(rollNo || 'anon').toUpperCase()}`;
    await AsyncStorage.setItem(key, JSON.stringify(ids));
  } catch (e) {
    console.warn('[notificationService] Error saving read receipts:', e);
  }
}

/**
 * Fetch all notifications, merging remote Supabase with offline AsyncStorage cache
 */
export async function fetchNotifications(studentRoll = 'anon') {
  let remoteList = [];
  let isFromRemote = false;

  // 1. Attempt query to Supabase notifications table
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && Array.isArray(data) && data.length > 0) {
      // Parse JSONB 'data' field if it arrives as a string from Supabase
      remoteList = data.map((item) => {
        if (item.data && typeof item.data === 'string') {
          try { item.data = JSON.parse(item.data); } catch { /* keep as-is */ }
        }
        return item;
      });
      isFromRemote = true;
    } else if (error) {
      const msg = String(error.message || '');
      if (msg.includes('fetch failed') || msg.includes('UnknownHostException') || msg.includes('Network request failed')) {
        console.log('[notificationService] ℹ️ Supabase network offline; using cached notifications.');
      } else {
        console.warn('[notificationService] Supabase query notice:', error.message);
      }
    }
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('fetch failed') || msg.includes('UnknownHostException') || msg.includes('Network request failed')) {
      console.log('[notificationService] ℹ️ Supabase offline; using local cache.');
    } else {
      console.warn('[notificationService] Supabase query notice:', msg);
    }
  }

  // 2. Load cached notifications from AsyncStorage
  let cachedList = [];
  try {
    const rawCache = await AsyncStorage.getItem(NOTIFICATIONS_CACHE_KEY);
    if (rawCache) {
      cachedList = JSON.parse(rawCache);
    }
  } catch (e) {
    console.warn('[notificationService] AsyncStorage read notice:', e);
  }

  // 3. Fallback to seed notifications if both remote and cache are empty
  if (remoteList.length === 0 && cachedList.length === 0) {
    cachedList = [...INITIAL_SEED_NOTIFICATIONS];
  }

  // 4. Merge items uniquely by ID
  const map = new Map();
  // Cached/local items first
  for (const item of cachedList) {
    if (item && item.id) map.set(item.id, item);
  }
  // Remote items take precedence and overwrite
  for (const item of remoteList) {
    if (item && item.id) map.set(item.id, item);
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  // 5. Update cache with latest merged notifications
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(merged));
  } catch {}

  // 6. Augment each notification with student's read state
  const readIds = new Set(await getReadNotificationIds(studentRoll));
  const finalNotifications = merged.map((n) => ({
    ...n,
    is_read: readIds.has(n.id) || Boolean(n.is_read_locally),
  }));

  return {
    success: true,
    notifications: finalNotifications,
    source: isFromRemote ? 'supabase' : 'cache',
  };
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId, studentRoll = 'anon') {
  try {
    const readIds = new Set(await getReadNotificationIds(studentRoll));
    readIds.add(notificationId);
    await saveReadNotificationIds(studentRoll, Array.from(readIds));

    // Also attempt remote record in student_notification_reads if connected
    try {
      await supabase
        .from('student_notification_reads')
        .upsert(
          {
            notification_id: notificationId,
            roll_no: String(studentRoll).toUpperCase(),
            read_at: new Date().toISOString(),
          },
          { onConflict: 'notification_id,roll_no' }
        );
    } catch {}

    return { success: true };
  } catch (e) {
    console.warn('[notificationService] markNotificationAsRead error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(allIds = [], studentRoll = 'anon') {
  try {
    const readIds = new Set(await getReadNotificationIds(studentRoll));
    for (const id of allIds) {
      if (id) readIds.add(id);
    }
    await saveReadNotificationIds(studentRoll, Array.from(readIds));
    return { success: true };
  } catch (e) {
    console.warn('[notificationService] markAllNotificationsAsRead error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Delete / dismiss a notification locally
 */
export async function deleteNotification(notificationId) {
  try {
    const rawCache = await AsyncStorage.getItem(NOTIFICATIONS_CACHE_KEY);
    if (rawCache) {
      const list = JSON.parse(rawCache);
      const filtered = list.filter((n) => n.id !== notificationId);
      await AsyncStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(filtered));
    }
    return { success: true };
  } catch (e) {
    console.warn('[notificationService] deleteNotification error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Subscribe to live Supabase Realtime notifications
 * Listens for new INSERT events on public.notifications
 */
export function subscribeToRealtimeNotifications(onNotificationReceived, onStatusChange) {
  try {
    const channel = supabase
      .channel('rimt_public_notifications_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload && payload.new) {
            onNotificationReceived(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('[notificationService] Realtime subscription status:', status);
        if (typeof onStatusChange === 'function') {
          onStatusChange(status);
        }
        if (status === 'SUBSCRIBED') {
          // Connected to live PostgreSQL Logical Replication
          console.log('[notificationService] ✅ Realtime: Subscribed to notifications table');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('[notificationService] ℹ️ Realtime channel standby (reconnecting in background)...');
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('[notificationService] Realtime subscription init notice:', err);
    return () => {};
  }
}

/**
 * Simulation helper: Triggers a simulated real-time event for testing
 * and immediately persists it into AsyncStorage
 */
export async function simulateNotification(type = 'internship', customData = {}) {
  const id = `sim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();

  let notification = null;

  if (type === 'internship') {
    notification = {
      id,
      title: customData.title || 'New Internship: Microsoft AI & ML Research Intern',
      message:
        customData.message ||
        'Microsoft India Development Center posted 15 internship openings for AI/ML Research Interns (₹45,000/month stipend). Duration: 6 months. Apply immediately!',
      type: 'internship',
      priority: 'HIGH',
      target_type: 'all',
      target_id: null,
      data: {
        company_name: customData.company || 'Microsoft India',
        title: customData.title || 'AI & ML Research Intern',
        compensation_type: 'stipend',
        stipend_amount: 45000,
        duration_months: 6,
        work_mode: 'hybrid',
        location: 'Hyderabad / Noida',
        application_deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
        required_skills: ['Python', 'PyTorch', 'Linear Algebra', 'NLP'],
      },
      action_route: 'placement',
      created_by: 'Prof. H. S. Bawa',
      created_at: now,
      is_read: false,
    };
  } else {
    notification = {
      id,
      title: customData.title || 'Placement Drive: Google Cloud Software Engineer',
      message:
        customData.message ||
        'Google Cloud Campus Recruitment Drive scheduled for 10th November 2026. CTC Package: 18 - 24 LPA. Eligibility: Minimum 7.5 CGPA, no active backlogs.',
      type: 'drive',
      priority: 'URGENT',
      target_type: 'all',
      target_id: null,
      data: {
        company_name: customData.company || 'Google Cloud',
        role_title: customData.title || 'Associate Cloud Engineer',
        package_min: 18.0,
        package_max: 24.0,
        mode: 'Virtual / On-campus Final Round',
        venue: 'RIMT Cyber Block Auditorium',
        starts_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        registration_deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
        min_cgpa: 7.5,
        form_slug: customData.form_slug || 'google-cloud-specialist-drive-2026',
        registration_url: customData.registration_url || '/register/google-cloud-specialist-drive-2026',
      },
      action_route: 'register',
      created_by: 'Dean T&P Office',
      created_at: now,
      is_read: false,
    };
  }

  // Prepend to AsyncStorage
  try {
    const rawCache = await AsyncStorage.getItem(NOTIFICATIONS_CACHE_KEY);
    const list = rawCache ? JSON.parse(rawCache) : [...INITIAL_SEED_NOTIFICATIONS];
    list.unshift(notification);
    await AsyncStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('[notificationService] Simulation cache error:', e);
  }

  return notification;
}
