import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  pickResumeFile,
  analyzeResumeWithGemini,
  cacheAuditReport,
  getAuditReportHistory,
  rewriteFullResumeWithAi,
  applyFullRewriteToActiveDraft,
  applySectionRewriteToDraft,
  applySingleRemediationToDraft,
  POPULAR_TARGET_ROLES,
} from '../services/geminiResumeDetectorService';
import {
  loadSavedResumeData,
  saveResumeData,
} from '../services/resumeService';

// Authentic Google Product UX & Material Design 3 Design Tokens
const Google = {
  canvas: '#F8F9FA', // Google App Canvas background
  surface: '#FFFFFF', // Clean White Card surface
  surfaceVariant: '#F1F3F4', // Google Light Hover/Pill surface
  border: '#DADCE0', // Standard Google 1px Border
  borderSubtle: '#E8EAED', // Subtle divider border

  // Google Brand Accents
  blue: '#1A73E8', // Primary Google Blue
  blueHover: '#174EA6',
  blueSurface: '#E8F0FE', // Google Light Blue Pill
  blueText: '#1967D2',

  // Google Semantic Status Colors
  green: '#137333', // Google Green (Success / Verified / Passes)
  greenSurface: '#E6F4EA',
  greenBorder: '#CEEAD6',

  amber: '#B06000', // Google Amber (Warning / Improvements)
  amberSurface: '#FEF7E0',
  amberBorder: '#FEEFC3',

  red: '#C5221F', // Google Red (High Priority / Dropped)
  redSurface: '#FCE8E6',
  redBorder: '#FAD2CF',

  // Google Typography Hierarchy
  textPrimary: '#202124', // Google Dark 900
  textSecondary: '#5F6368', // Google Grey 700
  textMuted: '#80868B', // Google Grey 500
};

