import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform, Alert } from 'react-native';

const RESUME_STORAGE_KEY_PREFIX = '@rimt_cvforge_resume_';

export const RESUME_TEMPLATES = [
  {
    id: 'navy_ledger',
    name: 'Navy Executive (Institutional Standard)',
    category: 'Institutional & CGPA Ledger',
    accent: '#0B2545', // Deep Navy
    secondaryAccent: '#1D63FF', // Royal Accent
    canvasBg: '#0B2545',
    rightBg: '#FFFFFF',
    badge: 'Template 1 · Executive Navy',
    atsRating: 'Top Pick · 99%',
    description: 'Deep navy sidebar with circular portrait, proficiency progress bars, crisp white right column with CGPA ledger, and timeline dots.',
    layout: 'split-navy-ledger',
    hasPhoto: true,
  },
  {
    id: 'richard_sanchez',
    name: 'Executive Slate Split (Sanchez Modern)',
    category: 'Executive Timeline & Dual-Tone',
    accent: '#1B2433', // Dark Slate
    secondaryAccent: '#4B5563', // Grey
    canvasBg: '#ECEEF2',
    rightBg: '#FFFFFF',
    badge: 'Template 2 · Slate Executive',
    atsRating: 'High · 98%',
    description: 'Dark slate header banner, overlapping circular portrait, dual-column layout with skills, languages, references, and timeline work experience.',
    layout: 'split-slate-timeline',
    hasPhoto: true,
  },
  {
    id: 'herman_walton',
    name: 'Corporate Analyst Classic (Walton Style)',
    category: 'Wall-Street & Corporate Minimalist',
    accent: '#1A56DB', // Royal Blue
    secondaryAccent: '#111827', // Dark Ink
    canvasBg: '#FFFFFF',
    rightBg: '#FFFFFF',
    badge: 'Template 3 · Corporate Wall-St',
    atsRating: 'High · 97%',
    description: 'Minimalist corporate resume with top-right portrait, royal blue dividers, 4-column technical skills grid, and executive summary.',
    layout: 'corporate-analyst-grid',
    hasPhoto: true,
  },
  {
    id: 'sunny_singh',
    name: 'Crimson Recruiter Horizon (Singh Style)',
    category: 'Executive Two-Tone & Skill Badges',
    accent: '#A11B24', // Crimson Maroon
    secondaryAccent: '#7F1D1D', // Deep Burgundy
    canvasBg: '#FFFFFF',
    rightBg: '#FFFFFF',
    badge: 'Template 4 · Crimson Horizon',
    atsRating: 'High · 98%',
    description: 'Rounded top portrait with executive bio, full-width crimson contact strip, employment history, crimson rounded pill skill badges, and language dots.',
    layout: 'crimson-recruiter-badges',
    hasPhoto: true,
  },
];

/**
 * Builds default resume data mapped directly from student's institutional record
 * per RESUMEE.md Section 6.
 * CRITICAL RULE: Internal enrollment ID (e.g. 26BSCCS005) is NEVER printed on the resume.
 */
