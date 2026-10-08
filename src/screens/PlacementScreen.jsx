import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Linking,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, getAvatarSource } from '../theme/tokens';
import Header from '../components/Header';
import ZoomCard from '../components/ZoomCard';
import { useAuth } from '../context/AuthContext';
import {
  fetchPlacedStudents,
  fetchRegisteredCompanies,
  fetchPlacementSummary,
} from '../services/placementService';

export default function PlacementScreen({ onNavigate }) {
  const { currentStudent } = useAuth();

  // Tab & Filter States
  const [activeSubTab, setActiveSubTab] = useState('placed'); // 'placed' | 'companies' | 'analytics'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState('latest'); // 'latest' | 'package'
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCompanyCategory, setSelectedCompanyCategory] = useState('all');

  // Data States
  const [placedStudents, setPlacedStudents] = useState([]);
  const [registeredCompanies, setRegisteredCompanies] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState(null);

  // Load All Placement Data
  const loadData = useCallback(async () => {
    try {
      const [students, companies, summary] = await Promise.all([
        fetchPlacedStudents({ sort: sortMode, search: searchQuery, department: selectedDept }),
        fetchRegisteredCompanies({ category: selectedCompanyCategory }),
        fetchPlacementSummary(),
      ]);

      setPlacedStudents(students);
      setRegisteredCompanies(companies);
      setSummaryData(summary);
    } catch (err) {
      console.warn('Error loading placement data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortMode, searchQuery, selectedDept, selectedCompanyCategory]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [students, companies, summary] = await Promise.all([
          fetchPlacedStudents({ sort: sortMode, search: searchQuery, department: selectedDept }),
          fetchRegisteredCompanies({ category: selectedCompanyCategory }),
          fetchPlacementSummary(),
        ]);
        if (isMounted) {
          setPlacedStudents(students);
          setRegisteredCompanies(companies);
          setSummaryData(summary);
        }
      } catch (err) {
        console.warn('Error loading placement data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [sortMode, searchQuery, selectedDept, selectedCompanyCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Dynamic filter lists
  const departments = [
    { id: 'all', label: 'All Departments' },
    { id: 'Department of Cyber Security & Computing', label: 'Cyber Security' },
    { id: 'Department of Computer Applications', label: 'Computer Applications' },
    { id: 'BCA', label: 'BCA' },
  ];

  const companyCategories = [
    { id: 'all', label: 'All Partners' },
    { id: 'tier1', label: 'Tier 1 MNCs' },
    { id: 'consulting', label: 'Big 4 Consulting' },
    { id: 'bfsi', label: 'BFSI & FinTech' },
    { id: 'it', label: 'Enterprise IT' },
    { id: 'core', label: 'Core Engineering' },
  ];

  // Helper for profession pill colors
  const getProfessionTheme = (profession = '') => {
    const p = profession.toLowerCase();
    if (p.includes('cyber') || p.includes('security')) {
      return { icon: 'security', color: '#10B981', bg: '#ECFDF5' };
    }
    if (p.includes('cloud') || p.includes('devops') || p.includes('aws')) {
      return { icon: 'cloud-queue', color: '#0EA5E9', bg: '#F0F9FF' };
    }
    if (p.includes('full stack') || p.includes('web') || p.includes('developer')) {
      return { icon: 'code', color: '#6366F1', bg: '#EEF2FF' };
    }
    if (p.includes('risk') || p.includes('analyst') || p.includes('consultant')) {
      return { icon: 'query-stats', color: '#F59E0B', bg: '#FEF3C7' };
    }
    if (p.includes('fintech') || p.includes('finance') || p.includes('bank')) {
      return { icon: 'account-balance', color: '#14B8A6', bg: '#CCFBF1' };
    }
    return { icon: 'badge', color: '#4F46E5', bg: '#EEF2FF' };
  };

  // Helper for CTC Tier badge styling
  const getTierTheme = (tier = '', ctc = 0) => {
    if (ctc >= 15 || tier.toLowerCase().includes('super')) {
      return { label: 'Super Dream', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' };
    }
    if (ctc >= 10 || tier.toLowerCase().includes('dream')) {
      return { label: 'Dream Tier', color: '#A31321', bg: '#FEE2E2', border: '#FECACA' };
    }
    return { label: 'Standard 1', color: '#3E6186', bg: '#E0F2FE', border: '#BAE6FD' };
  };

  return (
    <View style={styles.container}>
      {/* Universal Top Header */}
      <Header
        title="Campus Placements"
        eyebrow="RIMT CAREER & PLACEMENT TRUST"
        avatarUrl={currentStudent?.avatar_url || currentStudent?.avatar}
        onProfilePress={() => onNavigate?.('profile')}
        onNotificationPress={() => onNavigate?.('home')}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Live Database Sync Status Bar */}
        <View style={styles.syncStatusCard}>
          <View style={styles.syncLeft}>
            <View style={styles.pulseDotWrapper}>
              <View style={styles.pulseDotOuter} />
              <View style={styles.pulseDotInner} />
            </View>
            <Text style={styles.syncStatusText}>
              Live Synced • Supabase Ledger &amp; Admin Portal AY 2024–25
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={16} color={Colors.primary} />
            <Text style={styles.refreshText}>Sync Now</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Institutional Intelligence Card */}
        <LinearGradient
          colors={['#182B42', '#12263D', '#0B1623']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroAuditBadge}>
              <MaterialIcons name="workspace-premium" size={13} color="#D4AF37" />
              <Text style={styles.heroAuditText}>NAAC A++ &amp; NBA Compliant</Text>
            </View>
            <View style={styles.heroSessionBadge}>
              <Text style={styles.heroSessionText}>Session 2024–25</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            {summaryData?.kpis?.placementRate || '100.0%'} Placement Rate
          </Text>
          <Text style={styles.heroSubtitle}>
            {summaryData?.kpis?.totalPlaced || placedStudents.length} verified scholars placed across {summaryData?.kpis?.registeredCompaniesCount || registeredCompanies.length} registered corporate partners
          </Text>

          {/* Quick Metrics Inside Hero */}
          <View style={styles.heroMetricsGrid}>
            <View style={styles.heroMetricBox}>
              <Text style={styles.heroMetricLabel}>HIGHEST CTC</Text>
              <Text style={styles.heroMetricValue}>
                ₹{summaryData?.kpis?.highestCtcLpa || 38.5}
              </Text>
              <Text style={styles.heroMetricSub} numberOfLines={1}>
                LPA • {summaryData?.kpis?.highestOfferCompany || 'Google India'}
              </Text>
            </View>
            <View style={styles.heroMetricDivider} />
            <View style={styles.heroMetricBox}>
              <Text style={styles.heroMetricLabel}>AVERAGE CTC</Text>
              <Text style={styles.heroMetricValue}>
                ₹{summaryData?.kpis?.avgCtcLpa || 22.8}
              </Text>
              <Text style={styles.heroMetricSub}>LPA Verified</Text>
            </View>
            <View style={styles.heroMetricDivider} />
            <View style={styles.heroMetricBox}>
              <Text style={styles.heroMetricLabel}>OFFERS RELEASED</Text>
              <Text style={styles.heroMetricValue}>
                {summaryData?.kpis?.totalOffers || placedStudents.length}
              </Text>
              <Text style={styles.heroMetricSub}>Live Verified</Text>
            </View>
          </View>
        </LinearGradient>

        {/* 3-Way Sub-Navigation Tabs */}
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTabButton, activeSubTab === 'placed' && styles.subTabButtonActive]}
            onPress={() => setActiveSubTab('placed')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="school"
              size={17}
              color={activeSubTab === 'placed' ? Colors.primary : '#64748B'}
            />
            <Text
              numberOfLines={1}
              style={[styles.subTabText, activeSubTab === 'placed' && styles.subTabTextActive]}
            >
              Scholars
            </Text>
            <View style={[styles.subTabBadge, activeSubTab === 'placed' && styles.subTabBadgeActive]}>
              <Text style={[styles.subTabBadgeText, activeSubTab === 'placed' && styles.subTabBadgeTextActive]}>
                {placedStudents.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabButton, activeSubTab === 'companies' && styles.subTabButtonActive]}
            onPress={() => setActiveSubTab('companies')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="business"
              size={17}
              color={activeSubTab === 'companies' ? Colors.primary : '#64748B'}
            />
            <Text
              numberOfLines={1}
              style={[styles.subTabText, activeSubTab === 'companies' && styles.subTabTextActive]}
            >
              Companies
            </Text>
            <View style={[styles.subTabBadge, activeSubTab === 'companies' && styles.subTabBadgeActive]}>
              <Text style={[styles.subTabBadgeText, activeSubTab === 'companies' && styles.subTabBadgeTextActive]}>
                {registeredCompanies.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabButton, activeSubTab === 'analytics' && styles.subTabButtonActive]}
            onPress={() => setActiveSubTab('analytics')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="insights"
              size={17}
              color={activeSubTab === 'analytics' ? Colors.primary : '#64748B'}
            />
            <Text
              numberOfLines={1}
              style={[styles.subTabText, activeSubTab === 'analytics' && styles.subTabTextActive]}
            >
              Analytics
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── TAB 1: PLACED SCHOLARS ── */}
        {activeSubTab === 'placed' && (
          <View style={styles.tabContentSection}>
            {/* Search & Sort Controls */}
            <View style={styles.controlsRow}>
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={20} color={Colors.neutralGray} />
                <TextInput
                  placeholder="Search by scholar, roll no, company, role..."
                  placeholderTextColor={Colors.neutralGray}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialIcons name="close" size={18} color={Colors.neutralGray} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.sortToggleWrapper}>
                <TouchableOpacity
                  style={[styles.sortButton, sortMode === 'latest' && styles.sortButtonActive]}
                  onPress={() => setSortMode('latest')}
                >
                  <Text style={[styles.sortButtonText, sortMode === 'latest' && styles.sortButtonTextActive]}>
                    Latest
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortButton, sortMode === 'package' && styles.sortButtonActive]}
                  onPress={() => setSortMode('package')}
                >
                  <Text style={[styles.sortButtonText, sortMode === 'package' && styles.sortButtonTextActive]}>
                    Top CTC
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Department Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {departments.map((dept) => {
                const isSelected = selectedDept === dept.id;
                return (
                  <TouchableOpacity
                    key={dept.id}
                    onPress={() => setSelectedDept(dept.id)}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {dept.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Scholars List */}
            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Syncing live placed scholars from database...</Text>
              </View>
            ) : placedStudents.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="search-off" size={40} color={Colors.neutralGray} />
                <Text style={styles.emptyTitle}>No Placed Scholars Found</Text>
                <Text style={styles.emptyDesc}>Try adjusting your search query or department filter.</Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {placedStudents.map((item) => {
                  const profTheme = getProfessionTheme(item.student.profession);
                  const tierTheme = getTierTheme(item.offer.tier, item.offer.ctcLpa);

                  return (
                    <ZoomCard
                      key={item.id}
                      style={styles.scholarCard}
                      scaleTo={1.02}
                      onPress={() => setSelectedStudentForModal(item)}
                    >
                      {/* Top Bar: Company Logo & CTC Tier */}
                      <View style={styles.scholarCardTop}>
                        <View style={styles.companyInfoRow}>
                          <View style={[styles.companyLogoBadge, { backgroundColor: item.company.logoBg }]}>
                            <MaterialIcons
                              name={item.company.icon || 'corporate-fare'}
                              size={20}
                              color={item.company.iconColor || Colors.primary}
                            />
                          </View>
                          <View style={styles.companyNameColumn}>
                            <Text style={styles.companyNameText} numberOfLines={1}>
                              {item.company.name}
                            </Text>
                            <Text style={styles.companyLocationText}>
                              {item.company.city}, {item.company.state}
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.tierBadge, { backgroundColor: tierTheme.bg, borderColor: tierTheme.border }]}>
                          <Text style={[styles.tierBadgeText, { color: tierTheme.color }]}>
                            ₹{item.offer.ctcLpa} LPA
                          </Text>
                          <Text style={[styles.tierSubText, { color: tierTheme.color }]}>
                            {tierTheme.label}
                          </Text>
                        </View>
                      </View>

                      {/* Middle: Student Details */}
                      <View style={styles.scholarStudentSection}>
                        <Image
                          source={getAvatarSource(item.student.avatarUrl)}
                          style={styles.scholarAvatar}
                        />
                        <View style={styles.scholarMetaColumn}>
                          <View style={styles.scholarNameRow}>
                            <Text style={styles.scholarNameText} numberOfLines={1}>
                              {item.student.name}
                            </Text>
                            <View style={styles.verifiedBadge}>
                              <MaterialIcons name="verified" size={14} color={Colors.verifiedGreen} />
                              <Text style={styles.verifiedText}>Placed</Text>
                            </View>
                            {item.student.cgpa ? (
                              <View style={styles.scholarCgpaPill}>
                                <Text style={styles.scholarCgpaText}>
                                  CGPA {item.student.cgpa}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.scholarRollText}>
                            Roll No: {item.student.rollNo} • {item.student.department}
                          </Text>
                          <Text style={styles.jobRoleText}>
                            Role: {item.offer.jobRole}
                          </Text>
                        </View>
                      </View>

                      {/* Bio Statement Snippet */}
                      {item.student.bio ? (
                        <View style={styles.scholarBioBox}>
                          <MaterialIcons name="format-quote" size={14} color={Colors.primary} />
                          <Text style={styles.scholarBioText} numberOfLines={2}>
                            {`"${item.student.bio}"`}
                          </Text>
                        </View>
                      ) : null}

                      {/* Technical Skills Preview */}
                      {item.student.skills && item.student.skills.length > 0 ? (
                        <View style={styles.scholarSkillsRow}>
                          {item.student.skills.slice(0, 3).map((sk, sIdx) => (
                            <View key={sIdx} style={styles.scholarSkillChip}>
                              <Text style={styles.scholarSkillChipText}>
                                {typeof sk === 'string' ? sk : sk?.name || 'Skill'}
                              </Text>
                            </View>
                          ))}
                          {item.student.skills.length > 3 && (
                            <View style={styles.scholarMoreSkillsChip}>
                              <Text style={styles.scholarMoreSkillsText}>
                                +{item.student.skills.length - 3}
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : null}

                      {/* Bottom Pills: Profession + Offer Date */}
                      <View style={styles.scholarCardBottom}>
                        <View style={[styles.professionPill, { backgroundColor: profTheme.bg }]}>
                          <MaterialIcons name={profTheme.icon} size={13} color={profTheme.color} />
                          <Text style={[styles.professionText, { color: profTheme.color }]}>
                            {item.student.profession}
                          </Text>
                        </View>

                        <View style={styles.offerDateRow}>
                          <MaterialIcons name="event" size={13} color={Colors.textSecondary} />
                          <Text style={styles.offerDateText}>
                            Offer: {item.offer.offeredAt}
                          </Text>
                        </View>
                      </View>
                    </ZoomCard>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── TAB 2: REGISTERED COMPANIES ── */}
        {activeSubTab === 'companies' && (
          <View style={styles.tabContentSection}>
            {/* Category Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {companyCategories.map((cat) => {
                const isSelected = selectedCompanyCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCompanyCategory(cat.id)}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Companies List */}
            <View style={styles.cardsList}>
              {registeredCompanies.map((company) => {
                return (
                  <ZoomCard
                    key={company.id}
                    style={styles.companyCard}
                    scaleTo={1.02}
                    onPress={() => setSelectedCompanyForModal(company)}
                  >
                    {/* Header: Logo, Name, MoU */}
                    <View style={styles.companyCardHeader}>
                      <View style={[styles.companyCardLogo, { backgroundColor: company.logoBg }]}>
                        <MaterialIcons
                          name={company.icon || 'corporate-fare'}
                          size={28}
                          color={company.iconColor || Colors.primary}
                        />
                      </View>
                      <View style={styles.companyHeaderDetails}>
                        <View style={styles.companyTitleRow}>
                          <Text style={styles.companyCardName} numberOfLines={1}>
                            {company.name}
                          </Text>
                        </View>
                        <Text style={styles.companyCardSector}>{company.sector}</Text>
                        <View style={styles.companyPillRow}>
                          <View style={styles.mouPill}>
                            <MaterialIcons name="handshake" size={12} color="#15803D" />
                            <Text style={styles.mouPillText}>{company.mouStatus}</Text>
                          </View>
                          <View style={styles.packagePill}>
                            <Text style={styles.packagePillText}>{company.packageRange}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Location & Liaison SPOC */}
                    <View style={styles.companyLiaisonBox}>
                      <View style={styles.liaisonItem}>
                        <MaterialIcons name="place" size={14} color={Colors.textSecondary} />
                        <Text style={styles.liaisonText} numberOfLines={1}>
                          {company.location}
                        </Text>
                      </View>
                      <View style={styles.liaisonItem}>
                        <MaterialIcons name="person" size={14} color={Colors.textSecondary} />
                        <Text style={styles.liaisonText}>
                          SPOC: {company.spoc.name} ({company.spoc.role})
                        </Text>
                      </View>
                    </View>

                    {/* Hired Scholars from RIMT Banner */}
                    <View style={styles.hiredScholarsBanner}>
                      <View style={styles.hiredCountBadge}>
                        <MaterialIcons name="people" size={14} color="#1E40AF" />
                        <Text style={styles.hiredCountText}>
                          {company.hiredCount} RIMT Scholars Placed
                        </Text>
                      </View>

                      {company.hiredScholars.length > 0 && (
                        <View style={styles.hiredNamesRow}>
                          {company.hiredScholars.map((sch, i) => (
                            <View key={i} style={styles.hiredStudentChip}>
                              <Text style={styles.hiredStudentChipText}>
                                {sch.studentName} ({sch.studentRoll}) • ₹{sch.ctcLpa} LPA
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </ZoomCard>
                );
              })}
            </View>
          </View>
        )}

        {/* ── TAB 3: ANALYTICS & CTC TIERS ── */}
        {activeSubTab === 'analytics' && summaryData && (
          <View style={styles.tabContentSection}>
            {/* CTC Brackets Breakdown */}
            <View style={styles.analyticsSectionCard}>
              <View style={styles.analyticsHeader}>
                <View style={styles.analyticsIconBadge}>
                  <MaterialIcons name="bar-chart" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.analyticsTitle}>Salary CTC Bracket Breakdown</Text>
                  <Text style={styles.analyticsSub}>
                    Compensation spectrum across verified graduating cohorts
                  </Text>
                </View>
              </View>

              <View style={styles.bracketList}>
                {summaryData.ctcBrackets.map((bracket, idx) => (
                  <View key={idx} style={styles.bracketRow}>
                    <View style={styles.bracketHeaderRow}>
                      <View style={styles.bracketLabelLeft}>
                        <View style={[styles.bracketDot, { backgroundColor: bracket.color }]} />
                        <Text style={styles.bracketLabelText}>{bracket.label}</Text>
                      </View>
                      <Text style={styles.bracketCountText}>
                        {bracket.count} scholars ({bracket.percentage}%)
                      </Text>
                    </View>
                    <View style={styles.bracketProgressTrack}>
                      <View
                        style={[
                          styles.bracketProgressFill,
                          {
                            width: `${bracket.percentage * 1.8}%`,
                            backgroundColor: bracket.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Department Conversion Index */}
            <View style={styles.analyticsSectionCard}>
              <View style={styles.analyticsHeader}>
                <View style={styles.analyticsIconBadge}>
                  <MaterialIcons name="domain" size={18} color={Colors.secondary} />
                </View>
                <View>
                  <Text style={styles.analyticsTitle}>Department Conversion Index</Text>
                  <Text style={styles.analyticsSub}>
                    Verified placements against eligible batch size
                  </Text>
                </View>
              </View>

              <View style={styles.deptList}>
                {summaryData.departmentConversion.map((dept, idx) => (
                  <View key={idx} style={styles.deptRow}>
                    <View style={styles.deptInfoRow}>
                      <Text style={styles.deptNameText}>{dept.name}</Text>
                      <Text style={styles.deptRateText}>{dept.rate}</Text>
                    </View>
                    <Text style={styles.deptSubText}>
                      {dept.placed} placed of {dept.total} eligible scholars
                    </Text>
                    <View style={styles.deptProgressTrack}>
                      <View
                        style={[
                          styles.deptProgressFill,
                          {
                            width: dept.rate,
                            backgroundColor: dept.barColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Accreditation & Audit Compliance Info */}
            <View style={styles.auditInfoCard}>
              <MaterialIcons name="verified-user" size={24} color="#059669" />
              <View style={styles.auditInfoContent}>
                <Text style={styles.auditTitle}>NAAC Criterion V &amp; NBA Compliance</Text>
                <Text style={styles.auditDesc}>
                  All corporate offers and student dossiers are cryptographically verified against
                  RIMT Academic ledger and corporate SPOC countersigns.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── MODAL 1: SCHOLAR TALENT DOSSIER MODAL ── */}
      <Modal
        visible={Boolean(selectedStudentForModal)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedStudentForModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedStudentForModal && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleRow}>
                    <MaterialIcons name="workspace-premium" size={20} color={Colors.primary} />
                    <Text style={styles.modalHeaderTitle}>Verified Talent Dossier</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedStudentForModal(null)}
                    style={styles.modalCloseButton}
                  >
                    <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Hero Student Banner */}
                  <View style={styles.modalStudentCard}>
                    <Image
                      source={getAvatarSource(selectedStudentForModal.student.avatarUrl)}
                      style={styles.modalStudentAvatar}
                    />
                    <View style={styles.modalStudentInfo}>
                      <View style={styles.modalNameRow}>
                        <Text style={styles.modalStudentName}>
                          {selectedStudentForModal.student.name}
                        </Text>
                        <View style={styles.verifiedBadge}>
                          <MaterialIcons name="verified" size={14} color={Colors.verifiedGreen} />
                          <Text style={styles.verifiedText}>Placed</Text>
                        </View>
                        {selectedStudentForModal.student.cgpa ? (
                          <View style={styles.scholarCgpaPill}>
                            <Text style={styles.scholarCgpaText}>
                              CGPA {selectedStudentForModal.student.cgpa}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.modalStudentRoll}>
                        Roll: {selectedStudentForModal.student.rollNo}
                      </Text>
                      <Text style={styles.modalStudentDept}>
                        {selectedStudentForModal.student.department}
                      </Text>
                    </View>
                  </View>

                  {/* Candidate Profile Statement */}
                  {selectedStudentForModal.student.bio ? (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Candidate Profile Statement</Text>
                      <View style={styles.modalBioCard}>
                        <MaterialIcons name="format-quote" size={18} color={Colors.primary} />
                        <Text style={styles.modalBioText}>
                          {selectedStudentForModal.student.bio}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Offer Breakdown Box */}
                  <View style={styles.modalOfferBox}>
                    <View style={styles.modalOfferHeader}>
                      <Text style={styles.modalOfferEyebrow}>CORPORATE OFFER LETTER</Text>
                      <View style={styles.modalVerifiedBadge}>
                        <MaterialIcons name="check-circle" size={14} color="#059669" />
                        <Text style={styles.modalVerifiedText}>Confirmed</Text>
                      </View>
                    </View>

                    <Text style={styles.modalOfferCompany}>
                      {selectedStudentForModal.company.name}
                    </Text>
                    <Text style={styles.modalOfferRole}>
                      {selectedStudentForModal.offer.jobRole}
                    </Text>

                    <View style={styles.modalOfferPackageRow}>
                      <View style={styles.modalPackageBox}>
                        <Text style={styles.modalPackageLabel}>ANNUAL CTC</Text>
                        <Text style={styles.modalPackageValue}>
                          ₹{selectedStudentForModal.offer.ctcLpa} LPA
                        </Text>
                      </View>
                      <View style={styles.modalPackageBox}>
                        <Text style={styles.modalPackageLabel}>TIER</Text>
                        <Text style={styles.modalPackageValue}>
                          {selectedStudentForModal.offer.tier}
                        </Text>
                      </View>
                      <View style={styles.modalPackageBox}>
                        <Text style={styles.modalPackageLabel}>DATE</Text>
                        <Text style={styles.modalPackageValue}>
                          {selectedStudentForModal.offer.offeredAt}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Skills Section */}
                  {selectedStudentForModal.student.skills?.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Verified Technical Skills</Text>
                      <View style={styles.skillsTagWrap}>
                        {selectedStudentForModal.student.skills.map((skill, i) => (
                          <View key={i} style={styles.skillPill}>
                            <Text style={styles.skillPillText}>
                              {typeof skill === 'string' ? skill : skill?.name || 'Skill'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Corporate Recruiter Liaison */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Corporate SPOC Liaison</Text>
                    <View style={styles.spocCard}>
                      <Text style={styles.spocName}>{selectedStudentForModal.company.spoc.name}</Text>
                      <Text style={styles.spocRole}>{selectedStudentForModal.company.spoc.role}</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`mailto:${selectedStudentForModal.company.spoc.email}`)}
                        style={styles.spocActionRow}
                      >
                        <MaterialIcons name="email" size={15} color={Colors.primary} />
                        <Text style={styles.spocActionText}>{selectedStudentForModal.company.spoc.email}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${selectedStudentForModal.company.spoc.phone}`)}
                        style={styles.spocActionRow}
                      >
                        <MaterialIcons name="phone" size={15} color={Colors.primary} />
                        <Text style={styles.spocActionText}>{selectedStudentForModal.company.spoc.phone}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: COMPANY DETAILS MODAL ── */}
      <Modal
        visible={Boolean(selectedCompanyForModal)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCompanyForModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedCompanyForModal && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleRow}>
                    <MaterialIcons name="business" size={20} color={Colors.secondary} />
                    <Text style={styles.modalHeaderTitle}>Registered Corporate Partner</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedCompanyForModal(null)}
                    style={styles.modalCloseButton}
                  >
                    <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Company Profile Header */}
                  <View style={styles.modalCompanyHero}>
                    <View style={[styles.modalCompanyLogoBig, { backgroundColor: selectedCompanyForModal.logoBg }]}>
                      <MaterialIcons
                        name={selectedCompanyForModal.icon || 'corporate-fare'}
                        size={36}
                        color={selectedCompanyForModal.iconColor || Colors.primary}
                      />
                    </View>
                    <Text style={styles.modalCompanyName}>{selectedCompanyForModal.name}</Text>
                    <Text style={styles.modalCompanySector}>{selectedCompanyForModal.sector}</Text>
                    <Text style={styles.modalCompanyLocation}>
                      {selectedCompanyForModal.location}
                    </Text>
                  </View>

                  {/* MoU & Package Details */}
                  <View style={styles.companyMetaGrid}>
                    <View style={styles.companyMetaBox}>
                      <Text style={styles.companyMetaLabel}>MoU DURATION</Text>
                      <Text style={styles.companyMetaValue}>{selectedCompanyForModal.mouYears}</Text>
                    </View>
                    <View style={styles.companyMetaBox}>
                      <Text style={styles.companyMetaLabel}>PACKAGE BAND</Text>
                      <Text style={styles.companyMetaValue}>{selectedCompanyForModal.packageRange}</Text>
                    </View>
                  </View>

                  {/* Recruiter SPOC */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>University Hiring Contact</Text>
                    <View style={styles.spocCard}>
                      <Text style={styles.spocName}>{selectedCompanyForModal.spoc.name}</Text>
                      <Text style={styles.spocRole}>{selectedCompanyForModal.spoc.role}</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`mailto:${selectedCompanyForModal.spoc.email}`)}
                        style={styles.spocActionRow}
                      >
                        <MaterialIcons name="email" size={15} color={Colors.primary} />
                        <Text style={styles.spocActionText}>{selectedCompanyForModal.spoc.email}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${selectedCompanyForModal.spoc.phone}`)}
                        style={styles.spocActionRow}
                      >
                        <MaterialIcons name="phone" size={15} color={Colors.primary} />
                        <Text style={styles.spocActionText}>{selectedCompanyForModal.spoc.phone}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Hired Scholars List */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      Hired RIMT Scholars ({selectedCompanyForModal.hiredScholars.length})
                    </Text>
                    {selectedCompanyForModal.hiredScholars.map((sch, i) => (
                      <View key={i} style={styles.modalHiredScholarCard}>
                        <View style={styles.modalHiredScholarLeft}>
                          <Text style={styles.modalHiredScholarName}>{sch.studentName}</Text>
                          <Text style={styles.modalHiredScholarSub}>
                            {sch.studentRoll} • {sch.studentDepartment}
                          </Text>
                          <Text style={styles.modalHiredScholarRole}>Role: {sch.jobRole}</Text>
                        </View>
                        <View style={styles.modalHiredScholarRight}>
                          <Text style={styles.modalHiredScholarCtc}>₹{sch.ctcLpa} LPA</Text>
                          <Text style={styles.modalHiredScholarDate}>{sch.offeredAt}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.margin,
    paddingBottom: 110,
  },

  /* Live Sync Banner */
  syncStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 79, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pulseDotWrapper: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotOuter: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(46, 125, 79, 0.25)',
  },
  pulseDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D4F',
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(163, 19, 33, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },

  /* Hero Section */
  heroCard: {
    borderRadius: Radii.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#12263D',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroAuditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  heroAuditText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroSessionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  heroSessionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 3,
    marginBottom: 14,
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  heroMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  heroMetricDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  heroMetricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroMetricSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 1,
  },

  /* Sub Tab Bar */
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    height: 46,
  },
  subTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 9,
    paddingHorizontal: 4,
    gap: 4,
  },
  subTabButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(163, 19, 33, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  subTabBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabBadgeActive: {
    backgroundColor: 'rgba(163, 19, 33, 0.09)',
  },
  subTabBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabBadgeTextActive: {
    color: Colors.primary,
  },

  /* Controls & Filters */
  tabContentSection: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.md,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  sortToggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radii.sm,
  },
  sortButtonActive: {
    backgroundColor: Colors.primary,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipRow: {
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: 'rgba(163, 19, 33, 0.1)',
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  /* Cards List */
  cardsList: {
    gap: 12,
  },

  /* Scholar Card */
  scholarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#12263D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  scholarCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  companyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  companyLogoBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyNameColumn: {
    flex: 1,
  },
  companyNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  companyLocationText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  tierBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  tierSubText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scholarStudentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  scholarAvatar: {
    width: 46,
    height: 46,
    borderRadius: Radii.md,
    backgroundColor: '#F1F5F9',
  },
  scholarMetaColumn: {
    flex: 1,
  },
  scholarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scholarNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(46, 125, 79, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radii.sm,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.verifiedGreen,
  },
  scholarRollText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  jobRoleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
  scholarCgpaPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  scholarCgpaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  scholarBioBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.sm,
    padding: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scholarBioText: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 15,
  },
  scholarSkillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginVertical: 4,
  },
  scholarSkillChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  scholarSkillChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
  scholarMoreSkillsChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: Radii.sm,
  },
  scholarMoreSkillsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  modalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  modalBioCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBioText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  scholarCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  professionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  professionText: {
    fontSize: 10,
    fontWeight: '700',
  },
  offerDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  offerDateText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },

  /* Company Card */
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#12263D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  companyCardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  companyCardLogo: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyHeaderDetails: {
    flex: 1,
  },
  companyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companyCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  companyCardSector: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  companyPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  mouPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  mouPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  packagePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  packagePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  companyLiaisonBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.md,
    padding: 8,
    gap: 4,
    marginBottom: 10,
  },
  liaisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liaisonText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  hiredScholarsBanner: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    gap: 6,
  },
  hiredCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hiredCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  hiredNamesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  hiredStudentChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  hiredStudentChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1D4ED8',
  },

  /* Analytics & Tiers Section */
  analyticsSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
  },
  analyticsHeader: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  analyticsIconBadge: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(163, 19, 33, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  analyticsSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  bracketList: {
    gap: 12,
  },
  bracketRow: {
    gap: 4,
  },
  bracketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bracketLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bracketDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bracketLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bracketCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  bracketProgressTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bracketProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  deptList: {
    gap: 10,
  },
  deptRow: {
    gap: 3,
  },
  deptInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deptNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  deptRateText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  deptSubText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  deptProgressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  deptProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  auditInfoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  auditInfoContent: {
    flex: 1,
  },
  auditTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  auditDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },

  /* Empty & Loading */
  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  modalStudentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 14,
  },
  modalStudentAvatar: {
    width: 54,
    height: 54,
    borderRadius: Radii.md,
    backgroundColor: '#E2E8F0',
  },
  modalStudentInfo: {
    flex: 1,
  },
  modalStudentName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalStudentRoll: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  modalStudentDept: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  modalOfferBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
  },
  modalOfferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalOfferEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  modalVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  modalVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  modalOfferCompany: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalOfferRole: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  modalOfferPackageRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.md,
    padding: 10,
    marginTop: 10,
  },
  modalPackageBox: {
    flex: 1,
    alignItems: 'center',
  },
  modalPackageLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalPackageValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
  },
  modalSection: {
    marginBottom: 14,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  skillsTagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  skillPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  spocCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  spocName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  spocRole: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  spocContact: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  spocActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  spocActionText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalCompanyHero: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalCompanyLogoBig: {
    width: 64,
    height: 64,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalCompanyName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalCompanySector: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCompanyLocation: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  companyMetaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  companyMetaBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: Radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  companyMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  companyMetaValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  modalHiredScholarCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHiredScholarLeft: {
    flex: 1,
  },
  modalHiredScholarName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalHiredScholarSub: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  modalHiredScholarRole: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
  modalHiredScholarRight: {
    alignItems: 'flex-end',
  },
  modalHiredScholarCtc: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.verifiedGreen,
  },
  modalHiredScholarDate: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
});
