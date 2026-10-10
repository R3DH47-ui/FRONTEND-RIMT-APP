import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Colors } from './src/theme/tokens';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import SignInScreen from './src/screens/SignInScreen';
import PendingApprovalScreen from './src/screens/PendingApprovalScreen';
import RejectedScreen from './src/screens/RejectedScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CredentialsScreen from './src/screens/CredentialsScreen';
import PlacementScreen from './src/screens/PlacementScreen';
import ResumeScreen from './src/screens/ResumeScreen';

import BottomNav from './src/components/BottomNav';

function MainNavigator() {
  const { currentStudent, isLoading, setApprovedStudent, checkStatusForStudent, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('signin'); // default to signin to showcase auth
  const [pendingStudent, setPendingStudent] = useState(null);
  const [rejectedStudent, setRejectedStudent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Auto-redirect based on auth state changes (restored session, sign-out, etc.)
  useEffect(() => {
    if (isLoading) return; // Wait for AuthContext to finish initializing
    const isApproved =
      currentStudent &&
      (currentStudent.status === 'APPROVED' || currentStudent.status === 'VERIFIED');

    if (isApproved && currentScreen === 'signin') {
      // Student was restored from saved session → go straight to home
      setCurrentScreen('home');
    } else if (!currentStudent && !['signin', 'onboarding'].includes(currentScreen)) {
      // Student was signed out → go to signin
      setCurrentScreen('signin');
    }
  }, [currentStudent, isLoading]);

  useEffect(() => {
    const rollNo = currentStudent?.roll_no || currentStudent?.roll_number;
    if (!rollNo || !['APPROVED', 'VERIFIED'].includes(currentStudent?.status)) return undefined;

    let isMounted = true;
    let isChecking = false;
    const verifyLiveStatus = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const result = await checkStatusForStudent({ rollNo });
        if (!isMounted || result.status === 'ERROR' || result.status === 'APPROVED') return;

        await signOut();
        if (result.status === 'REJECTED' || result.status === 'REVOKED') {
          setRejectedStudent(result.student || currentStudent);
          setRejectionReason(result.reason || result.student?.rejection_reason || result.student?.revocation_reason || 'Access is no longer approved.');
          setCurrentScreen('rejected');
        } else if (result.status === 'PENDING') {
          setPendingStudent(result.student || currentStudent);
          setCurrentScreen('pending');
        } else {
          setCurrentScreen('signin');
        }
      } finally {
        isChecking = false;
      }
    };

    const interval = setInterval(verifyLiveStatus, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentStudent?.roll_no, currentStudent?.roll_number, currentStudent?.status, checkStatusForStudent, signOut]);

  const handleNavigate = (screenId) => {
    const isApproved =
      currentStudent &&
      (currentStudent.status === 'APPROVED' || currentStudent.status === 'VERIFIED');

    const protectedScreens = ['home', 'placement', 'projects', 'profile', 'credentials', 'resume'];

    if (protectedScreens.includes(screenId)) {
      if (!isApproved) {
        Alert.alert(
          'Unauthorized: Approval Required',
          'Your account has not been approved by university administration yet. Access to the campus portal and dashboard is locked until your registration is approved.',
          [{ text: 'Understood', onPress: () => setCurrentScreen(pendingStudent ? 'pending' : 'signin') }]
        );
        return;
      }
    }

    setCurrentScreen(screenId);
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'pending':
        return (
          <PendingApprovalScreen
            student={pendingStudent}
            onApproved={(approvedUser) => {
              if (setApprovedStudent) setApprovedStudent(approvedUser);
              setCurrentScreen('home');
            }}
            onRejected={(student, reason) => {
              setRejectedStudent(student);
              setRejectionReason(reason);
              setCurrentScreen('rejected');
            }}
            onBackToSignIn={() => setCurrentScreen('signin')}
          />
        );
      case 'rejected':
        return (
          <RejectedScreen
            student={rejectedStudent}
            rejectionReason={rejectionReason}
            onBackToSignIn={() => setCurrentScreen('signin')}
          />
        );
      case 'onboarding':
        return (
          <OnboardingScreen
            onGetStarted={() => setCurrentScreen(currentStudent ? 'home' : 'signin')}
            onSignIn={() => setCurrentScreen('signin')}
          />
        );
      case 'signin':
        return (
          <SignInScreen
            onSignInSuccess={() => setCurrentScreen('home')}
            onSignUpSuccess={() => setCurrentScreen('onboarding')}
            onPendingStatus={(student) => {
              setPendingStudent(student);
              setCurrentScreen('pending');
            }}
            onRejectedStatus={(student, reason) => {
              setRejectedStudent(student);
              setRejectionReason(reason);
              setCurrentScreen('rejected');
            }}
            onNavigate={handleNavigate}
          />
        );
      case 'placement':
        return <PlacementScreen onNavigate={handleNavigate} />;
      case 'projects':
        return <ProjectsScreen onNavigate={handleNavigate} />;
      case 'profile':
        return (
          <ProfileScreen
            onNavigate={handleNavigate}
            onSignOut={() => setCurrentScreen('signin')}
          />
        );
      case 'credentials':
        return <CredentialsScreen onNavigate={handleNavigate} />;
      case 'downloads':
        return <CredentialsScreen onNavigate={handleNavigate} />;
      case 'resume':
        return <ResumeScreen onNavigate={handleNavigate} onBack={() => handleNavigate('home')} />;
      case 'home':
      default:
        return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" backgroundColor={Colors.surface} />
      <View style={styles.container}>

        {/* Main Active Screen */}
        <View style={styles.screenWrapper}>
          {renderActiveScreen()}
        </View>

        {/* Floating Bottom Nav (ONLY visible when authenticated AND approved) */}
        {Boolean(
          currentStudent &&
          (currentStudent.status === 'APPROVED' || currentStudent.status === 'VERIFIED') &&
          ['home', 'placement', 'credentials', 'projects', 'downloads', 'profile'].includes(currentScreen)
        ) && (
          <BottomNav
            activeTab={currentScreen}
            onTabPress={handleNavigate}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    position: 'relative',
  },

  screenWrapper: {
    flex: 1,
  },
});
