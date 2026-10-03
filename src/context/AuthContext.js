import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signUpStudent,
  signInStudent,
  getActiveScholar,
  signOutStudent,
  updateStudentProfile,
  fetchStudentProfile,
  checkSupabaseConnection,
  hasRegisteredStudents,
  checkStudentApprovalStatus,
  getFullStudentData,
} from '../services/authService';
import { supabase } from '../services/supabase';

const AuthContext = createContext({
  currentStudent: null,
  isLoading: true,
  hasEverRegistered: false,
  supabaseStatus: { connected: false, tableExists: false, message: '' },
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
  refreshStatus: async () => {},
  checkStatusForStudent: async () => {},
  setApprovedStudent: () => {},
});

export const AuthProvider = ({ children }) => {
  const [currentStudent, setCurrentStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEverRegistered, setHasEverRegistered] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState({
    connected: false,
    tableExists: false,
    message: 'Checking connection...',
  });

  const refreshStatus = useCallback(async () => {
    const status = await checkSupabaseConnection();
    setSupabaseStatus(status);
    return status;
  }, []);

  // Initial load: check session & supabase health
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const [savedStudent, status, everRegistered] = await Promise.all([
          getActiveScholar(),
          checkSupabaseConnection(),
          hasRegisteredStudents(),
        ]);

        if (savedStudent) {
          const liveStatus = await checkStudentApprovalStatus({
            rollNo: savedStudent.roll_no || savedStudent.roll_number,
          });
          if (isMounted && liveStatus.status === 'APPROVED') {
            setCurrentStudent(liveStatus.student);
          } else {
            await signOutStudent();
          }
        }

        if (isMounted) {
          setSupabaseStatus(status);
          setHasEverRegistered(everRegistered);
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time synchronization: Instant updates when Admin changes profile or academics
  useEffect(() => {
    if (!currentStudent?.id && !currentStudent?.roll_no && !currentStudent?.roll_number) return;
    const studentId = currentStudent.id;
    const studentRoll = currentStudent.roll_no || currentStudent.roll_number;

    const channelId = `student-app-sync-${String(studentId || studentRoll).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, async (payload) => {
        if (payload.new && (payload.new.id === studentId || payload.new.roll_no === studentRoll)) {
          const status = (payload.new.status || '').toUpperCase();
          if (status === 'REVOKED' || status === 'REJECTED') {
            await signOutStudent();
            setCurrentStudent(null);
            return;
          }
          const fullData = await getFullStudentData(payload.new);
          setCurrentStudent((prev) => ({ ...(prev || {}), ...fullData }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles' }, (payload) => {
        if (payload.new && (payload.new.student_id === studentId)) {
          setCurrentStudent((prev) => ({
            ...(prev || {}),
            profile: payload.new,
            bio: payload.new.bio !== undefined ? payload.new.bio : prev?.bio,
            headline: payload.new.headline !== undefined ? payload.new.headline : prev?.headline,
            skills: payload.new.skills !== undefined ? payload.new.skills : prev?.skills,
            linkedin_url: payload.new.linkedin_url !== undefined ? payload.new.linkedin_url : prev?.linkedin_url,
            github_url: payload.new.github_url !== undefined ? payload.new.github_url : prev?.github_url,
            portfolio_url: payload.new.portfolio_url !== undefined ? payload.new.portfolio_url : prev?.portfolio_url,
            resume_url: payload.new.resume_url !== undefined ? payload.new.resume_url : prev?.resume_url,
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_academic_summary' }, (payload) => {
        if (payload.new && (payload.new.student_id === studentId)) {
          setCurrentStudent((prev) => ({
            ...(prev || {}),
            academic_summary: payload.new,
            cgpa: payload.new.cgpa != null ? payload.new.cgpa : prev?.cgpa,
            overall_attendance: payload.new.overall_attendance != null ? payload.new.overall_attendance : prev?.overall_attendance,
            backlogs: payload.new.backlogs != null ? payload.new.backlogs : prev?.backlogs,
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_projects' }, async (payload) => {
        if (payload.new?.student_id === studentId || payload.old?.student_id === studentId) {
          const fullData = await getFullStudentData({ id: studentId, roll_no: studentRoll });
          setCurrentStudent((prev) => ({ ...(prev || {}), ...fullData }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_git_projects' }, async (payload) => {
        if (payload.new?.student_id === studentId || payload.old?.student_id === studentId) {
          const fullData = await getFullStudentData({ id: studentId, roll_no: studentRoll });
          setCurrentStudent((prev) => ({ ...(prev || {}), ...fullData }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_certificates' }, async (payload) => {
        if (payload.new?.student_id === studentId || payload.old?.student_id === studentId) {
          const fullData = await getFullStudentData({ id: studentId, roll_no: studentRoll });
          setCurrentStudent((prev) => ({ ...(prev || {}), ...fullData }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_internships' }, async (payload) => {
        if (payload.new?.student_id === studentId || payload.old?.student_id === studentId) {
          const fullData = await getFullStudentData({ id: studentId, roll_no: studentRoll });
          setCurrentStudent((prev) => ({ ...(prev || {}), ...fullData }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStudent?.id, currentStudent?.roll_no, currentStudent?.roll_number]);

  const handleSignIn = async ({ rollNo, email, password }) => {
    await signOutStudent();
    setCurrentStudent(null);
    const result = await signInStudent({ rollNo, email, password });
    if (result.success && result.student && result.status === 'APPROVED') {
      setCurrentStudent(result.student);
    }
    return result;
  };

  const handleSignUp = async (data) => {
    const result = await signUpStudent(data);
    // Student enters PENDING queue; not logged in yet
    if (result.success) setHasEverRegistered(true);
    return result;
  };

  const handleCheckStatus = useCallback(async ({ rollNo }) => {
    const result = await checkStudentApprovalStatus({ rollNo });
    if (result.status === 'APPROVED' && result.student) {
      setCurrentStudent(result.student);
    }
    return result;
  }, []);

  const handleSetApproved = (student) => {
    setCurrentStudent(student);
  };

  const handleSignOut = useCallback(async () => {
    await signOutStudent();
    setCurrentStudent(null);
  }, []);

  const handleUpdateProfile = async (profile) => {
    if (!currentStudent?.roll_no && !currentStudent?.roll_number) {
      return { success: false, error: 'No active student' };
    }
    const result = await updateStudentProfile({
      rollNo: currentStudent.roll_no || currentStudent.roll_number,
      ...profile,
    });
    if (result.student) {
      setCurrentStudent(result.student);
    }
    return result;
  };

  /**
   * Refresh the current student profile from Supabase.
   * Call this to pull admin-updated fields (CGPA, academics, etc.)
   */
  const handleRefreshProfile = useCallback(async () => {
    const rollNo = currentStudent?.roll_no || currentStudent?.roll_number;
    if (!rollNo) return null;

    const freshProfile = await fetchStudentProfile(rollNo);
    if (freshProfile) {
      setCurrentStudent(freshProfile);
    }
    return freshProfile;
  }, [currentStudent?.roll_no, currentStudent?.roll_number]);

  return (
    <AuthContext.Provider
      value={{
        currentStudent,
        isLoading,
        hasEverRegistered,
        supabaseStatus,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        updateProfile: handleUpdateProfile,
        refreshProfile: handleRefreshProfile,
        refreshStatus,
        checkStatusForStudent: handleCheckStatus,
        setApprovedStudent: handleSetApproved,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