export function buildDefaultResumeData(student) {
  const studentName = student?.name?.trim() || 'Shahzeb';
  const degree = student?.course || 'BSC CYBERSECURITY';
  const batch = student?.batch || 'Batch 1st Year (1st Sem)';
  const cgpa = student?.cgpa ? `${student.cgpa} / 10.0` : '8.5 / 10.0';

  // Parse existing projects
  let projectList = [];
  if (Array.isArray(student?.projects) && student.projects.length > 0) {
    projectList = student.projects.map((p, idx) => ({
      id: `p_${idx}`,
      title: p.title || `Academic Project ${idx + 1}`,
      tech: p.tech || p.category || 'Python, Security Tools, React',
      summary: p.description || 'Developed modular system adhering to security best practices and high concurrency benchmarks.',
      github: p.github || 'https://github.com/rimt-trust/project',
    }));
  } else {
    projectList = [
      {
        id: 'p_default',
        title: 'Network Vulnerability Scanner & Audit Pipeline',
        tech: 'Python, Scapy, Nmap, SQLite, Linux',
        summary: 'Engineered an automated script to inspect local subnet security, identify open telemetry ports, and generate institutional security compliance reports.',
        github: 'https://github.com/rimt-trust/security-audit',
      },
      {
        id: 'p_identity',
        title: 'Institutional Identity & Role Verification Portal',
        tech: 'React Native, Supabase, JWT, Tailwind',
        summary: 'Designed multi-factor credential authentication system handling real-time status synchronization for 1,200+ active scholars.',
        github: 'https://github.com/rimt-trust/identity-portal',
      },
    ];
  }

  // Parse skills with ratings & percentages
  const skillsList = [
    { id: 's_1', name: 'Cybersecurity', pct: 95, stars: 5 },
    { id: 's_2', name: 'Network Defense', pct: 92, stars: 5 },
    { id: 's_3', name: 'Linux Administration', pct: 88, stars: 4 },
    { id: 's_4', name: 'Python', pct: 90, stars: 5 },
    { id: 's_5', name: 'Web Security', pct: 86, stars: 4 },
    { id: 's_6', name: 'Project Management', pct: 84, stars: 4 },
    { id: 's_7', name: 'Effective Communication', pct: 90, stars: 5 },
    { id: 's_8', name: 'Applicant Tracking System', pct: 88, stars: 4 },
  ];

  // Parse languages with levels & percentages & dots
  const languagesList = [
    { id: 'l_1', name: 'English', level: 'Fluent', pct: 95, dots: 4 },
    { id: 'l_2', name: 'Hindi', level: 'Native', pct: 100, dots: 5 },
    { id: 'l_3', name: 'Punjabi', level: 'Native', pct: 90, dots: 5 },
  ];

  // Parse affiliations / references
  const affiliationsList = [
    { id: 'a_1', title: 'Member, RIMT Cybersecurity Guild (RCG)', role: 'Core Security Contributor' },
    { id: 'a_2', title: 'Student Member, Computer Society of India (CSI)', role: 'Active Scholar' },
  ];

  const referencesList = [
    { id: 'r_1', name: 'Estelle Darcy', company: 'Wardiere Inc. / CTO', phone: '+123-456-7890', email: 'hello@reallygreatsite.com' },
    { id: 'r_2', name: 'Dr. H. S. Bawa', company: 'RIMT University / Dean', phone: '+91-1765-523100', email: 'dean@rimt.ac.in' },
  ];

  // Parse certificates
  const certList = [
    {
      id: 'c_1',
      title: 'Institutional Academic Security Protocol Verification',
      issuer: 'RIMT Academic Trust',
      date: '2025',
    },
    {
      id: 'c_2',
      title: 'Certified Network Defense Practitioner',
      issuer: 'Cisco Networking Academy',
      date: '2024',
    },
    {
      id: 'c_3',
      title: 'Foundations of Cloud Infrastructure',
      issuer: 'Google Cloud Platform',
      date: '2024',
    },
  ];

  const interestsList = ['Network Audits', 'Ethical Hacking', 'System Architecture', 'Algorithmic Problem Solving', 'Open-Source Defense'];

  return {
    templateId: 'navy_ledger', // Default to Navy Executive (Institutional Standard)
    personal: {
      name: studentName,
      headline: student?.headline || `${degree} Candidate & Full Stack Developer`,
      email: student?.email || 'shahzeb@rimt.ac.in',
      phone: student?.phone || '+91 9797310798',
      location: 'Punjab, India',
      website: 'www.reallygreatsite.com',
      linkedin: 'linkedin.com/in/shahzeb-rimt',
      github: 'github.com/shahzeb-cyber',
      avatarUrl: student?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      dob: '01 Jan 2004',
      declaration: 'I hereby declare that all academic credentials and project disclosures submitted above are authentic and verified by university records.',
    },
    summary: student?.bio || student?.about_me || `am shazaeb and am cybersecurity passionate. Results-driven ${degree} scholar at RIMT University with strong foundational knowledge in network security, system hardening, and modern web applications. Proven ability to analyze protocols, identify vulnerabilities, and build secure automated pipelines.`,
    education: [
      {
        id: 'edu_1',
        degree: degree,
        institute: 'RIMT University, Mandi Gobindgarh',
        period: batch,
        score: `Cumulative CGPA: ${cgpa}`,
        highlights: 'Relevant Coursework: Computer Networks, Network Security, Operating Systems, Database Systems.',
      },
      {
        id: 'edu_2',
        degree: 'Senior Secondary (12th Grade - Non-Medical)',
        institute: 'Senior Secondary Board',
        period: '2023 - 2024',
        score: 'Aggregate: 88%',
        highlights: 'Mathematics, Computer Science, and Physics.',
      },
    ],
    projects: projectList,
    skills: skillsList,
    languages: languagesList,
    affiliations: affiliationsList,
    references: referencesList,
    interests: interestsList,
    experience: [
      {
        id: 'exp_1',
        role: 'Technical Operations & Security Intern',
        organization: 'Campus IT & Computing Division',
        period: 'Summer 2025 · 3 Months',
        location: 'Punjab, India',
        bullets: [
          'Audited departmental VLAN access across 12 subnets and refined 45+ firewall rules, reducing configuration drift by 28%.',
          'Conducted routine vulnerability scans across 40+ campus lab workstations, documenting and resolving configuration issues.',
          'Collaborated with senior engineers to prepare student lab computing environments for national hackathon tests.',
        ],
      },
      {
        id: 'exp_2',
        role: 'Full Stack & Security Assistant',
        organization: 'RIMT Cyber Defense Lab',
        period: '2024 – 2025',
        location: 'Punjab, India',
        bullets: [
          'Configured intrusion detection rules and monitored packet anomalies across student subnets.',
          'Created automated security scripts reducing lab deployment time by 35%.',
        ],
      },
    ],
    internships: [
      {
        id: 'int_1',
        role: 'Intern Technical Associate',
        organization: 'Campus IT Division',
        period: 'Jun 2024 – Aug 2024',
        location: 'Punjab, India',
        bullets: [
          'Supported senior coordinators in technical candidate evaluations and departmental workflows.',
          'Maintained data entry and kept systems updated with 100% operational consistency.',
        ],
      },
    ],
    certifications: certList,
    additionalInfo: {
      languages: 'English, Hindi, Punjabi',
      certificates: 'Certified Network Defense Practitioner (Cisco), Web Security Fundamentals',
      awards: 'Student Innovator of the Year, Cybersecurity Division (2024)',
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Storage helpers
 */
export async function loadSavedResumeData(rollNo, student) {
  if (!rollNo) return buildDefaultResumeData(student);
  try {
    const raw = await AsyncStorage.getItem(`${RESUME_STORAGE_KEY_PREFIX}${rollNo.toUpperCase().trim()}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const validIds = RESUME_TEMPLATES.map((t) => t.id);
      // Migrate from old removed templates
      if (!validIds.includes(parsed.templateId)) {
        parsed.templateId = 'navy_ledger';
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Error loading saved resume:', err);
  }
  return buildDefaultResumeData(student);
}

export async function saveResumeData(rollNo, resumeData) {
  if (!rollNo) return false;
  try {
    await AsyncStorage.setItem(
      `${RESUME_STORAGE_KEY_PREFIX}${rollNo.toUpperCase().trim()}`,
      JSON.stringify({ ...resumeData, updatedAt: new Date().toISOString() })
    );
    return true;
  } catch (err) {
    console.warn('Error saving resume:', err);
    return false;
  }
}

/**
 * AI Suggestions / Proofreader Rubric (RESUMEE.md Section 8)
 */
export const AI_SUGGESTIONS = [
  {
    id: 'sug_1',
    category: 'Quantify Bullets',
    field: 'experience',
    title: 'Add quantitative impact metric',
    original: 'Assisted network administrators in auditing departmental VLAN access and configuring firewall policies.',
    suggested: 'Audited departmental VLAN access across 12 subnets and refined 45+ firewall rules, reducing configuration drift by 28%.',
    reason: 'Quantifying the scope with numbers (subnets, rules, percentage) signals tangible engineering competence to recruiters.',
    applied: false,
  },
  {
    id: 'sug_2',
    category: 'Action Verbs',
    field: 'projects',
    title: 'Elevate project technical impact',
    original: 'Developed modular system adhering to security best practices and high concurrency benchmarks.',
    suggested: 'Architected automated vulnerability assessment pipeline achieving 99.8% threat detection accuracy with sub-second telemetry indexing.',
    reason: 'Replace passive verbs like "worked on/developed" with high-agency verbs like "Architected" or "Engineered".',
    applied: false,
  },
  {
    id: 'sug_3',
    category: 'ATS Keyword Match',
    field: 'skills',
    title: 'Missing core cybersecurity keywords',
    original: 'Cybersecurity, Network Defense',
    suggested: 'Add: SIEM, Wireshark, OWASP Top 10, Penetration Testing, Zero Trust Architecture',
    reason: 'Targeting tech and cybersecurity placement drives requires explicit matches with ATS screening algorithms.',
    applied: false,
  },
  {
    id: 'sug_4',
    category: 'Academic Alignment',
    field: 'summary',
    title: 'Strengthen candidate summary opener',
    original: 'Dedicated scholar at RIMT University with strong foundational knowledge in network security.',
    suggested: 'High-performing Cyber Systems scholar (CGPA 8.5) specializing in infrastructure hardening, protocol defense, and robust automation.',
    reason: 'Leading with academic excellence (CGPA) and specific specializations hooks recruiters within the first 6 seconds.',
    applied: false,
  },
];

/**
 * Helper to safely extract skills array whether objects or strings
 */
const getSkillsList = (skills) => {
  if (!Array.isArray(skills)) return [];
  return skills.map((s) => (typeof s === 'string' ? { id: s, name: s, pct: 90, stars: 5 } : s));
};

const getLanguagesList = (languages) => {
  if (!Array.isArray(languages)) return [];
  return languages.map((l) => (typeof l === 'string' ? { id: l, name: l, level: 'Fluent', pct: 90, dots: 4 } : l));
};

/**
 * HTML Generator for Vector PDF rendering via expo-print
 * Implements the 4 active templates:
 * 1. navy_ledger (Navy Executive - Image 1 & 2)
 * 2. richard_sanchez (Executive Slate Split - Image 3)
 * 3. herman_walton (Corporate Wall-Street Analyst - Image 4)
 * 4. sunny_singh (Crimson Recruiter Horizon - Image 5)
 */
export function generateResumeHtml(data, templateId = 'navy_ledger') {
  const {
    personal = {},
    summary = '',
    education = [],
    experience = [],
    internships = [],
    certifications = [],
    references = [],
  } = data;

  const skills = getSkillsList(data.skills);
  const languages = getLanguagesList(data.languages);

  // -------------------------------------------------------------------------
  // TEMPLATE 1: NAVY EXECUTIVE LEDGER (Image 1 / Reference 4 marked)
  // -------------------------------------------------------------------------
  if (templateId === 'navy_ledger') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${personal.name || 'Scholar'} - Resume</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff; width: 100%; min-height: 100vh; display: flex; color: #1E2224; }

    /* Deep Navy Sidebar (34%) */
    .navy-sidebar { width: 34%; background: #0B2545; color: #ffffff; padding: 26px 18px; display: flex; flex-direction: column; }
    .navy-avatar-box { width: 110px; height: 110px; border-radius: 50%; border: 4px solid #ffffff; overflow: hidden; margin: 0 auto 18px; background: #134074; }
    .navy-avatar-box img { width: 100%; height: 100%; object-fit: cover; }

    .navy-icon-header { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: #ffffff; }
    .navy-icon-circle { width: 22px; height: 22px; border-radius: 50%; background: #134074; display: flex; align-items: center; justify-content: center; font-size: 11px; }

    .sidebar-section { margin-bottom: 18px; }
    .navy-contact-item { font-size: 10px; color: #D0DBE5; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; word-break: break-all; }

    /* Progress bars for skills */
    .skill-bar-item { margin-bottom: 7px; }
    .skill-bar-top { display: flex; justify-content: space-between; font-size: 10px; color: #ffffff; font-weight: 600; margin-bottom: 2px; }
    .skill-bar-track { height: 4.5px; background: #134074; border-radius: 2px; overflow: hidden; }
    .skill-bar-fill { height: 100%; background: #1D63FF; }

    /* Right Crisp White Canvas (66%) */
    .white-canvas { width: 66%; background: #ffffff; padding: 28px 26px; display: flex; flex-direction: column; }
    .header-name h1 { font-family: 'Montserrat', sans-serif; font-size: 28px; font-weight: 900; color: #0B2545; text-transform: uppercase; letter-spacing: 0.5px; }
    .header-name .headline { font-size: 13px; font-weight: 700; color: #1D63FF; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
    
    .contact-badge-strip { display: flex; gap: 14px; font-size: 10px; color: #64748B; padding-bottom: 10px; border-bottom: 1px solid #E2E8F0; margin-bottom: 16px; font-weight: 500; }

    .section-headline { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; color: #0B2545; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; margin-top: 10px; }
    
    .timeline-entry { position: relative; padding-left: 14px; border-left: 2px solid #CBD5E1; margin-left: 4px; margin-bottom: 12px; }
    .timeline-entry::before { content: ""; position: absolute; left: -20px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: #1D63FF; border: 2px solid #ffffff; }

    .entry-header-row { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px; }
    .entry-title { font-size: 11.5px; font-weight: 700; color: #0F172A; flex: 1; min-width: 140px; }
    .entry-score-pill { background: #EEF2F6; color: #0B2545; font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 4px; white-space: nowrap; }
    .entry-inst { font-size: 10px; color: #1D63FF; font-weight: 600; margin-bottom: 3px; }
    .entry-bullets { margin-left: 14px; }
    .entry-bullets li { font-size: 10px; color: #475569; line-height: 1.4; margin-bottom: 2px; }
    .declaration-box { margin-top: auto; padding-top: 8px; border-top: 1px dashed #CBD5E1; font-size: 9.5px; color: #64748B; }
  </style>
</head>
<body>
  <!-- NAVY SIDEBAR -->
  <div class="navy-sidebar">
    <div class="navy-avatar-box"><img src="${personal.avatarUrl}" alt="Photo" /></div>
    
    <div class="sidebar-section">
      <div class="navy-icon-header"><span class="navy-icon-circle">👤</span> ABOUT ME</div>
      <p style="font-size:10px; color:#D0DBE5; line-height:1.45;">${summary}</p>
    </div>

    <div class="sidebar-section">
      <div class="navy-icon-header"><span class="navy-icon-circle">📞</span> CONTACT</div>
      <div class="navy-contact-item"><span>📞</span> ${personal.phone || ''}</div>
      <div class="navy-contact-item"><span>✉️</span> ${personal.email || ''}</div>
      <div class="navy-contact-item"><span>📍</span> ${personal.location || ''}</div>
      ${personal.website ? `<div class="navy-contact-item"><span>🌐</span> ${personal.website}</div>` : ''}
    </div>

    <div class="sidebar-section">
      <div class="navy-icon-header"><span class="navy-icon-circle">⚙️</span> SKILLS</div>
      ${skills.map(s => `
        <div class="skill-bar-item">
          <div class="skill-bar-top"><span>${s.name}</span><span>${s.pct || 90}%</span></div>
          <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${s.pct || 90}%;"></div></div>
        </div>
      `).join('')}
    </div>

    ${languages.length ? `
    <div class="sidebar-section">
      <div class="navy-icon-header"><span class="navy-icon-circle">🌐</span> LANGUAGES</div>
      ${languages.map(l => `<div style="font-size:10px; color:#D0DBE5; margin-bottom:3px;">• ${l.name} (${l.level || 'Fluent'})</div>`).join('')}
    </div>` : ''}
  </div>

  <!-- CRISP WHITE CANVAS -->
  <div class="white-canvas">
    <div class="header-name">
      <h1>${personal.name || 'Candidate Name'}</h1>
      <div class="headline">${personal.headline || ''}</div>
    </div>

    <div class="contact-badge-strip">
      <span>📅 ${personal.dob || '01 Jan 2004'}</span>
      <span>📍 ${personal.location || 'Punjab, India'}</span>
    </div>

    <!-- EDUCATION -->
    <div class="section-headline"><span>🎓</span> EDUCATION</div>
    ${education.map(e => `
      <div class="timeline-entry">
        <div class="entry-header-row">
          <span class="entry-title">${e.degree}</span>
          ${e.score ? `<span class="entry-score-pill">${e.score}</span>` : ''}
        </div>
        <div class="entry-inst">${e.institute} (${e.period})</div>
        ${e.highlights ? `<p style="font-size:9.5px; color:#64748B;">${e.highlights}</p>` : ''}
      </div>
    `).join('')}

    <!-- EXPERIENCE -->
    <div class="section-headline"><span>💼</span> EXPERIENCE</div>
    ${experience.map(exp => `
      <div class="timeline-entry">
        <div class="entry-title">${exp.role}</div>
        <div class="entry-inst">${exp.organization} | ${exp.period}</div>
        <ul class="entry-bullets">${(exp.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
      </div>
    `).join('')}

    ${personal.declaration ? `
    <div class="declaration-box">
      <div style="font-weight:700; color:#0B2545; margin-bottom:2px;">DECLARATION</div>
      <p>${personal.declaration}</p>
    </div>` : ''}
  </div>
</body>
</html>`;
  }

  // -------------------------------------------------------------------------
  // TEMPLATE 2: EXECUTIVE SLATE SPLIT (Richard Sanchez - Image 3)
  // -------------------------------------------------------------------------
  if (templateId === 'richard_sanchez') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${personal.name || 'Richard Sanchez'} - Resume</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff; width: 100%; min-height: 100vh; color: #1F2937; }

    /* Top Slate Header */
    .header-bar { background: #1B2433; padding: 26px 28px 22px 165px; position: relative; color: #ffffff; }
    .avatar-circle { position: absolute; top: 16px; left: 22px; width: 120px; height: 120px; border-radius: 50%; border: 4px solid #ffffff; overflow: hidden; background: #2B3346; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.18); }
    .avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
    .header-name { font-size: 28px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #ffffff; }
    .header-role { font-size: 13px; font-weight: 700; color: #9CA3AF; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }

    .body-wrap { display: flex; min-height: calc(100vh - 90px); }

    /* Left Light-Grey Column */
    .left-col { width: 33%; background: #EDEEF2; padding: 26px 18px; display: flex; flex-direction: column; }
    .left-section-title { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #111827; padding-bottom: 4px; border-bottom: 1.5px solid #111827; margin-bottom: 10px; margin-top: 14px; }
    .left-section-title:first-child { margin-top: 0; }
    .contact-line { font-size: 10px; color: #374151; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; word-break: break-all; }
    
    .bullet-list { list-style: none; padding-left: 0; }
    .bullet-list li { font-size: 10px; color: #374151; margin-bottom: 4px; position: relative; padding-left: 10px; }
    .bullet-list li::before { content: "•"; position: absolute; left: 0; color: #111827; }

    .ref-card { margin-bottom: 8px; font-size: 10px; color: #374151; }
    .ref-name { font-weight: 800; color: #111827; }
    .ref-sub { font-size: 9.5px; color: #4B5563; margin-bottom: 2px; }

    /* Right White Column */
    .right-col { width: 67%; background: #ffffff; padding: 24px 26px; }
    .right-section-head { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; margin-top: 16px; padding-bottom: 4px; border-bottom: 1px solid #E5E7EB; }
    .right-section-head:first-child { margin-top: 0; }
    .head-icon { width: 22px; height: 22px; border-radius: 50%; background: #1B2433; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; }

    .timeline-wrap { position: relative; padding-left: 16px; border-left: 2px solid #CBD5E1; margin-left: 6px; }
    .timeline-node { position: relative; margin-bottom: 14px; }
    .timeline-node::before { content: ""; position: absolute; left: -22px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: #ffffff; border: 2.5px solid #1B2433; }
    .node-header { display: flex; justify-content: space-between; align-items: baseline; }
    .node-company { font-size: 11.5px; font-weight: 800; color: #111827; }
    .node-period { font-size: 10px; font-weight: 700; color: #4B5563; }
    .node-role { font-size: 10.5px; color: #374151; font-weight: 600; margin-bottom: 3px; }
    .node-bullets { margin-left: 14px; }
    .node-bullets li { font-size: 10px; color: #4B5563; line-height: 1.4; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="avatar-circle"><img src="${personal.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}" alt="Photo" /></div>
    <div class="header-name">${personal.name || 'RICHARD SANCHEZ'}</div>
    <div class="header-role">${personal.headline || 'MARKETING MANAGER'}</div>
  </div>

  <div class="body-wrap">
    <!-- LEFT SIDEBAR -->
    <div class="left-col">
      <div class="left-section-title">CONTACT</div>
      <div class="contact-line"><span>📞</span> ${personal.phone || '+123-456-7890'}</div>
      <div class="contact-line"><span>✉️</span> ${personal.email || 'hello@reallygreatsite.com'}</div>
      <div class="contact-line"><span>📍</span> ${personal.location || '123 Anywhere St., Any City'}</div>
      ${personal.website ? `<div class="contact-line"><span>🌐</span> ${personal.website}</div>` : ''}

      <div class="left-section-title">SKILLS</div>
      <ul class="bullet-list">
        ${skills.map(s => `<li>${s.name}</li>`).join('')}
      </ul>

      <div class="left-section-title">LANGUAGES</div>
      <ul class="bullet-list">
        ${languages.map(l => `<li>${l.name} (${l.level || 'Fluent'})</li>`).join('')}
      </ul>

      ${references.length ? `
      <div class="left-section-title">REFERENCE</div>
      ${references.map(r => `
        <div class="ref-card">
          <div class="ref-name">${r.name}</div>
          <div class="ref-sub">${r.company}</div>
          ${r.phone ? `<div>Phone: ${r.phone}</div>` : ''}
          ${r.email ? `<div>Email: ${r.email}</div>` : ''}
        </div>
      `).join('')}` : ''}
    </div>

    <!-- RIGHT MAIN BODY -->
    <div class="right-col">
      <div class="right-section-head"><span class="head-icon">👤</span> PROFILE</div>
      <p style="font-size:10.5px; color:#374151; line-height:1.5; margin-bottom:14px;">${summary}</p>

      <div class="right-section-head"><span class="head-icon">💼</span> WORK EXPERIENCE</div>
      <div class="timeline-wrap">
        ${experience.map(exp => `
          <div class="timeline-node">
            <div class="node-header">
              <span class="node-company">${exp.organization}</span>
              <span class="node-period">${exp.period}</span>
            </div>
            <div class="node-role">${exp.role}</div>
            <ul class="node-bullets">${(exp.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
          </div>
        `).join('')}
      </div>

      <div class="right-section-head"><span class="head-icon">🎓</span> EDUCATION</div>
      <div class="timeline-wrap">
        ${education.map(edu => `
          <div class="timeline-node">
            <div class="node-header">
              <span class="node-company">${edu.degree}</span>
              <span class="node-period">${edu.period}</span>
            </div>
            <div class="node-role">${edu.institute}</div>
            ${edu.score ? `<div style="font-size:10px; color:#1B2433; font-weight:700;">${edu.score}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // -------------------------------------------------------------------------
  // TEMPLATE 3: CORPORATE ANALYST CLASSIC (Herman Walton - Image 4)
  // -------------------------------------------------------------------------
  if (templateId === 'herman_walton') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${personal.name || 'Herman Walton'} - Resume</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff; width: 100%; min-height: 100vh; padding: 36px 40px; color: #1F2937; position: relative; }

    /* Corner Marks */
    .corner-tl { position: absolute; top: 16px; left: 16px; width: 18px; height: 18px; border-top: 1.5px solid #CBD5E1; border-left: 1.5px solid #CBD5E1; }
    .corner-tr { position: absolute; top: 16px; right: 16px; width: 18px; height: 18px; border-top: 1.5px solid #CBD5E1; border-right: 1.5px solid #CBD5E1; }
    .corner-bl { position: absolute; bottom: 16px; left: 16px; width: 18px; height: 18px; border-bottom: 1.5px solid #CBD5E1; border-left: 1.5px solid #CBD5E1; }
    .corner-br { position: absolute; bottom: 16px; right: 16px; width: 18px; height: 18px; border-bottom: 1.5px solid #CBD5E1; border-right: 1.5px solid #CBD5E1; }

    .top-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
    .header-info h1 { font-size: 30px; font-weight: 900; color: #1A56DB; letter-spacing: 0.5px; text-transform: uppercase; }
    .header-info .sub-title { font-size: 15px; font-weight: 800; color: #111827; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px; }
    .contact-strip { font-size: 10.5px; color: #374151; margin-top: 8px; font-weight: 500; }

    .photo-box { width: 95px; height: 115px; border-radius: 4px; border: 1px solid #D1D5DB; overflow: hidden; background: #F3F4F6; flex-shrink: 0; }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }

    .section-title { font-size: 11.5px; font-weight: 800; color: #1A56DB; letter-spacing: 0.5px; text-transform: uppercase; padding-bottom: 4px; border-bottom: 1.5px solid #1A56DB; margin-top: 14px; margin-bottom: 8px; }

    .entry-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; margin-bottom: 3px; }
    .entry-role { font-weight: 700; color: #111827; }
    .entry-date { font-weight: 700; color: #111827; }
    .entry-inst { font-size: 10px; color: #4B5563; margin-bottom: 3px; }
    
    .entry-bullets { margin-left: 16px; margin-bottom: 8px; }
    .entry-bullets li { font-size: 10px; color: #4B5563; line-height: 1.45; margin-bottom: 2px; }

    .skills-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 12px; margin-top: 6px; margin-bottom: 10px; }
    .skill-grid-item { font-size: 10px; color: #374151; font-weight: 500; }

    .add-info-list { list-style: disc; margin-left: 16px; font-size: 10px; color: #374151; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="corner-tl"></div><div class="corner-tr"></div><div class="corner-bl"></div><div class="corner-br"></div>

  <div class="top-header">
    <div class="header-info">
      <h1>${personal.name || 'HERMAN WALTON'}</h1>
      <div class="sub-title">${personal.headline || 'FINANCIAL ANALYST'}</div>
      <div class="contact-strip">${[personal.phone ? `📞 ${personal.phone}` : '', personal.email ? `✉️ ${personal.email}` : '', personal.location ? `📍 ${personal.location}` : ''].filter(Boolean).join(' &nbsp;·&nbsp; ') || `${personal.location || 'New York, USA'} | ${personal.phone || '(412) 479-6342'} | ${personal.email || 'example@gmail.com'}`}</div>
    </div>
    <div class="photo-box"><img src="${personal.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}" alt="Photo" /></div>
  </div>

  <div class="section-title">SUMMARY</div>
  <p style="font-size:10px; color:#374151; line-height:1.5;">${summary}</p>

  <div class="section-title">PROFESSIONAL EXPERIENCE</div>
  ${experience.map(exp => `
    <div style="margin-bottom:8px;">
      <div class="entry-row">
        <span class="entry-role">${exp.role}, ${exp.organization}</span>
        <span class="entry-date">${exp.period}</span>
      </div>
      <ul class="entry-bullets">${(exp.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
    </div>
  `).join('')}

  <div class="section-title">EDUCATION</div>
  ${education.map(edu => `
    <div style="margin-bottom:8px;">
      <div class="entry-row">
        <span class="entry-role">${edu.degree}</span>
        <span class="entry-date">${edu.period}</span>
      </div>
      <div class="entry-inst">${edu.institute}${edu.score ? ` · ${edu.score}` : ''}</div>
      ${edu.highlights ? `<p style="font-size:9.5px; color:#4B5563; margin-left:14px;">• ${edu.highlights}</p>` : ''}
    </div>
  `).join('')}

  <div class="section-title">TECHNICAL SKILLS</div>
  <div class="skills-grid">
    ${skills.map(s => `<div class="skill-grid-item">${s.name}</div>`).join('')}
  </div>

  <div class="section-title">ADDITIONAL INFORMATION</div>
  <ul class="add-info-list">
    ${languages.length ? `<li><strong>Languages:</strong> ${languages.map(l => l.name).join(', ')}</li>` : ''}
    ${certifications.length ? `<li><strong>Certificates:</strong> ${certifications.map(c => c.title).join(', ')}</li>` : ''}
    <li><strong>Awards/Activities:</strong> Academic Honors & High Performance Recognition</li>
  </ul>
</body>
</html>`;
  }

  // -------------------------------------------------------------------------
  // TEMPLATE 4: CRIMSON RECRUITER HORIZON (Sunny Singh - Image 5)
  // -------------------------------------------------------------------------
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${personal.name || 'Sunny Singh'} - Resume</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff; width: 100%; min-height: 100vh; color: #1F2937; }

    /* Top Header */
    .top-header { display: flex; align-items: center; gap: 20px; padding: 24px 28px 18px; position: relative; background: #FAFAFA; }
    .avatar-box { width: 105px; height: 125px; border-radius: 14px; border: 3px solid #2B2D42; overflow: hidden; background: #E5E7EB; flex-shrink: 0; }
    .avatar-box img { width: 100%; height: 100%; object-fit: cover; }
    .header-content h1 { font-size: 28px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.5px; }
    .header-content .role { font-size: 14px; font-weight: 700; color: #4B5563; margin-top: 2px; margin-bottom: 6px; }
    .header-content p { font-size: 10px; color: #374151; line-height: 1.45; }

    /* Crimson Banner */
    .crimson-banner { background: #A11B24; color: #ffffff; padding: 10px 24px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 600; }
    .banner-item { display: flex; align-items: center; gap: 6px; }

    /* Two-Column Body */
    .body-split { display: flex; padding: 20px 24px; }
    .left-col { width: 62%; padding-right: 20px; }
    .right-col { width: 38%; padding-left: 12px; }

    .maroon-heading { font-size: 12px; font-weight: 800; color: #111827; text-transform: uppercase; padding-bottom: 4px; border-bottom: 2px solid #A11B24; margin-bottom: 10px; margin-top: 14px; }
    .maroon-heading:first-child { margin-top: 0; }

    .job-title { font-size: 11px; font-weight: 800; color: #111827; }
    .job-company { font-size: 10.5px; font-weight: 700; color: #374151; }
    .job-meta { font-size: 9.5px; color: #6B7280; font-style: italic; margin-bottom: 4px; }
    .job-bullets { margin-left: 14px; margin-bottom: 10px; }
    .job-bullets li { font-size: 9.5px; color: #4B5563; line-height: 1.4; margin-bottom: 2px; }

    .skill-badge { background: #A11B24; color: #ffffff; font-size: 9.5px; font-weight: 700; padding: 5px 10px; border-radius: 6px; text-align: center; margin-bottom: 5px; }

    .lang-row { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #374151; margin-bottom: 6px; }
    .lang-dots { display: flex; gap: 4px; }
    .lang-dot { width: 7px; height: 7px; border-radius: 50%; }
    .lang-dot.active { background: #A11B24; }
    .lang-dot.inactive { background: #D1D5DB; }
  </style>
</head>
<body>
  <div class="top-header">
    <div class="avatar-box"><img src="${personal.avatarUrl}" alt="Photo" /></div>
    <div class="header-content">
      <h1>${personal.name || 'SUNNY SINGH'}</h1>
      <div class="role">${personal.headline || 'Technical Recruiter'}</div>
      <p>${summary}</p>
    </div>
  </div>

  <div class="crimson-banner">
    <div class="banner-item">📞 ${personal.phone || '+91-9876543210'}</div>
    <div class="banner-item">✉️ ${personal.email || 'singhsun@gmail.com'}</div>
    <div class="banner-item">📍 ${personal.location || 'Indore, India'}</div>
    <div class="banner-item">🔗 ${personal.linkedin || 'LinkedIn'}</div>
  </div>

  <div class="body-split">
    <!-- LEFT COLUMN -->
    <div class="left-col">
      <div class="maroon-heading">EMPLOYMENT HISTORY</div>
      ${experience.map(exp => `
        <div style="margin-bottom:8px;">
          <div class="job-title">${exp.role}</div>
          <div class="job-company">${exp.organization}</div>
          <div class="job-meta">${exp.period} | ${exp.location || personal.location || 'India'}</div>
          <ul class="job-bullets">${(exp.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
        </div>
      `).join('')}

      ${(internships && internships.length > 0) ? `
      <div class="maroon-heading">INTERNSHIPS</div>
      ${internships.map(it => `
        <div style="margin-bottom:8px;">
          <div class="job-title">${it.role}</div>
          <div class="job-company">${it.organization}</div>
          <div class="job-meta">${it.period} | ${it.location || personal.location || 'India'}</div>
          <ul class="job-bullets">${(it.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
        </div>
      `).join('')}` : ''}
    </div>

    <!-- RIGHT COLUMN -->
    <div class="right-col">
      <div class="maroon-heading">EDUCATION</div>
      ${education.map(edu => `
        <div style="margin-bottom:8px;">
          <div class="job-title">${edu.degree}</div>
          <div class="job-company">${edu.institute}</div>
          <div class="job-meta">${edu.period}</div>
        </div>
      `).join('')}

      <div class="maroon-heading">SKILLS</div>
      ${skills.map(s => `<div class="skill-badge">${s.name}</div>`).join('')}

      <div class="maroon-heading">LANGUAGES</div>
      ${languages.map(l => {
        const count = l.dots || (l.pct ? Math.round(l.pct / 20) : 4);
        return `
          <div class="lang-row">
            <span>${l.name}</span>
            <div class="lang-dots">
              ${[1, 2, 3, 4, 5].map(i => `<span class="lang-dot ${i <= count ? 'active' : 'inactive'}"></span>`).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF file and get local URI
 */
export async function exportResumeToPdf(resumeData, templateId) {
  try {
    const html = generateResumeHtml(resumeData, templateId);
    // Request base64 so we can write directly to permitted app sandbox (documentDirectory).
    // In Expo Go on Android, Print.printToFileAsync saves to an unscoped cache directory
    // that triggers "Not allowed to read file under given URL" if shared or converted to contentUri.
    const result = await Print.printToFileAsync({
      html,
      base64: true,
    });

    let finalUri = result.uri;
    if (result.base64) {
      try {
        const targetDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        const cleanPath = `${targetDir}CVForge_Resume_${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(cleanPath, result.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        finalUri = cleanPath;
      } catch (writeErr) {
        console.warn('Failed to write base64 to documentDirectory, fallback to print URI:', writeErr);
      }
    }

    return { success: true, uri: finalUri, numberOfPages: result.numberOfPages };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message || 'Failed to render PDF.' };
  }
}

/**
 * Direct print or system preview
 */
export async function printResumeDirectly(resumeData, templateId) {
  try {
    const html = generateResumeHtml(resumeData, templateId);
    await Print.printAsync({ html });
    return { success: true };
  } catch (error) {
    console.error('Error printing resume:', error);
    return { success: false, error: error.message || 'Print error.' };
  }
}

/**
 * Share PDF to external apps
 */
export async function shareResumeFile(fileUri, scholarName = 'Scholar') {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Sharing is not supported on this device/platform.' };
    }
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${scholarName} - Resume.pdf`,
      UTI: 'com.adobe.pdf',
    });
    return { success: true };
  } catch (error) {
    console.error('Error sharing PDF:', error);
    return { success: false, error: error.message || 'Share aborted.' };
  }
}

export async function openResumeInDrive(fileUri) {
  try {
    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      
      // Attempt 1: Target Google Drive PDF Viewer specific activities
      const driveCandidates = [
        { packageName: 'com.google.android.apps.docs', className: 'com.google.android.apps.docs.viewer.PdfViewerActivity' },
        { packageName: 'com.google.android.apps.docs', className: 'com.google.android.apps.viewer.PdfViewerActivity' },
        { packageName: 'com.google.android.apps.docs', className: 'com.google.android.apps.docs.viewer.browse.BrowseDocsExtensionActivity' },
        { packageName: 'com.google.android.apps.pdfviewer', className: 'com.google.android.apps.pdfviewer.PdfViewerActivity' },
      ];

      for (const candidate of driveCandidates) {
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            type: 'application/pdf',
            packageName: candidate.packageName,
            className: candidate.className,
            flags: 268435457, // FLAG_GRANT_READ_URI_PERMISSION (1) | FLAG_ACTIVITY_NEW_TASK (268435456)
          });
          return { success: true };
        } catch {}
      }

      // Attempt 2: General Android VIEW intent for PDF (directly opens Drive PDF Viewer or default reader with zero upload)
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/pdf',
        flags: 268435457, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
      });
      return { success: true };
    } else {
      // iOS
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Open with Google Drive',
          UTI: 'com.adobe.pdf',
        });
        return { success: true };
      }
    }
  } catch (err) {
    console.error('openResumeInDrive error:', err);
    Alert.alert(
      'Notice',
      'Could not open Google Drive directly. Please verify Google Drive or a PDF reader is installed.'
    );
    return { success: false, error: err.message };
  }
  return { success: true };
}

/**
 * Open PDF file directly in system default PDF viewer
 * WITHOUT requiring cloud upload
 */
export async function openResumePdfViewer(fileUri) {
  try {
    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/pdf',
        flags: 268435457, // FLAG_GRANT_READ_URI_PERMISSION (1) | FLAG_ACTIVITY_NEW_TASK (268435456)
      });
      return { success: true };
    } else {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Open PDF Document',
          UTI: 'com.adobe.pdf',
        });
        return { success: true };
      }
    }
  } catch (err) {
    console.error('openResumePdfViewer error:', err);
    Alert.alert(
      'Notice',
      'Could not open PDF viewer directly. Please verify a PDF viewer app is installed on your device.'
    );
    return { success: false, error: err.message };
  }
  return { success: true };
}