export default function ResumeDetectorScreen({ onNavigate, onBack }) {
  const { currentStudent } = useAuth();
  const rollNo = currentStudent?.roll_no || currentStudent?.roll_number || 'DEFAULT_STUDENT';

  // Navigation & Screen State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'issues' | 'rewrite' | 'keywords'
  const [activeRewriteSubTab, setActiveRewriteSubTab] = useState('diff'); // 'diff' | 'sections' | 'fulltext'
  const [selectedRole, setSelectedRole] = useState(POPULAR_TARGET_ROLES[0]);
  const [activeFileAsset, setActiveFileAsset] = useState(null);

  // Diagnostic State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ step: 1, message: 'Ready' });
  const [auditReport, setAuditReport] = useState(null);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState('ALL');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [activeResumeData, setActiveResumeData] = useState(null);
  const [appliedRemediations, setAppliedRemediations] = useState({});

  // AI Full Resume Rewrite State
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteProgress, setRewriteProgress] = useState('');
  const [fullRewriteResult, setFullRewriteResult] = useState(null);
  const [isApplyingAllRewrite, setIsApplyingAllRewrite] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [loadedDraft, history] = await Promise.all([
          loadSavedResumeData(rollNo, currentStudent).catch(() => null),
          getAuditReportHistory(rollNo).catch(() => []),
        ]);
        if (isMounted) {
          if (loadedDraft) setActiveResumeData(loadedDraft);
          if (history && history.length > 0) {
            setScanHistory(history);
          }
        }
      } catch (err) {
        console.warn('ResumeDetectorScreen init error:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [rollNo, currentStudent]);

  // Execute Analysis Pipeline
  const runDiagnosticOnSource = async ({ fileAsset = null, isDraft = false }) => {
    setIsScanning(true);
    setScanProgress({ step: 1, message: 'Reading document...' });
    setFullRewriteResult(null); // Reset rewrite on new scan

    try {
      let report;
      if (fileAsset) {
        setActiveFileAsset(fileAsset);
        report = await analyzeResumeWithGemini({
          fileUri: fileAsset.uri,
          fileName: fileAsset.name,
          mimeType: fileAsset.mimeType,
          targetRole: selectedRole,
          onProgress: setScanProgress,
        });
      } else if (isDraft) {
        setActiveFileAsset(null);
        if (!activeResumeData) {
          throw new Error('No resume draft found in your campus profile. Please create one in CVForge first.');
        }
        report = await analyzeResumeWithGemini({
          structuredData: activeResumeData,
          fileName: `${currentStudent?.name || 'Candidate'}_Profile_Resume.pdf`,
          targetRole: selectedRole,
          onProgress: setScanProgress,
        });
      } else {
        throw new Error('Please select a resume document to analyze.');
      }

      setAuditReport(report);
      await cacheAuditReport(rollNo, report);
      const updatedHistory = await getAuditReportHistory(rollNo);
      setScanHistory(updatedHistory);
    } catch (err) {
      console.error('Diagnostic error:', err);
      Alert.alert(
        'Unable to complete review',
        `We could not analyze this document: ${err.message || 'Please check your connection and try again.'}`
      );
    } finally {
      setIsScanning(false);
    }
  };

  // Immediate Document Pick & Auto-Scan Flow
  const handlePickAndAnalyzeDocument = async () => {
    try {
      const res = await pickResumeFile();
      if (!res.canceled) {
        await runDiagnosticOnSource({ fileAsset: res });
      }
    } catch (err) {
      Alert.alert('File Selection', 'Could not open file: ' + (err.message || ''));
    }
  };

  // Immediate Profile CV Scan Flow
  const handleScanProfileCv = async () => {
    await runDiagnosticOnSource({ isDraft: true });
  };

  // Generate Full AI Rewrite: Analyzes all mistakes and rewrites the entire resume accurately
  const handleGenerateFullAiRewrite = async () => {
    setIsRewriting(true);
    setRewriteProgress('Reading your resume and identified improvements...');

    try {
      const result = await rewriteFullResumeWithAi({
        fileUri: activeFileAsset?.uri || null,
        fileName: activeFileAsset?.name || (activeResumeData ? `${currentStudent?.name || 'Candidate'}_Profile_Resume.pdf` : ''),
        mimeType: activeFileAsset?.mimeType || null,
        structuredData: activeResumeData,
        targetRole: selectedRole,
        detectedVulnerabilities: auditReport?.vulnerabilities || [],
        onProgress: setRewriteProgress,
      });

      setFullRewriteResult(result);
      setActiveRewriteSubTab('diff'); // Switch to Before & After view so student sees all solved issues!

      Alert.alert(
        '✨ AI Resume Rewrite Complete',
        `Accurately solved ${result.totalFixesApplied || 6} issues across your resume. You can review each before-and-after fix or apply all changes to your CV draft in one click.`
      );
    } catch (err) {
      console.error('Full rewrite error:', err);
      Alert.alert(
        'Rewrite Error',
        `Could not complete AI rewrite: ${err.message || 'Please try again.'}`
      );
    } finally {
      setIsRewriting(false);
    }
  };

  // 1-Click Apply All AI Rewrite Fixes to Active Resume Draft
  const handleApplyAllRewriteToDraft = async () => {
    if (!fullRewriteResult) return;
    setIsApplyingAllRewrite(true);

    try {
      await applyFullRewriteToActiveDraft(rollNo, fullRewriteResult);
      const updated = await loadSavedResumeData(rollNo, currentStudent);
      setActiveResumeData(updated);

      Alert.alert(
        '✅ All Improvements Applied',
        'Your active CVForge resume has been fully updated with quantified bullets, elevated action verbs, and optimized skills.',
        [
          { text: 'Stay Here' },
          { text: 'Open in Resume Editor', onPress: () => onNavigate?.('resume') },
        ]
      );
    } catch (err) {
      Alert.alert('Save Error', 'Could not save rewrite to resume: ' + err.message);
    } finally {
      setIsApplyingAllRewrite(false);
    }
  };

  // Apply a single section rewrite to draft (Summary, Experience, Projects, Skills)
  const handleApplySectionToDraft = async (sectionKey, sectionData, sectionName) => {
    try {
      await applySectionRewriteToDraft(rollNo, sectionKey, sectionData);
      const updated = await loadSavedResumeData(rollNo, currentStudent);
      setActiveResumeData(updated);
      Alert.alert('✅ Section Updated', `${sectionName} has been updated in your active CVForge resume.`);
    } catch (err) {
      Alert.alert('Error', `Could not update ${sectionName}: ` + err.message);
    }
  };

  // Apply single line remediation
  const handleApplySingleRemediation = async (rem) => {
    try {
      const success = await applySingleRemediationToDraft(rollNo, rem);
      if (success) {
        const updated = await loadSavedResumeData(rollNo, currentStudent);
        setActiveResumeData(updated);
        setAppliedRemediations((prev) => ({ ...prev, [rem.id || rem.title]: true }));
        Alert.alert('✅ Fix Applied', 'Updated in your active CVForge resume draft.');
      } else {
        Alert.alert('Notice', 'Could not apply this fix automatically.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not apply improvement: ' + err.message);
    }
  };

  // Share or copy report
  const handleShareReport = async () => {
    if (!auditReport) return;
    try {
      const summary =
        `Resume Review Report\n` +
        `Document: ${auditReport.sourceFileName}\n` +
        `Target Role: ${auditReport.targetRoleAnalyzed}\n` +
        `Overall Score: ${auditReport.overallScore}/100 (${auditReport.atsStatus})\n\n` +
        `Summary:\n${auditReport.summaryVerdict}\n\n` +
        `Key Scores:\n` +
        `• ATS Readability: ${auditReport.subScores.machineParseability}%\n` +
        `• Metrics & Impact (X-Y-Z): ${auditReport.subScores.quantificationImpact}%\n` +
        `• Action Verbs: ${auditReport.subScores.actionVerbAgency}%\n` +
        `• Structure: ${auditReport.subScores.structuralIntegrity}%\n` +
        `• Conciseness: ${auditReport.subScores.brevityAndTone}%\n\n` +
        `Identified Issues: ${auditReport.vulnerabilities.length}`;

      await Share.share({
        message: summary,
        title: `Resume Score - ${auditReport.overallScore}/100`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // Copy / Share Full Rewritten Resume
  const handleShareFullRewrite = async () => {
    if (!fullRewriteResult) return;
    try {
      const content =
        fullRewriteResult.fullMarkdownResume ||
        `# ${currentStudent?.name || 'Candidate'} - ${selectedRole}\n\n` +
        `## Professional Summary\n${fullRewriteResult.rewrittenSummary}\n\n` +
        `## Quantified Experience\n` +
        fullRewriteResult.rewrittenExperience
          .map((e) => `### ${e.role} · ${e.company} (${e.duration})\n` + e.bullets.map((b) => `• ${b}`).join('\n'))
          .join('\n\n') +
        `\n\n## Technical Projects\n` +
        fullRewriteResult.rewrittenProjects
          .map((p) => `### ${p.title} [${p.tech}]\n` + p.bullets.map((b) => `• ${b}`).join('\n'))
          .join('\n\n') +
        `\n\n## Core Competencies\n` +
        fullRewriteResult.optimizedSkills.join(', ');

      await Share.share({
        message: content,
        title: `AI Rewritten Resume - ${selectedRole}`,
      });
    } catch (err) {
      console.warn('Share full rewrite error:', err);
    }
  };

  // Filtered vulnerabilities
  const filteredVulnerabilities = (auditReport?.vulnerabilities || []).filter((v) => {
    if (activeSeverityFilter === 'ALL') return true;
    return v.severity === activeSeverityFilter;
  });

  const getScoreTheme = (score) => {
    if (score >= 85) {
      return {
        color: Google.green,
        surface: Google.greenSurface,
        border: Google.greenBorder,
        badgeText: 'Top Match · ATS Ready',
      };
    }
    if (score >= 70) {
      return {
        color: Google.amber,
        surface: Google.amberSurface,
        border: Google.amberBorder,
        badgeText: 'Good · Improvements Recommended',
      };
    }
    return {
      color: Google.red,
      surface: Google.redSurface,
      border: Google.redBorder,
      badgeText: 'Needs Attention · Filter Rejection Risk',
    };
  };

  return (
    <View style={styles.container}>
      {/* Google-Style Clean App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => (onBack ? onBack() : onNavigate?.('home'))}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={22} color={Google.textPrimary} />
        </TouchableOpacity>

        <View style={styles.appBarTitleGroup}>
          <Text style={styles.appBarTitle}>Resume Review</Text>
          <Text style={styles.appBarSubtitle} numberOfLines={1}>
            ATS Compatibility & AI Rewrite · {selectedRole}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setHistoryModalVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="history" size={22} color={Google.textSecondary} />
          {scanHistory.length > 0 && <View style={styles.historyBadgeDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Target Role Selector Chips */}
        <View style={styles.roleStrip}>
          <Text style={styles.sectionHeaderLabel}>TARGET ROLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleChipsScroll}>
            {POPULAR_TARGET_ROLES.map((role) => {
              const isSelected = selectedRole === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleChip, isSelected && styles.roleChipActive]}
                  onPress={() => setSelectedRole(role)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleChipText, isSelected && styles.roleChipTextActive]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Google Workspace Document Intake Card */}
        <View style={styles.uploadCard}>
          <View style={styles.uploadCardHeader}>
            <View style={styles.uploadCardIcon}>
              <MaterialIcons name="cloud-upload" size={24} color={Google.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadCardTitle}>Review your resume</Text>
              <Text style={styles.uploadCardSubtitle}>
                Upload a PDF or Word document, or use your profile CV. Google AI will analyze formatting, ATS compatibility, and metrics, and rewrite any weak parts.
              </Text>
            </View>
          </View>

          <View style={styles.uploadCardActions}>
            <TouchableOpacity
              style={styles.primaryPillButton}
              onPress={handlePickAndAnalyzeDocument}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              <MaterialIcons name="upload-file" size={18} color="#FFFFFF" />
              <Text style={styles.primaryPillButtonText}>Upload PDF / Word</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryPillButton}
              onPress={handleScanProfileCv}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              <MaterialIcons name="account-circle" size={18} color={Google.textSecondary} />
              <Text style={styles.secondaryPillButtonText}>Scan My Profile CV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real-Time Processing Diagnostic Banner */}
        {isScanning && (
          <View style={styles.progressCard}>
            <View style={styles.progressCardHeader}>
              <ActivityIndicator size="small" color={Google.blue} />
              <Text style={styles.progressCardTitle}>Reviewing your resume...</Text>
            </View>
            <Text style={styles.progressCardStep}>{scanProgress.message}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(scanProgress.step / 4) * 100}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* RESULTS DASHBOARD (AUTHENTIC GOOGLE PRODUCT UX)                           */}
        {/* ========================================================================= */}
        {auditReport && !isScanning ? (
          <View style={styles.resultsContainer}>
            {/* Document Info Strip */}
            <View style={styles.activeDocBanner}>
              <MaterialIcons name="description" size={18} color={Google.blue} />
              <Text style={styles.activeDocName} numberOfLines={1}>
                {auditReport.sourceFileName}
              </Text>
              <TouchableOpacity
                style={styles.changeDocBtn}
                onPress={handlePickAndAnalyzeDocument}
                activeOpacity={0.7}
              >
                <Text style={styles.changeDocBtnText}>Change file</Text>
              </TouchableOpacity>
            </View>

            {/* Google Cloud Busy Transparent Notice */}
            {Boolean(auditReport.modelUsed && auditReport.modelUsed.includes('Cloud Busy')) && (
              <View style={styles.cloudBusyNoticeBanner}>
                <MaterialIcons name="info-outline" size={16} color={Google.amber} />
                <Text style={styles.cloudBusyNoticeText} numberOfLines={2}>
                  Audited via Institutional ATS Parser (Google Cloud busy).
                </Text>
                <TouchableOpacity
                  style={styles.retryCloudBtn}
                  onPress={() => runDiagnosticOnSource({ fileAsset: activeFileAsset, isDraft: !activeFileAsset })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retryCloudBtnText}>Retry Cloud AI</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Google-Style Segmented Navigation Tabs */}
            <View style={styles.segmentedTabBar}>
              <TouchableOpacity
                style={[styles.segmentTab, activeTab === 'overview' && styles.segmentTabActive]}
                onPress={() => setActiveTab('overview')}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentTabText, activeTab === 'overview' && styles.segmentTabTextActive]}>
                  Overview
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeTab === 'issues' && styles.segmentTabActive]}
                onPress={() => setActiveTab('issues')}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentTabText, activeTab === 'issues' && styles.segmentTabTextActive]}>
                  Issues ({auditReport.vulnerabilities.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeTab === 'rewrite' && styles.segmentTabActive]}
                onPress={() => setActiveTab('rewrite')}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.segmentTabText, activeTab === 'rewrite' && styles.segmentTabTextActive]}>
                    AI Rewrite
                  </Text>
                  <View style={styles.sparkleDot} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeTab === 'keywords' && styles.segmentTabActive]}
                onPress={() => setActiveTab('keywords')}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentTabText, activeTab === 'keywords' && styles.segmentTabTextActive]}>
                  Keywords
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <View style={styles.tabContent}>
                {/* Score Hero Card */}
                <View style={styles.scoreHeroCard}>
                  <View style={styles.scoreHeroTopRow}>
                    <View
                      style={[
                        styles.scoreBadgeCircle,
                        { borderColor: getScoreTheme(auditReport.overallScore).color },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreNumberLarge,
                          { color: getScoreTheme(auditReport.overallScore).color },
                        ]}
                      >
                        {auditReport.overallScore}
                      </Text>
                      <Text style={styles.scoreOutOfText}>out of 100</Text>
                    </View>

                    <View style={styles.scoreHeroMetaRight}>
                      <View
                        style={[
                          styles.statusChip,
                          {
                            backgroundColor: getScoreTheme(auditReport.overallScore).surface,
                            borderColor: getScoreTheme(auditReport.overallScore).border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            { color: getScoreTheme(auditReport.overallScore).color },
                          ]}
                        >
                          {getScoreTheme(auditReport.overallScore).badgeText}
                        </Text>
                      </View>
                      <Text style={styles.scoreSummaryText}>
                        {auditReport.summaryVerdict}
                      </Text>
                    </View>
                  </View>

                  {/* 5-Pillar Score Bars */}
                  <View style={styles.subScoresContainer}>
                    <Text style={styles.subScoresHeading}>Detailed Breakdown</Text>

                    <View style={styles.meterRow}>
                      <View style={styles.meterHeader}>
                        <Text style={styles.meterLabel}>Measurable Metrics (Google X-Y-Z)</Text>
                        <Text style={styles.meterValue}>{auditReport.subScores.quantificationImpact}%</Text>
                      </View>
                      <View style={styles.meterTrack}>
                        <View
                          style={[
                            styles.meterFill,
                            {
                              width: `${auditReport.subScores.quantificationImpact}%`,
                              backgroundColor: auditReport.subScores.quantificationImpact >= 75 ? Google.green : Google.amber,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.meterRow}>
                      <View style={styles.meterHeader}>
                        <Text style={styles.meterLabel}>Action Verbs & Agency</Text>
                        <Text style={styles.meterValue}>{auditReport.subScores.actionVerbAgency}%</Text>
                      </View>
                      <View style={styles.meterTrack}>
                        <View
                          style={[
                            styles.meterFill,
                            {
                              width: `${auditReport.subScores.actionVerbAgency}%`,
                              backgroundColor: auditReport.subScores.actionVerbAgency >= 75 ? Google.green : Google.blue,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.meterRow}>
                      <View style={styles.meterHeader}>
                        <Text style={styles.meterLabel}>ATS Readability & Layout</Text>
                        <Text style={styles.meterValue}>{auditReport.subScores.machineParseability}%</Text>
                      </View>
                      <View style={styles.meterTrack}>
                        <View
                          style={[
                            styles.meterFill,
                            { width: `${auditReport.subScores.machineParseability}%`, backgroundColor: Google.green },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.meterRow}>
                      <View style={styles.meterHeader}>
                        <Text style={styles.meterLabel}>Structure & Completeness</Text>
                        <Text style={styles.meterValue}>{auditReport.subScores.structuralIntegrity}%</Text>
                      </View>
                      <View style={styles.meterTrack}>
                        <View
                          style={[
                            styles.meterFill,
                            { width: `${auditReport.subScores.structuralIntegrity}%`, backgroundColor: Google.textSecondary },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.meterRow}>
                      <View style={styles.meterHeader}>
                        <Text style={styles.meterLabel}>Conciseness & Tone</Text>
                        <Text style={styles.meterValue}>{auditReport.subScores.brevityAndTone}%</Text>
                      </View>
                      <View style={styles.meterTrack}>
                        <View
                          style={[
                            styles.meterFill,
                            { width: `${auditReport.subScores.brevityAndTone}%`, backgroundColor: Google.blueText },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Prominent Google AI Rewrite CTA Card */}
                <TouchableOpacity
                  style={styles.quickRewriteBanner}
                  onPress={() => {
                    setActiveTab('rewrite');
                    if (!fullRewriteResult && !isRewriting) {
                      handleGenerateFullAiRewrite();
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.quickRewriteIconBg}>
                    <MaterialIcons name="auto-fix-high" size={20} color={Google.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quickRewriteTitle}>Solve all issues with Google AI</Text>
                    <Text style={styles.quickRewriteSub}>
                      AI will analyze your entire resume, solve every detected weakness into Google X-Y-Z bullets, and update your CV.
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={Google.blue} />
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: ISSUES & FIXES (WITH 1-CLICK APPLY) */}
            {activeTab === 'issues' && (
              <View style={styles.tabContent}>
                {/* Filter Chips */}
                <View style={styles.filterChipRow}>
                  {['ALL', 'CRITICAL', 'WARNING', 'ADVISORY'].map((sev) => {
                    const isSel = activeSeverityFilter === sev;
                    return (
                      <TouchableOpacity
                        key={sev}
                        style={[styles.filterPill, isSel && styles.filterPillActive]}
                        onPress={() => setActiveSeverityFilter(sev)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.filterPillText, isSel && styles.filterPillTextActive]}>
                          {sev === 'ALL'
                            ? 'All'
                            : sev === 'CRITICAL'
                            ? 'High Priority'
                            : sev === 'WARNING'
                            ? 'Suggestions'
                            : 'Formatting'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {filteredVulnerabilities.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <MaterialIcons name="check-circle" size={28} color={Google.green} />
                    <Text style={styles.emptyStateTitle}>No issues found in this category</Text>
                    <Text style={styles.emptyStateSub}>This section meets hiring and ATS standards.</Text>
                  </View>
                ) : (
                  filteredVulnerabilities.map((vuln) => {
                    const isCrit = vuln.severity === 'CRITICAL';
                    const isWarn = vuln.severity === 'WARNING';
                    const isApplied = Boolean(appliedRemediations[vuln.id || vuln.title]);

                    return (
                      <View key={vuln.id} style={styles.issueCard}>
                        <View style={styles.issueHeaderRow}>
                          <View
                            style={[
                              styles.issueSeverityPill,
                              {
                                backgroundColor: isCrit
                                  ? Google.redSurface
                                  : isWarn
                                  ? Google.amberSurface
                                  : Google.surfaceVariant,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.issueSeverityText,
                                {
                                  color: isCrit ? Google.red : isWarn ? Google.amber : Google.textSecondary,
                                },
                              ]}
                            >
                              {isCrit ? 'High Priority' : isWarn ? 'Suggestion' : 'Formatting'}
                            </Text>
                          </View>
                          <Text style={styles.issueSectionTag}>{vuln.section}</Text>
                        </View>

                        <Text style={styles.issueTitle}>{vuln.title}</Text>
                        <Text style={styles.issueExplanation}>{vuln.explanation}</Text>

                        {/* Offending snippet from candidate's resume */}
                        {Boolean(vuln.offendingSnippet) && (
                          <View style={styles.quoteBox}>
                            <Text style={styles.quoteLabel}>From your resume:</Text>
                            <Text style={styles.quoteText}>{`"${vuln.offendingSnippet}"`}</Text>
                          </View>
                        )}

                        {/* Recommended Solution */}
                        <View style={styles.remedyBox}>
                          <MaterialIcons name="lightbulb-outline" size={16} color={Google.blue} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.remedyLabel}>Recommended fix:</Text>
                            <Text style={styles.remedyText}>{vuln.remediation}</Text>
                          </View>
                        </View>

                        {/* 1-Click Apply Single Fix Action */}
                        <View style={styles.issueActionRow}>
                          <TouchableOpacity
                            style={[styles.applySingleFixBtn, isApplied && styles.applySingleFixBtnDone]}
                            onPress={() => handleApplySingleRemediation(vuln)}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons
                              name={isApplied ? 'check' : 'auto-fix-high'}
                              size={15}
                              color={isApplied ? Google.green : Google.blue}
                            />
                            <Text style={[styles.applySingleFixBtnText, isApplied && styles.applySingleFixBtnTextDone]}>
                              {isApplied ? 'Applied to Resume' : 'Apply This Fix'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB 3: AI FULL RESUME REWRITE STUDIO (SOLVES ALL MISTAKES) */}
            {activeTab === 'rewrite' && (
              <View style={styles.tabContent}>
                {/* AI Rewrite Hero Header */}
                <View style={styles.rewriteHeaderCard}>
                  <View style={styles.rewriteHeaderTop}>
                    <View style={styles.rewriteHeaderIcon}>
                      <MaterialIcons name="auto-fix-high" size={22} color={Google.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewriteHeaderTitle}>Google AI Resume Rewrite</Text>
                      <Text style={styles.rewriteHeaderSub}>
                        Analyzes every mistake across your entire resume and solves them accurately using Google&apos;s X-Y-Z formula and high-agency action verbs.
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryPillButton, isRewriting && { opacity: 0.7 }]}
                    onPress={handleGenerateFullAiRewrite}
                    disabled={isRewriting}
                    activeOpacity={0.8}
                  >
                    {isRewriting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <MaterialIcons name="auto-fix-high" size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.primaryPillButtonText}>
                      {isRewriting
                        ? 'Solving all resume issues...'
                        : fullRewriteResult
                        ? 'Re-generate Full Rewrite'
                        : 'Generate Full AI Rewrite'}
                    </Text>
                  </TouchableOpacity>

                  {isRewriting && <Text style={styles.rewriteProgressNotice}>{rewriteProgress}</Text>}
                </View>

                {/* Display Full Rewrite Content */}
                {fullRewriteResult ? (
                  <View style={styles.rewriteResultContainer}>
                    {/* Score Impact Banner */}
                    <View style={styles.impactCard}>
                      <View style={styles.impactScoreRow}>
                        <View style={styles.impactScoreBadge}>
                          <Text style={styles.impactScoreBefore}>
                            {fullRewriteResult.estimatedScoreBefore || 62}
                          </Text>
                          <MaterialIcons name="arrow-forward" size={16} color={Google.green} />
                          <Text style={styles.impactScoreAfter}>
                            {fullRewriteResult.estimatedScoreAfter || 96}
                          </Text>
                          <Text style={styles.impactScorePts}>/ 100</Text>
                        </View>
                        <View style={styles.impactSolvedPill}>
                          <MaterialIcons name="check" size={14} color={Google.green} />
                          <Text style={styles.impactSolvedPillText}>
                            {fullRewriteResult.totalFixesApplied || 6} Issues Solved
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.impactSummaryText}>
                        All weak bullet points were rewritten with quantitative results and action verbs tailored for {selectedRole}.
                      </Text>
                    </View>

                    {/* Sub-Tab Navigation for Rewrite Studio */}
                    <View style={styles.rewriteSubNav}>
                      <TouchableOpacity
                        style={[styles.rewriteSubTab, activeRewriteSubTab === 'diff' && styles.rewriteSubTabActive]}
                        onPress={() => setActiveRewriteSubTab('diff')}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rewriteSubTabText,
                            activeRewriteSubTab === 'diff' && styles.rewriteSubTabTextActive,
                          ]}
                        >
                          Before & After ({fullRewriteResult.solvedIssues?.length || 0})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.rewriteSubTab, activeRewriteSubTab === 'sections' && styles.rewriteSubTabActive]}
                        onPress={() => setActiveRewriteSubTab('sections')}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rewriteSubTabText,
                            activeRewriteSubTab === 'sections' && styles.rewriteSubTabTextActive,
                          ]}
                        >
                          By Section
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.rewriteSubTab, activeRewriteSubTab === 'fulltext' && styles.rewriteSubTabActive]}
                        onPress={() => setActiveRewriteSubTab('fulltext')}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rewriteSubTabText,
                            activeRewriteSubTab === 'fulltext' && styles.rewriteSubTabTextActive,
                          ]}
                        >
                          Full Resume
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* SUB-VIEW 1: BEFORE & AFTER SOLVED ISSUES (USER REQUEST REQUIREMENT) */}
                    {activeRewriteSubTab === 'diff' && (
                      <View style={{ gap: 10 }}>
                        {fullRewriteResult.solvedIssues && fullRewriteResult.solvedIssues.length > 0 ? (
                          fullRewriteResult.solvedIssues.map((issue, idx) => (
                            <View key={idx} style={styles.diffCard}>
                              <View style={styles.diffHeader}>
                                <Text style={styles.diffSectionTag}>{issue.section || 'Work Experience'}</Text>
                                <Text style={styles.diffTitle}>{issue.title || `Issue #${idx + 1} Solved`}</Text>
                              </View>

                              {/* Original Flaw (Before) */}
                              <View style={styles.diffBeforeBox}>
                                <View style={styles.diffLabelRow}>
                                  <MaterialIcons name="close" size={14} color={Google.red} />
                                  <Text style={styles.diffBeforeLabel}>BEFORE (Original Weak Point):</Text>
                                </View>
                                <Text style={styles.diffBeforeText}>{issue.before}</Text>
                              </View>

                              {/* Solved Revision (After) */}
                              <View style={styles.diffAfterBox}>
                                <View style={styles.diffLabelRow}>
                                  <MaterialIcons name="check" size={14} color={Google.green} />
                                  <Text style={styles.diffAfterLabel}>AFTER (Google X-Y-Z Solved Revision):</Text>
                                </View>
                                <Text style={styles.diffAfterText}>{issue.after}</Text>
                              </View>

                              {/* Explanation of fix */}
                              {Boolean(issue.explanation) && (
                                <Text style={styles.diffExplanationText}>{issue.explanation}</Text>
                              )}
                            </View>
                          ))
                        ) : (
                          <View style={styles.emptyStateCard}>
                            <MaterialIcons name="done-all" size={28} color={Google.green} />
                            <Text style={styles.emptyStateTitle}>All detected flaws resolved</Text>
                            <Text style={styles.emptyStateSub}>
                              Review each section in the &quot;By Section&quot; tab to inspect the complete resume.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* SUB-VIEW 2: BY SECTION (SUMMARY, EXP, PROJECTS, SKILLS) */}
                    {activeRewriteSubTab === 'sections' && (
                      <View style={{ gap: 12 }}>
                        {/* Summary Card */}
                        <View style={styles.rewriteSectionCard}>
                          <View style={styles.rewriteSectionTitleRow}>
                            <MaterialIcons name="person" size={18} color={Google.blue} />
                            <Text style={styles.rewriteSectionTitle}>Rewritten Professional Summary</Text>
                            <TouchableOpacity
                              style={styles.sectionApplyBtn}
                              onPress={() =>
                                handleApplySectionToDraft(
                                  'summary',
                                  fullRewriteResult.rewrittenSummary,
                                  'Professional Summary'
                                )
                              }
                            >
                              <Text style={styles.sectionApplyBtnText}>Apply</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.rewriteContentText}>{fullRewriteResult.rewrittenSummary}</Text>
                        </View>

                        {/* Rewritten Work Experience */}
                        {fullRewriteResult.rewrittenExperience.length > 0 && (
                          <View style={styles.rewriteSectionCard}>
                            <View style={styles.rewriteSectionTitleRow}>
                              <MaterialIcons name="work" size={18} color={Google.blue} />
                              <Text style={styles.rewriteSectionTitle}>Quantified Work Experience</Text>
                              <TouchableOpacity
                                style={styles.sectionApplyBtn}
                                onPress={() =>
                                  handleApplySectionToDraft(
                                    'experience',
                                    fullRewriteResult.rewrittenExperience,
                                    'Work Experience'
                                  )
                                }
                              >
                                <Text style={styles.sectionApplyBtnText}>Apply</Text>
                              </TouchableOpacity>
                            </View>
                            {fullRewriteResult.rewrittenExperience.map((exp, idx) => (
                              <View key={idx} style={styles.expBlock}>
                                <Text style={styles.expRoleTitle}>
                                  {exp.role} · {exp.company}
                                </Text>
                                {exp.duration ? <Text style={styles.expDuration}>{exp.duration}</Text> : null}
                                {exp.bullets.map((b, bIdx) => (
                                  <View key={bIdx} style={styles.bulletRow}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.bulletText}>{b}</Text>
                                  </View>
                                ))}
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Rewritten Projects */}
                        {fullRewriteResult.rewrittenProjects.length > 0 && (
                          <View style={styles.rewriteSectionCard}>
                            <View style={styles.rewriteSectionTitleRow}>
                              <MaterialIcons name="code" size={18} color={Google.blue} />
                              <Text style={styles.rewriteSectionTitle}>Enhanced Technical Projects</Text>
                              <TouchableOpacity
                                style={styles.sectionApplyBtn}
                                onPress={() =>
                                  handleApplySectionToDraft(
                                    'projects',
                                    fullRewriteResult.rewrittenProjects,
                                    'Technical Projects'
                                  )
                                }
                              >
                                <Text style={styles.sectionApplyBtnText}>Apply</Text>
                              </TouchableOpacity>
                            </View>
                            {fullRewriteResult.rewrittenProjects.map((proj, idx) => (
                              <View key={idx} style={styles.expBlock}>
                                <Text style={styles.expRoleTitle}>{proj.title}</Text>
                                {Boolean(proj.tech) && <Text style={styles.projTechText}>Stack: {proj.tech}</Text>}
                                {proj.bullets.map((b, bIdx) => (
                                  <View key={bIdx} style={styles.bulletRow}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.bulletText}>{b}</Text>
                                  </View>
                                ))}
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Optimized Skills */}
                        {fullRewriteResult.optimizedSkills.length > 0 && (
                          <View style={styles.rewriteSectionCard}>
                            <View style={styles.rewriteSectionTitleRow}>
                              <MaterialIcons name="psychology" size={18} color={Google.blue} />
                              <Text style={styles.rewriteSectionTitle}>Optimized Skills ({selectedRole})</Text>
                              <TouchableOpacity
                                style={styles.sectionApplyBtn}
                                onPress={() =>
                                  handleApplySectionToDraft(
                                    'skills',
                                    fullRewriteResult.optimizedSkills,
                                    'Skills'
                                  )
                                }
                              >
                                <Text style={styles.sectionApplyBtnText}>Apply</Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.skillsChipRow}>
                              {fullRewriteResult.optimizedSkills.map((s, idx) => (
                                <View key={idx} style={styles.skillPill}>
                                  <Text style={styles.skillPillText}>{s}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* SUB-VIEW 3: FULL RESUME MARKDOWN / TEXT */}
                    {activeRewriteSubTab === 'fulltext' && (
                      <View style={styles.rewriteSectionCard}>
                        <View style={styles.rewriteSectionTitleRow}>
                          <MaterialIcons name="article" size={18} color={Google.blue} />
                          <Text style={styles.rewriteSectionTitle}>Complete Rewritten Resume</Text>
                          <TouchableOpacity
                            style={styles.sectionApplyBtn}
                            onPress={handleShareFullRewrite}
                          >
                            <Text style={styles.sectionApplyBtnText}>Copy / Share</Text>
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true}>
                          <Text style={styles.fullResumeText}>
                            {fullRewriteResult.fullMarkdownResume ||
                              `Summary:\n${fullRewriteResult.rewrittenSummary}\n\n` +
                                `Experience:\n` +
                                fullRewriteResult.rewrittenExperience
                                  .map((e) => `• ${e.role} at ${e.company}:\n  ${e.bullets.join('\n  ')}`)
                                  .join('\n\n') +
                                `\n\nProjects:\n` +
                                fullRewriteResult.rewrittenProjects
                                  .map((p) => `• ${p.title} (${p.tech}):\n  ${p.bullets.join('\n  ')}`)
                                  .join('\n\n') +
                                `\n\nSkills:\n` +
                                fullRewriteResult.optimizedSkills.join(', ')}
                          </Text>
                        </ScrollView>
                      </View>
                    )}

                    {/* 1-Click Master Action Bar */}
                    <View style={styles.applyRewriteBar}>
                      <TouchableOpacity
                        style={[styles.applyAllBtn, isApplyingAllRewrite && { opacity: 0.7 }]}
                        onPress={handleApplyAllRewriteToDraft}
                        disabled={isApplyingAllRewrite}
                        activeOpacity={0.8}
                      >
                        {isApplyingAllRewrite ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <MaterialIcons name="done-all" size={20} color="#FFFFFF" />
                        )}
                        <Text style={styles.applyAllBtnText}>Apply All Changes to My Resume</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.shareRewriteBtn}
                        onPress={handleShareFullRewrite}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="share" size={18} color={Google.textPrimary} />
                        <Text style={styles.shareRewriteBtnText}>Share / Export Text</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : !isRewriting ? (
                  <View style={styles.emptyStateCard}>
                    <MaterialIcons name="auto-fix-high" size={32} color={Google.blue} />
                    <Text style={styles.emptyStateTitle}>Ready to solve your resume</Text>
                    <Text style={styles.emptyStateSub}>
                      Tap &quot;Generate Full AI Rewrite&quot; above to solve all identified weaknesses into quantified, ATS-ready bullet points.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* TAB 4: KEYWORDS */}
            {activeTab === 'keywords' && (
              <View style={styles.tabContent}>
                <View style={styles.keywordCard}>
                  <Text style={styles.keywordCardTitle}>Role Keyword Alignment</Text>
                  <Text style={styles.keywordCardSubtitle}>
                    Critical recruitment keywords for {auditReport.targetRoleAnalyzed}
                  </Text>

                  <View style={styles.kwGroup}>
                    <Text style={styles.kwGroupHeading}>✓ Verified in your resume</Text>
                    <View style={styles.kwChipsRow}>
                      {auditReport.competencies.verified.length > 0 ? (
                        auditReport.competencies.verified.map((kw, i) => (
                          <View key={i} style={styles.matchedChip}>
                            <MaterialIcons name="check" size={13} color={Google.green} />
                            <Text style={styles.matchedChipText}>{kw}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.kwEmptyNotice}>No key technical words identified yet.</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.kwGroup}>
                    <Text style={styles.kwGroupHeading}>+ Recommended to add</Text>
                    <View style={styles.kwChipsRow}>
                      {auditReport.competencies.missing.length > 0 ? (
                        auditReport.competencies.missing.map((kw, i) => (
                          <View key={i} style={styles.missingChip}>
                            <MaterialIcons name="add" size={13} color={Google.amber} />
                            <Text style={styles.missingChipText}>{kw}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.kwEmptyNotice}>Great job! All critical keywords present.</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.keywordTipCard}>
                    <MaterialIcons name="info-outline" size={16} color={Google.blue} />
                    <Text style={styles.keywordTipText}>
                      Tip: When you run the AI Rewrite, these missing keywords are automatically woven into your project and experience bullet points.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Global Bottom Actions Bar */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.bottomOutlineBtn}
                onPress={handleShareReport}
                activeOpacity={0.8}
              >
                <MaterialIcons name="share" size={18} color={Google.textPrimary} />
                <Text style={styles.bottomOutlineBtnText}>Share Report</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomSolidBtn}
                onPress={() => onNavigate?.('resume')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                <Text style={styles.bottomSolidBtnText}>Open in CVForge</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !isScanning ? (
          /* Empty Intake Placeholder */
          <View style={styles.emptyIntakeCard}>
            <MaterialIcons name="fact-check" size={40} color={Google.textSecondary} />
            <Text style={styles.emptyIntakeTitle}>No resume analyzed yet</Text>
            <Text style={styles.emptyIntakeSub}>
              Select a resume document above to check ATS parseability, identify mistakes, and generate instant AI rewrites.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Audit History Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Past Reviews</Text>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setHistoryModalVisible(false)}
              >
                <MaterialIcons name="close" size={22} color={Google.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {scanHistory.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: Google.textMuted }}>No past reviews found.</Text>
                </View>
              ) : (
                scanHistory.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItemCard}
                    onPress={() => {
                      setAuditReport(item.report);
                      setHistoryModalVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histFileName} numberOfLines={1}>
                        {item.report.sourceFileName || 'Resume Document'}
                      </Text>
                      <Text style={styles.histDate}>
                        {new Date(item.timestamp).toLocaleDateString()} · {item.report.targetRoleAnalyzed}
                      </Text>
                    </View>
                    <View style={styles.histScorePill}>
                      <Text style={styles.histScoreVal}>{item.report.overallScore}/100</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Google.canvas,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 12,
    backgroundColor: Google.surface,
    borderBottomWidth: 1,
    borderBottomColor: Google.borderSubtle,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  appBarTitleGroup: {
    flex: 1,
    marginLeft: 4,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  appBarSubtitle: {
    fontSize: 12.5,
    color: Google.textSecondary,
    marginTop: 1,
  },
  historyBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Google.blue,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  roleStrip: {
    marginBottom: 12,
  },
  sectionHeaderLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Google.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  roleChipsScroll: {
    gap: 8,
  },
  roleChip: {
    backgroundColor: Google.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Google.border,
  },
  roleChipActive: {
    backgroundColor: Google.blueSurface,
    borderColor: Google.blue,
  },
  roleChipText: {
    fontSize: 13,
    color: Google.textSecondary,
    fontWeight: '500',
  },
  roleChipTextActive: {
    color: Google.blueText,
    fontWeight: '700',
  },
  uploadCard: {
    backgroundColor: Google.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Google.border,
    padding: 16,
    marginBottom: 14,
  },
  uploadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  uploadCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Google.blueSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  uploadCardSubtitle: {
    fontSize: 12.5,
    color: Google.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  uploadCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryPillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Google.blue,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 6,
  },
  primaryPillButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  secondaryPillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Google.surface,
    borderWidth: 1,
    borderColor: Google.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 6,
  },
  secondaryPillButtonText: {
    color: Google.textPrimary,
    fontSize: 13.5,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: Google.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Google.borderSubtle,
    padding: 14,
    marginBottom: 14,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  progressCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  progressCardStep: {
    fontSize: 12.5,
    color: Google.textSecondary,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Google.surfaceVariant,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Google.blue,
  },
  resultsContainer: {
    marginTop: 2,
  },
  activeDocBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Google.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Google.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    gap: 8,
  },
  activeDocName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Google.textPrimary,
  },
  changeDocBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeDocBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Google.blue,
  },
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: Google.surfaceVariant,
    padding: 3,
    borderRadius: 22,
    marginBottom: 14,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  segmentTabActive: {
    backgroundColor: Google.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: Google.textSecondary,
  },
  segmentTabTextActive: {
    color: Google.blue,
    fontWeight: '700',
  },
  sparkleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Google.blue,
  },
  tabContent: {
    marginBottom: 14,
  },
  scoreHeroCard: {
    backgroundColor: Google.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Google.border,
    padding: 16,
    marginBottom: 12,
  },
  scoreHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  scoreBadgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Google.surface,
  },
  scoreNumberLarge: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
  },
  scoreOutOfText: {
    fontSize: 9.5,
    color: Google.textMuted,
    fontWeight: '500',
  },
  scoreHeroMetaRight: {
    flex: 1,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  statusChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  scoreSummaryText: {
    fontSize: 13,
    color: Google.textSecondary,
    lineHeight: 18,
  },
  subScoresContainer: {
    borderTopWidth: 1,
    borderTopColor: Google.borderSubtle,
    paddingTop: 12,
    gap: 10,
  },
  subScoresHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Google.textPrimary,
    marginBottom: 2,
  },
  meterRow: {
    width: '100%',
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  meterLabel: {
    fontSize: 12,
    color: Google.textSecondary,
    fontWeight: '500',
  },
  meterValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  meterTrack: {
    height: 6,
    backgroundColor: Google.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  quickRewriteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Google.blueSurface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Google.blue,
    gap: 12,
  },
  quickRewriteIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRewriteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Google.blueText,
  },
  quickRewriteSub: {
    fontSize: 12,
    color: Google.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Google.surface,
    borderWidth: 1,
    borderColor: Google.border,
  },
  filterPillActive: {
    backgroundColor: Google.blueSurface,
    borderColor: Google.blue,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: Google.textSecondary,
  },
  filterPillTextActive: {
    color: Google.blueText,
    fontWeight: '700',
  },
  issueCard: {
    backgroundColor: Google.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Google.border,
    padding: 14,
    marginBottom: 10,
  },
  issueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  issueSeverityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  issueSeverityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  issueSectionTag: {
    fontSize: 12,
    color: Google.textMuted,
    fontWeight: '500',
  },
  issueTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Google.textPrimary,
    marginBottom: 4,
  },
  issueExplanation: {
    fontSize: 13,
    color: Google.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  quoteBox: {
    backgroundColor: Google.surfaceVariant,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Google.red,
  },
  quoteLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Google.textMuted,
    marginBottom: 2,
  },
  quoteText: {
    fontSize: 12.5,
    color: Google.textPrimary,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  remedyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Google.blueSurface,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  remedyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Google.blueText,
    marginBottom: 2,
  },
  remedyText: {
    fontSize: 12.5,
    color: Google.blueText,
    lineHeight: 17,
    fontWeight: '500',
  },
  issueActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  applySingleFixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Google.surface,
    borderWidth: 1,
    borderColor: Google.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  applySingleFixBtnDone: {
    backgroundColor: Google.greenSurface,
    borderColor: Google.green,
  },
  applySingleFixBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Google.blue,
  },
  applySingleFixBtnTextDone: {
    color: Google.green,
  },
  emptyStateCard: {
    backgroundColor: Google.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Google.border,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  emptyStateSub: {
    fontSize: 12.5,
    color: Google.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  rewriteHeaderCard: {
    backgroundColor: Google.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Google.border,
    padding: 16,
    marginBottom: 12,
  },
  rewriteHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  rewriteHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Google.blueSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewriteHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  rewriteHeaderSub: {
    fontSize: 12.5,
    color: Google.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  rewriteProgressNotice: {
    fontSize: 12,
    color: Google.blue,
    marginTop: 8,
    textAlign: 'center',
  },
  rewriteResultContainer: {
    gap: 12,
  },
  impactCard: {
    backgroundColor: Google.greenSurface,
    borderWidth: 1,
    borderColor: Google.greenBorder,
    borderRadius: 14,
    padding: 14,
  },
  impactScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  impactScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  impactScoreBefore: {
    fontSize: 16,
    fontWeight: '700',
    color: Google.textSecondary,
    textDecorationLine: 'line-through',
  },
  impactScoreAfter: {
    fontSize: 22,
    fontWeight: '800',
    color: Google.green,
  },
  impactScorePts: {
    fontSize: 12,
    fontWeight: '600',
    color: Google.green,
  },
  impactSolvedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Google.greenBorder,
  },
  impactSolvedPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Google.green,
  },
  impactSummaryText: {
    fontSize: 12.5,
    color: Google.textPrimary,
    lineHeight: 17,
  },
  rewriteSubNav: {
    flexDirection: 'row',
    backgroundColor: Google.surfaceVariant,
    padding: 3,
    borderRadius: 18,
  },
  rewriteSubTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  rewriteSubTabActive: {
    backgroundColor: Google.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  rewriteSubTabText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Google.textSecondary,
  },
  rewriteSubTabTextActive: {
    color: Google.blue,
    fontWeight: '700',
  },
  diffCard: {
    backgroundColor: Google.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Google.border,
    padding: 14,
    gap: 8,
  },
  diffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  diffSectionTag: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Google.blueText,
    backgroundColor: Google.blueSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  diffTitle: {
    fontSize: 12,
    color: Google.textMuted,
    fontWeight: '500',
  },
  diffBeforeBox: {
    backgroundColor: Google.redSurface,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Google.red,
  },
  diffLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  diffBeforeLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Google.red,
    letterSpacing: 0.5,
  },
  diffBeforeText: {
    fontSize: 12.5,
    color: Google.textPrimary,
    lineHeight: 18,
  },
  diffAfterBox: {
    backgroundColor: Google.greenSurface,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Google.green,
  },
  diffAfterLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Google.green,
    letterSpacing: 0.5,
  },
  diffAfterText: {
    fontSize: 12.5,
    color: Google.textPrimary,
    lineHeight: 18,
    fontWeight: '500',
  },
  diffExplanationText: {
    fontSize: 11.5,
    color: Google.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  rewriteSectionCard: {
    backgroundColor: Google.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Google.border,
    padding: 14,
  },
  rewriteSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  rewriteSectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  sectionApplyBtn: {
    backgroundColor: Google.blueSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionApplyBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Google.blueText,
  },
  rewriteContentText: {
    fontSize: 13,
    color: Google.textSecondary,
    lineHeight: 20,
  },
  expBlock: {
    marginBottom: 12,
  },
  expRoleTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  expDuration: {
    fontSize: 11.5,
    color: Google.textMuted,
    marginBottom: 4,
  },
  projTechText: {
    fontSize: 12,
    fontWeight: '600',
    color: Google.blue,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 14,
    color: Google.textSecondary,
    marginRight: 6,
    marginTop: -2,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    color: Google.textSecondary,
    lineHeight: 18,
  },
  skillsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    backgroundColor: Google.blueSurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  skillPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Google.blueText,
  },
  fullResumeText: {
    fontSize: 12.5,
    color: Google.textPrimary,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  applyRewriteBar: {
    marginTop: 6,
    marginBottom: 10,
    gap: 8,
  },
  applyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Google.green,
    paddingVertical: 13,
    borderRadius: 24,
    gap: 8,
  },
  applyAllBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shareRewriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Google.surface,
    borderWidth: 1,
    borderColor: Google.border,
    paddingVertical: 11,
    borderRadius: 24,
    gap: 6,
  },
  shareRewriteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Google.textPrimary,
  },
  keywordCard: {
    backgroundColor: Google.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Google.border,
    padding: 16,
  },
  keywordCardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  keywordCardSubtitle: {
    fontSize: 12.5,
    color: Google.textSecondary,
    marginTop: 1,
    marginBottom: 14,
  },
  kwGroup: {
    marginBottom: 14,
  },
  kwGroupHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Google.textPrimary,
    marginBottom: 6,
  },
  kwChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  matchedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Google.greenSurface,
    borderWidth: 1,
    borderColor: Google.greenBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  matchedChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Google.green,
  },
  missingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Google.amberSurface,
    borderWidth: 1,
    borderColor: Google.amberBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  missingChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Google.amber,
  },
  kwEmptyNotice: {
    fontSize: 12.5,
    color: Google.textMuted,
  },
  keywordTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Google.blueSurface,
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  keywordTipText: {
    flex: 1,
    fontSize: 12,
    color: Google.blueText,
    lineHeight: 17,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  bottomOutlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Google.surface,
    borderWidth: 1,
    borderColor: Google.border,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  bottomOutlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Google.textPrimary,
  },
  bottomSolidBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Google.blue,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  bottomSolidBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyIntakeCard: {
    backgroundColor: Google.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Google.border,
    padding: 32,
    alignItems: 'center',
  },
  emptyIntakeTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Google.textPrimary,
    marginTop: 10,
  },
  emptyIntakeSub: {
    fontSize: 12.5,
    color: Google.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 33, 36, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Google.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Google.borderSubtle,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Google.textPrimary,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Google.surfaceVariant,
    marginBottom: 8,
  },
  histFileName: {
    fontSize: 13,
    fontWeight: '600',
    color: Google.textPrimary,
  },
  histDate: {
    fontSize: 11.5,
    color: Google.textSecondary,
    marginTop: 2,
  },
  histScorePill: {
    backgroundColor: Google.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  histScoreVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Google.blue,
  },
  cloudBusyNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Google.amberSurface,
    borderWidth: 1,
    borderColor: Google.amberBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  cloudBusyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: Google.amber,
    lineHeight: 16,
    fontWeight: '500',
  },
  retryCloudBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Google.amberBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  retryCloudBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Google.amber,
  },
});
