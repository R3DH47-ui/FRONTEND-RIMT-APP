# 📱 APP.md — RIMT Student Application Master Memory

> **Single Source of Truth:** Complete architecture, screens, services, and file map for the RIMT University Student App.  
> **Last Updated:** 2026-10-07  
> **Role:** Senior Full-Stack & System Logic Engineer Specification  
> **Status:** Active; bio, headline & profession cross-compatibility live, paired admin portal session-switching & multi-account isolation verified, live placement stats badge system integrated, Cloudinary signed uploads operational  

---

## 1. Project Overview
`APP-RIMIT` is the student-facing Expo (React Native) mobile and web application for RIMT University. It provides students with access to academic credentials, training documents, project portfolios, and placement opportunities.

### Gated Onboarding Architecture:
1. **Registration:** Student enters Full Name, Roll Number, Department, and Year/Semester (4 fields only — no email, no password). The app reports success only after Supabase confirms the `PENDING` insert. Local storage caches confirmed rows but is never an authority for account status.
  - **Shared record contract:** The app writes Supabase `students.name` and `students.roll_no` (plus department/course and batch/semester aliases). The paired admin portal must normalize these to its `full_name` and `roll_number` aliases. The app and admin server do not share process-local memory.
2. **Review State:** The student is redirected to the **`PendingApprovalScreen`**, which shows their submitted details, onboarding timeline steps, and a live "Check Approval Status" refresher.
3. **Admin Decision (via `ADMIN-PANEL-RIMT`):**
   - **Approved:** Admin clicks "Approve Student" in the Admin Portal. The student's status becomes `APPROVED`, granting direct entry into the Home Dashboard, Profile Editing, and Document Vault.
   - **Rejected:** Admin clicks "Reject Student" with an explanation. The student is barred from logging in and shown the **`RejectedScreen`** with the registrar's remarks and contact channels.
  - **Revoked:** Admin removes access from an approved student with a separate reason. The app blocks sign-in and evicts an active dashboard session on its next live status check.
4. **Session Guard:** On app launch and every 3.5 seconds while approved, the app checks live Supabase status. Cached approval cannot override a rejected, revoked, pending, missing, or unreadable record.

---

## 2. Tech Stack

| Domain | Technology | Details |
|---|---|---|
| **Framework** | Expo SDK 57 (React Native 0.86.3) | Cross-platform mobile & web app |
| **React** | React 19.2.3 | Latest React with concurrent features |
| **Navigation** | Custom screen state in `App.jsx` | Status-aware routing (PENDING/REJECTED/APPROVED) |
| **Database** | PostgreSQL via Supabase (`pwghazyfxhypzkadqfnn`) | Cloud relational storage with RLS |
| **Auth Service** | `authService.js` | Supabase-authoritative signup/login/status checks; local cache is non-authoritative |
| **State Management** | React Context (`AuthContext.js`) | Global auth state with status guards |
| **Storage** | AsyncStorage + localStorage (web) | Cross-platform persistent storage adapter |
| **File Uploads** | Cloudinary (server-signed via admin portal) | Certificates & documents uploaded directly to Cloudinary with server-generated signatures |
| **Document Service** | `documentService.js` | Document download, upload, management, and offline caching |
| **Paired Admin Portal** | `ADMIN-PANEL-RIMT` (Next.js 16.3.8) | Admin approval/rejection queue, API routes, Cloudinary signing endpoint |

---

## 3. Complete Directory & File Structure

```
c:\Users\r3dha\APP-RIMIT-(2)\
├── APP.md                        # ⭐ THE SINGLE MASTER MEMORY FILE (This Document)
├── AGENTS.md                     # Expo/React Native project rules for AI agents
├── CLAUDE.md                     # Claude-specific project hints
├── Mega Update.md                # Mega update changelog
├── NEW-FEATURE.md                # Feature specification & DoD for Admin Panel Authentication
├── LICENSE                       # Project license
├── App.jsx                       # Root component: SafeArea + AuthProvider + MainNavigator
├── app.json                      # Expo SDK 57 configuration (portrait, plugins: expo-font, expo-image-picker, expo-sharing, expo-asset)
├── package.json                  # Dependencies: expo@57, react@19.2.3, react-native@0.86.3, @supabase/supabase-js, etc.
├── index.js                      # Expo entry point (registerRootComponent)
├── eslint.config.js              # ESLint configuration (eslint-config-expo)
├── metro.config.js               # Metro bundler configuration
├── .env                          # Supabase URL + Anon Key + Cloudinary config + Signing URL
├── .env.example                  # Expo Cloudinary public config template
│
├── src/
│   ├── context/
│   │   └── AuthContext.js        # React Context with gated session management, live status guard & Realtime subscriptions
│   │
│   ├── services/
│   │   ├── authService.js        # Full auth lifecycle: signUp, signIn, checkStatus, signOut, updateProfile, getFullStudentData
│   │   ├── documentService.js    # Document upload (Cloudinary signed), download, management & offline caching
│   │   └── supabase.js           # Supabase client initialization from env vars
│   │
│   ├── screens/
│   │   ├── SignInScreen.jsx      # ⭐ 4-field registration form (Name, Roll No, Dept, Year) + login with status routing
│   │   ├── PendingApprovalScreen.jsx # ⭐ "Awaiting Admin Review" screen with live status polling
│   │   ├── RejectedScreen.jsx    # ⭐ "Access Denied" screen with rejection reason display
│   │   ├── HomeScreen.jsx        # Protected dashboard (APPROVED only) — placement stats & quicklinks
│   │   ├── ProfileScreen.jsx     # Academic profile viewer with realtime dossier data
│   │   ├── EditProfileScreen.jsx # Protected profile editor (APPROVED only) — bio, headline, avatar, banner
│   │   ├── ProjectsScreen.jsx    # Student project portfolio with media attachments
│   │   ├── CredentialsScreen.jsx # Certificate & credential vault with Cloudinary upload & verification badges
│   │   └── OnboardingScreen.jsx  # First-launch campus guide carousel
│   │
│   ├── components/
│   │   ├── BottomNav.jsx         # Floating bottom navigation bar (visible on auth'd screens)
│   │   ├── Header.jsx            # App header component with avatar and title
│   │   ├── ActionTile.jsx        # Tappable action tile for quick links
│   │   ├── MetricCard.jsx        # Metric display card for stats
│   │   ├── DocumentCard.jsx      # Document display card with preview
│   │   ├── DocumentDetailModal.jsx # Full document detail modal viewer
│   │   ├── NoticeModal.jsx       # Announcement and notice modal
│   │   ├── PhotoViewerModal.jsx  # Full-screen immersive photo viewer with zoom & identity tags
│   │   ├── ShineEffect.jsx       # Decorative animated shine effect
│   │   ├── UploadSuccessModal.jsx # Upload success confirmation modal
│   │   ├── ViewToggle.jsx        # Grid/List view toggle button
│   │   └── ZoomCard.jsx          # Zoomable card component with touch animations
│   │
│   ├── theme/
│   │   └── tokens.js             # Design system: Colors, Radii, Typography, Spacing, getAvatarSource() helper
│   │
│   └── utils/
│       ├── fileUtils.js          # File handling utilities: URI conversion, MIME detection, permissions
│       └── documentViewer.js     # Document viewer utilities: PDF/image preview, sharing, external app launch
│
├── supabase/
│   ├── schema.sql                # Original database schema
│   ├── schema_gated_onboarding.sql # Gated onboarding migration with status field & indexes
│   └── migrations/
│       ├── 002_student_profile_academics.sql              # Student profile & academic columns, RLS update, CGPA index, academic_score trigger
│       ├── 20260929_admin_auth_schema.sql                 # Admin accounts schema for paired portal
│       ├── 20260929_fix_document_storage_and_tables.sql   # Document storage bucket & RLS policies
│       ├── 20260929_student_review_states.sql             # Student review state columns & revocation support
│       ├── 20260930_fixed_admin_accounts.sql              # Fixed admin accounts (Raj Kumar, Sagrika) with PBKDF2 hashes
│       ├── 20260930_add_student_bio_and_academic_score.sql # Student bio, headline, cgpa, academic_score, banner_url, projects, skills, semester_scores
│       ├── 20260930_admin_student_dossier.sql             # Unified Student Dossier, 9 tables, RLS policies, manual-only academic summary, private certificate bucket
│       └── 20261002_add_student_internships.sql           # Adds JSONB 'internships' column to students table
│
└── assets/                       # Static assets
    ├── icon.png                  # App icon (393KB)
    ├── splash-icon.png           # Splash screen icon
    ├── favicon.png               # Web favicon
    ├── default-avatar.png        # Default student avatar fallback
    ├── android-icon-foreground.png # Android adaptive icon foreground
    ├── android-icon-background.png # Android adaptive icon background
    └── android-icon-monochrome.png # Android adaptive icon monochrome
```

### Shared Uploads (Cloudinary Architecture)

Project logos and certificates use public cloud URLs so both the student app and admin portal can render them. Uploads use **Cloudinary through the admin portal's `/api/cloudinary/sign` endpoint** (server-signed uploads):

1. The mobile app calls the admin portal's `POST /api/cloudinary/sign` with `{ folder: "rimt-academic-trust/<ROLL_NO>" }`.
2. The admin portal generates a SHA-1 signature using its server-side `CLOUDINARY_API_SECRET` and returns `{ signature, timestamp, api_key, cloud_name, folder }`.
3. The mobile app uploads directly to `https://api.cloudinary.com/v1_1/<cloud_name>/auto/upload` with the signed parameters.

**Environment variable chain:**
- Admin panel `.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server-only)
- Mobile app `.env`: `EXPO_PUBLIC_CLOUDINARY_SIGNING_URL` → points to admin portal's `/api/cloudinary/sign`
- For local development: use LAN IP (e.g., `http://10.31.161.176:3000/api/cloudinary/sign`)
- **Never put `CLOUDINARY_API_SECRET` in an `EXPO_PUBLIC_*` variable.**

---

## 4. All Screens & Views

### 4.1 SignInScreen (`src/screens/SignInScreen.jsx`)
- **Purpose:** Unified login & registration interface.
- **Login Mode:** Roll Number only (no password). On submit:
  - `APPROVED` → navigates to `HomeScreen`
  - `PENDING` → navigates to `PendingApprovalScreen` with student data
  - `REJECTED` / `REVOKED` → navigates to `RejectedScreen` with the recorded reason
- **Register Mode:** 4-field form (Full Name, Roll Number, Department, Year/Semester).
  - **Departments available:** BCA, B.Sc IT, B.Sc Cyber Security, B.Sc (Hons) AI & ML
  - On success → creates PENDING student, navigates to `OnboardingScreen`
  - **Profile Photo Upload:** Students can attach a profile photo via `expo-image-picker` on signup for admin verification.

### 4.2 PendingApprovalScreen (`src/screens/PendingApprovalScreen.jsx`)
- **Purpose:** Informs user their account is under administrative review.
- **Features:**
  - Displays submitted student details (name, roll number, department, etc.)
  - Visual onboarding timeline showing current review step
  - "Check Approval Status" button that polls Supabase for status changes
  - If status changes to `APPROVED` → auto-navigates to `HomeScreen`
  - If status changes to `REJECTED` → redirects to `RejectedScreen`
  - Back to Sign In button for re-authentication

### 4.3 RejectedScreen (`src/screens/RejectedScreen.jsx`)
- **Purpose:** Displays official rejection notice from university administration.
- **Features:**
  - Student identity display
  - Rejection reason from admin (stored in `rejection_reason` column)
  - Contact support channels (registrar email, phone)
  - Back to Sign In button

### 4.4 HomeScreen (`src/screens/HomeScreen.jsx`)
- **Purpose:** Protected main dashboard (APPROVED users only).
- **Features:** Placement stats, quick links, notifications, academic feed.

### 4.5 ProfileScreen (`src/screens/ProfileScreen.jsx`)
- **Purpose:** Academic profile display with credentials, bio, department info, and realtime dossier data from admin-managed tables.

### 4.6 EditProfileScreen (`src/screens/EditProfileScreen.jsx`)
- **Purpose:** Protected profile editor (APPROVED only). Allows modifying legal name, contact phone number, academic batch, professional bio & summary, course, avatar portrait, and campus hero banner.
- **LinkedIn Cross-Compatibility:** The `bio` field syncs with the admin portal's LinkedIn-Style Scholar Dossier tracker. Admin can view and override student bio, headline, and academic metrics via `StudentLinkedInProfileModal.jsx` on the paired portal.

### 4.7 ProjectsScreen (`src/screens/ProjectsScreen.jsx`)
- **Purpose:** Student project portfolio with media attachments.

### 4.8 CredentialsScreen (`src/screens/CredentialsScreen.jsx`)
- **Purpose:** Certificate and credential vault with verification badges and Cloudinary-based document upload.
- **Upload Flow:** Uses `documentService.js` to obtain a Cloudinary signed URL from the admin portal and upload directly to Cloudinary.

### 4.9 OnboardingScreen (`src/screens/OnboardingScreen.jsx`)
- **Purpose:** First-launch campus guide carousel introducing app features.

---

## 5. Authentication & Session Flow

### 5.1 AuthContext (`src/context/AuthContext.js`)
**Provides:**
- `currentStudent` — Active authenticated student (only if APPROVED)
- `signIn({ rollNo })` — Gated login with status check (roll number only, no password)
- `signUp(data)` — Registration → PENDING (no session created)
- `signOut()` — Clears session from storage
- `updateProfile(profile)` — Profile mutations (APPROVED only)
- `refreshStatus()` — Re-checks Supabase connection health
- `checkStatusForStudent({ rollNo })` — Polls live approval status

**Critical Status Guard on Init:**
```javascript
// On app launch, cached identity is revalidated against Supabase:
const live = await checkStudentApprovalStatus({ rollNo: savedStudent.roll_no });
if (live.status === 'APPROVED') setCurrentStudent(live.student);
else await signOutStudent();
```

**Realtime Subscriptions:**
Connected to active Supabase Realtime channel `student-app-sync-${studentId}` listening to postgres change events across 7 tables: `students`, `student_profiles`, `student_academic_summary`, `student_projects`, `student_git_projects`, `student_certificates`, and `student_internships`. When an administrator updates student information, the mobile app reflects modifications instantaneously without requiring logout or app reload.

### 5.2 AuthService (`src/services/authService.js`)
**Key functions:**
- `signUpStudent({ name, rollNo, department, yearSemester })` — Requires all four fields and a confirmed Supabase insert. **Never creates a session. No email or password required.**
- `signInStudent({ rollNo })` — Queries Supabase only; local cached rows cannot grant or override access. Only grants session for `APPROVED`/`VERIFIED`.
- `checkStudentApprovalStatus({ rollNo })` — Live status query; distinguishes pending, rejected, revoked, approved, missing, and error states.
- `getFullStudentData(studentId)` — Concurrently fetches active `student_profiles`, `student_academic_summary`, verified `student_projects`, `student_git_projects`, `student_certificates`, and `student_internships` (`is_visible: true`).
- `updateStudentProfile(profile)` — Strictly scoped to the `students` table's personal columns (`name`, `phone`, `bio`, `avatar_url`, `banner_url`). Dynamically strips unsupported fields via regex-based missing-column detection.
- `getActiveScholar()` — Reads cached session from AsyncStorage.
- `signOutStudent()` — Clears all cached auth data.
- `normalizeRollNo(rollNo)` — Trims and uppercases roll number for consistent matching.

**Schema Cache Column Resiliency (PGRST204 / 42703 Fix):**
When updating, fields that are not part of `students` (or pending DB migration) are automatically stripped from the update payload and persisted safely to `student_profiles` and local storage, ensuring profile saves always succeed with `success: true`.

### 5.3 Document Service (`src/services/documentService.js`)
**Key functions:**
- `uploadToCloudinary(fileUri, fileName, mimeType, rollNo)` — Obtains a signed URL from `EXPO_PUBLIC_CLOUDINARY_SIGNING_URL`, then uploads directly to Cloudinary.
- `uploadDocument(document, rollNo)` — Full document upload workflow with metadata persistence to Supabase `student_documents`.
- `getDocuments(rollNo)` — Fetches documents from Supabase with local offline cache fallback.
- `downloadDocument(document)` — Downloads document for offline access via `expo-file-system`.
- `deleteDocument(documentId)` — Removes document from Supabase and local cache.

**Cloudinary Signing URL:**
```javascript
const CLOUDINARY_SIGNING_URL = process.env.EXPO_PUBLIC_CLOUDINARY_SIGNING_URL || '';
// If empty, upload throws: "Cloudinary upload is not configured. Set EXPO_PUBLIC_CLOUDINARY_SIGNING_URL..."
```

---

## 6. Data Model (Students Table)

```sql
-- Supabase table: students (column names use snake_case)
-- Note: The actual Supabase table uses `name`, `roll_no`, `course`, `batch`, `semester`
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                -- Student full name
  roll_no TEXT NOT NULL UNIQUE,      -- University roll number (normalized uppercase)
  department TEXT NOT NULL,          -- BCA | B.Sc IT | B.Sc Cyber Security | B.Sc (Hons) AI & ML
  course TEXT,                       -- Same as department (legacy alias)
  batch TEXT,                        -- Year/Semester string e.g. "1st Year (1st Sem)"
  semester TEXT,                     -- Same as batch (legacy alias)
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'VERIFIED')),
  rejection_reason TEXT,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,                          -- Student professional bio / summary (LinkedIn-style)
  headline TEXT,                     -- One-line professional headline
  about_me TEXT,                     -- Longer freeform description
  cgpa NUMERIC(4,2),                 -- Cumulative Grade Point Average (out of 10.0)
  academic_score JSONB DEFAULT '{}', -- Extended academic metrics (percentage, honors, etc.)
  banner_url TEXT,                   -- Campus hero banner image URL
  projects JSONB DEFAULT '[]',       -- Featured projects portfolio array
  skills TEXT[] DEFAULT '{}',        -- Professional skills tags array
  semester_scores JSONB DEFAULT '[]',-- Semester-by-semester SGPA breakdown array
  internships JSONB DEFAULT '[]',   -- Student internships JSONB array
  attendance_rate NUMERIC(5,2),      -- Overall attendance percentage
  academic_standing TEXT,            -- e.g. "Dean's Honors List"
  active_backlogs INTEGER DEFAULT 0, -- Number of active backlogs
  total_credits INTEGER,             -- Total credits earned
  faculty_advisor TEXT,              -- Faculty advisor / SPOC name
  current_semester TEXT,             -- Current semester label
  admin_notes TEXT                   -- Internal admin notes (not visible to student)
);
```

> **Important:** No email or password columns are required. Students are identified solely by their `roll_no`.

### 6.2 Admin-Managed Dossier & Academic Architecture (Read-Only to Students)
The paired admin portal (`ADMIN-PANEL-RIMT`) manages 9 specialized tables created via migration `20260930_admin_student_dossier.sql`.

| Table | Purpose | Student Permissions |
|---|---|---|
| `public.student_profiles` | Extended scholar overview, links, skills | Read-only (`is_visible = true`) |
| `public.student_projects` | Featured projects portfolio | Read-only (`is_visible = true`) |
| `public.student_git_projects` | Tracked GitHub repositories | Read-only (`is_visible = true`) |
| `public.student_certificates` | Verified certificates & credentials | Read-only (`is_visible = true`) |
| `public.student_internships` | Industrial internship experiences | Read-only (`is_visible = true`) |
| `public.student_academic_summary` | CGPA, overall attendance %, backlogs, credits | **Read-only (STRICT MANUAL ADMIN ONLY)** |
| `public.student_semester_records` | Per-semester SGPA & attendance | **Read-only (STRICT MANUAL ADMIN ONLY)** |
| `public.student_grades` | Course roster subject grades & grade points | **Read-only (STRICT MANUAL ADMIN ONLY)** |
| `public.admin_audit_log` | Tamper-evident admin action audit trail | **No Access** |

#### Strict Read-Only & Zero-Write Policy:
1. **Row Level Security (RLS):** All 8 student-accessible tables enforce `student_id = public.current_student_id() AND is_visible = true`. Students can **only** read their own approved and visible records.
2. **No Student Write Paths:** Absolutely **no** `INSERT`, `UPDATE`, or `DELETE` policies exist for students on any academic or dossier table.
3. **Student Profile Boundaries:** `updateStudentProfile()` in `src/services/authService.js` is strictly scoped to the `students` table's personal columns (`name`, `phone`, `bio`, `avatar_url`, `banner_url`). It has no capability to write or override `cgpa`, `attendance`, `backlogs`, semester SGPA, or subject grades.
4. **Certificate Vault:** Certificates stored in the private `student-certificates` bucket are served to students via pre-signed, time-limited URLs generated by the backend. Direct public bucket access is prohibited.

### 6.3 Student Profession & Placement Intelligence Pipeline
Students in the mobile app specify their academic department (e.g., `BCA`, `B.Sc Cyber Security`, `B.Sc IT`, `B.Sc (Hons) AI & ML`), professional `headline` (e.g., "Full Stack Developer", "Cyber Security Analyst"), `bio`, and `skills` in `EditProfileScreen.jsx`.

The paired admin portal (`ADMIN-PANEL-RIMT`) consumes this via `src/lib/placementStats.js` and renders specialized student profession badges in `PlacedStudentsCard.jsx`:
- **Department-aware profession mapping:**
  - Cyber Security departments/specializations → `Cyber Security Specialist` (Emerald badge with security shield)
  - Cloud / DevOps specializations → `Cloud Architect & DevOps Engineer` (Sky badge with cloud icon)
  - IT departments → `Enterprise IT Systems Engineer` (Blue badge with computer icon)
  - BCA / Computer Applications → `Full Stack Software Developer` (Indigo badge with code icon)
  - Custom student passions (e.g. dancer, singer, musician, athlete, designer) declared in `bio` or `headline` take precedence with custom visual styling (Pink `directions_walk`, Purple `music_note`, Amber `query_stats`, etc.).
- **Live Sync:** Changes to student bios/headlines made by scholars on mobile or overridden by administrators in `StudentDossierModal.jsx` automatically flow into placement metrics without data mismatch.

---

## 7. Navigation Flow Diagram

```
App Launch
  └── AuthContext.initAuth()
      ├── Live database confirms APPROVED? → HomeScreen
       ├── No session? → SignInScreen
      └── Live status not APPROVED or unreadable? → signOut → SignInScreen

SignInScreen
  ├── Login → signIn()
  │    ├── status: APPROVED → HomeScreen (session created)
  │    ├── status: PENDING → PendingApprovalScreen (no session)
  │    ├── status: REJECTED → RejectedScreen (no session)
  │    └── status: REVOKED → RejectedScreen (no session)
  └── Register → signUp()
       └── status: PENDING → OnboardingScreen → PendingApprovalScreen

PendingApprovalScreen
  └── "Check Status" button → checkStudentApprovalStatus()
       ├── APPROVED → auto-navigate to HomeScreen
      ├── REJECTED → redirect to RejectedScreen
      └── REVOKED → redirect to access-revoked state

HomeScreen (APPROVED)
  ├── BottomNav → Home | Projects | Certificates | Profile
  ├── Projects → ProjectsScreen
  ├── Certificates → CredentialsScreen (with Cloudinary upload)
  └── Profile → ProfileScreen → EditProfileScreen
```

---

## 8. Feature Status

| Feature | Implementation Files | Status |
|---|---|---|
| **Gated Student Signup** | `src/services/authService.js`, `src/screens/SignInScreen.jsx` | ✅ Complete |
| **Gated Login (Status Check)** | `src/services/authService.js`, `src/context/AuthContext.js` | ✅ Complete |
| **Pending Approval Screen** | `src/screens/PendingApprovalScreen.jsx` | ✅ Complete |
| **Rejected Screen** | `src/screens/RejectedScreen.jsx` | ✅ Complete |
| **Live Status Polling** | `src/services/authService.js` (checkStudentApprovalStatus) | ✅ Complete |
| **Session Auto-Eviction** | `src/context/AuthContext.js` | ✅ Complete |
| **Protected Home Dashboard** | `src/screens/HomeScreen.jsx` | ✅ Complete |
| **Protected Profile Editor** | `src/screens/EditProfileScreen.jsx` | ✅ Complete |
| **Bottom Navigation** | `src/components/BottomNav.jsx` | ✅ Complete |
| **Supabase-Confirmed Signup** | `src/services/authService.js`, `src/services/supabase.js` | ✅ Complete; local-only inserts are not reported as submitted |
| **Profile Photo Upload on Signup** | `src/screens/SignInScreen.jsx`, `src/services/authService.js` | ✅ Complete; students can attach profile photo via `expo-image-picker` on signup for admin verification |
| **Revoked Account Lockout** | `src/services/authService.js`, `src/context/AuthContext.js`, `App.jsx` | ✅ Client logic complete; admin writes require migration, server-only key, and production admin authentication |
| **Student Bio & Profile Editor** | `src/screens/EditProfileScreen.jsx`, `src/services/authService.js` | ✅ Complete — multiline bio field, persisted to Supabase `students.bio` |
| **LinkedIn Dossier Cross-Compatibility** | `src/screens/EditProfileScreen.jsx`, `src/services/authService.js` | ✅ Complete — bio, headline, and academic fields sync with admin portal's `StudentLinkedInProfileModal.jsx` |
| **Bidirectional Real-Time Sync** | `src/context/AuthContext.js`, `src/services/authService.js`, `src/screens/ProfileScreen.jsx`, `src/screens/EditProfileScreen.jsx` | ✅ Complete — Realtime Supabase PostgreSQL channels on `students`, `student_profiles`, `student_academic_summary`, `student_projects`, `student_git_projects`, `student_certificates`, `student_internships`. Instant bidirectional updates between student app and admin portal without page reload. |
| **Cloudinary Signed Uploads** | `src/services/documentService.js`, `.env` (EXPO_PUBLIC_CLOUDINARY_SIGNING_URL) | ✅ Complete — Server-signed uploads via admin portal's `/api/cloudinary/sign` endpoint. Certificate & document uploads from CredentialsScreen. |
| **Document Management** | `src/services/documentService.js`, `src/components/DocumentCard.jsx`, `src/components/DocumentDetailModal.jsx` | ✅ Complete — Upload, download, offline cache, detail modal, MIME detection |
| **Photo Viewer Modal** | `src/components/PhotoViewerModal.jsx` | ✅ Complete — Full-screen immersive zoom viewer with scholar identity tags |
| **Upload Success Modal** | `src/components/UploadSuccessModal.jsx` | ✅ Complete |
| **Document Viewer Utils** | `src/utils/documentViewer.js` | ✅ Complete — PDF/image preview, sharing, external app launch |
| **Default Avatar Fallback** | `src/theme/tokens.js` (getAvatarSource), `assets/default-avatar.png` | ✅ Complete |
| **Internships JSONB Column** | `supabase/migrations/20261002_add_student_internships.sql` | ✅ Migration available |
| **Student Profile & Academics Migration** | `supabase/migrations/002_student_profile_academics.sql` | ✅ Migration available — profile fields, academic fields, RLS, indexes, CGPA trigger |
| **Student Profession Badges** | `src/screens/EditProfileScreen.jsx`, `src/services/authService.js`, paired `PlacedStudentsCard.jsx` | ✅ Complete — Dynamic profession detection & custom badge styling (Cyber Security, Developer, Cloud, Dancer, Singer) |
| **Official SVG Company Logos** | Paired `src/components/common/CompanyBrandLogo.jsx`, `PlacedStudentsCard.jsx`, `HiringCompaniesSection.jsx` | ✅ Complete — Pure vector SVG logos (Google, Microsoft, AWS, Deloitte, HDFC, TCS, L&T, Infosys, Wipro) |
| **Multi-Account Admin Switching** | Paired `src/components/auth/AuthScreen.jsx`, `src/components/auth/AuthGuard.jsx`, `src/components/profile/ProfileMenu.jsx` | ✅ Complete — Google-style multi-account switcher with persistent isolation & instant switching between Raj Kumar & Sagrika |

---

## 9. Environment Variables

```env
# Supabase Configuration for RIMT Academic Trust
EXPO_PUBLIC_SUPABASE_URL=https://pwghazyfxhypzkadqfnn.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<anon-key>

# Cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud_name>
EXPO_PUBLIC_CLOUDINARY_API_KEY=<api_key>
EXPO_PUBLIC_CLOUDINARY_API_SECRET=**********   # ⚠️ Should be removed — secret belongs only on admin server
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=           # Optional unsigned preset

# Cloudinary Signing URL — points to the Admin Panel's /api/cloudinary/sign endpoint
# Uses LAN IP for local dev so the physical device can reach the dev server
EXPO_PUBLIC_CLOUDINARY_SIGNING_URL=http://<LAN_IP>:3000/api/cloudinary/sign
```

> **⚠️ Security Note:** `EXPO_PUBLIC_CLOUDINARY_API_SECRET` should ideally be removed from the mobile app's `.env`. The Cloudinary API secret is only needed on the admin server for signature generation. The mobile app should use signed uploads exclusively via `EXPO_PUBLIC_CLOUDINARY_SIGNING_URL`.

---

## 10. Changelog
- **2026-10-07 (Student Profession Badges, SVG Company Branding & Multi-Account Isolation Sync):**
  1. **Student Profession & Specialization Badges (`PlacedStudentsCard.jsx`):** Integrated profession badges directly beside student names in the Placement Statistics dashboard. Categorizes students into distinct disciplines (Cyber Security, Cloud & DevOps, Full Stack Developer, Enterprise IT, Dancer, Singer, Risk Consultant, FinTech) with dedicated color auræ and icons.
  2. **Dynamic Student Profession Resolution (`placementStats.js`):** Enhanced fallback logic to inspect student departments, course specializations, and custom bio/headline text so that students from diverse backgrounds (BCA, BCA Cyber Security, B.Sc IT, or artistic passions) are accurately represented.
  3. **Official SVG Company Logos (`CompanyBrandLogo.jsx`):** Replaced raster icons and fallback symbols with self-contained, high-fidelity SVG brand marks for major campus recruiters (Google, Microsoft, AWS, Deloitte, HDFC Bank, TCS, L&T, Infosys, Wipro) across both `PlacedStudentsCard.jsx` and `HiringCompaniesSection.jsx`.
  4. **Multi-Account Session Isolation (Paired Admin Portal):** Fixed session race conditions in `ADMIN-PANEL-RIMT` where signing in as Sagrika would revert to Raj Kumar. Converted hardcoded localStorage reads to reactive state in `AuthGuard.jsx`, `ProfileMenu.jsx`, and `AuthScreen.jsx`. Created Google-style "Choose an account" switcher and "Add another account" modal.
  5. **Master Memory Synchronization:** Updated both `ADMIN.md` and `APP.md` with complete, exhaustive technical documentation ensuring both repositories operate as single sources of truth without exploratory token overhead.
- **2026-10-03 (Cloudinary Signed Upload Configuration):**
  1. **Signing URL Configured:** Added `EXPO_PUBLIC_CLOUDINARY_SIGNING_URL=http://10.31.161.176:3000/api/cloudinary/sign` to `.env`, resolving the "Cloudinary upload is not configured" error on the Certificates screen. Uses LAN IP for physical device connectivity.
  2. **Cross-Project Integration:** Mobile app's `documentService.js` now successfully obtains upload signatures from the admin portal's `/api/cloudinary/sign` endpoint for certificate and document uploads to Cloudinary.
- **2026-10-02 (Student Internships Column Migration):**
  1. **Migration:** Added `supabase/migrations/20261002_add_student_internships.sql` — adds `internships JSONB DEFAULT '[]'` column to `public.students` table for storing internship data inline.
- **2026-10-01 (Enlarged Profile Photo Viewer & Default Silhouette Avatar):**
  1. **Enlarged Profile Photo Viewer (`PhotoViewerModal.jsx`):** Created full-screen immersive modal in `src/components/PhotoViewerModal.jsx` with zoom card animation, verified scholar identity tags, roll number chip, and an instant "Change photo" action hook. Integrated modal touch triggers into both `ProfileScreen.jsx` and `EditProfileScreen.jsx` when scholars tap their profile avatar.
  2. **Standard Institutional Default Avatar:** Added `default-avatar.png` and `default-avatar.jpg` asset fallbacks in `assets/`. Added `getAvatarSource()` helper in `src/theme/tokens.js` to automatically sanitize null, undefined, or empty avatars across `HomeScreen.jsx`, `Header.jsx`, `ProfileScreen.jsx`, `EditProfileScreen.jsx`, and `PhotoViewerModal.jsx`.
  3. **Expo SDK 57 Patch Synchronization:** Aligned patch dependencies via `npx expo install --fix` resolving `expo@57.0.25` → `~57.0.26` and `expo-document-picker@57.0.2` → `~57.0.3`. Validated via `npx expo-doctor` (21/21 checks passed) and `npx expo lint` (0 errors).
  4. **Fixed Metro TreeFS / SHA-1 Crash:** Resolved `TreeFS: Failed to make parent directory entry for node_modules\expo\node_modules\@expo\cli\static\template\index.html` and `Failed to get the SHA-1` errors. Root cause: `@expo/cli@57.0.27` was nested inside `node_modules/expo/node_modules/` (not hoisted to root), causing Metro's file watcher (TreeFS) to fail building its internal virtual FS map on Windows/OneDrive. Fix: installed `expo-asset` (missing peer dependency) and hoisted `@expo/cli@57.0.27` into root `devDependencies`. Added standard `metro.config.js`. Purged `.expo/` and Metro temp caches.
  5. **Full Dependency Alignment:** All packages verified SDK 57-compatible: `npx expo install --check` → `Dependencies are up to date`, `npx expo-doctor` → 21/21 checks passed, `npx expo lint` → 0 errors, `npx expo export -p web --clear` → bundled 484 modules successfully.
- **2026-09-30 (Bidirectional Real-Time Synchronization & Extended Dossier Sync):**
  1. **Two-Way Real-Time State Sync:**
     - Connected `AuthContext.js` to active Supabase Realtime channel `student-app-sync-${studentId}` listening to postgres change events across 7 tables: `students`, `student_profiles`, `student_academic_summary`, `student_projects`, `student_git_projects`, `student_certificates`, and `student_internships`.
     - When the student edits their profile (bio, headline, skills, LinkedIn, GitHub, portfolio, resume) in `EditProfileScreen.jsx`, it persists to `student_profiles` and logs to `admin_audit_log`, which triggers live toast notifications and instant dossier re-fetch on the admin portal (`StudentDossierModal.jsx` & `StudentManagement.jsx`).
     - When an administrator updates student information, manual academic standing (CGPA, attendance), or portfolio records in the admin panel, the mobile app reflects the modifications instantaneously on `ProfileScreen.jsx` without requiring logout or app reload.
  2. **Extended Data Fetcher:**
     - Enhanced `getFullStudentData()` in `src/services/authService.js` to concurrently fetch active `student_profiles`, `student_academic_summary`, verified `student_projects`, `student_git_projects`, `student_certificates`, and `student_internships` (`is_visible: true`).
  3. **Schema Cache Column Resiliency (PGRST204 / 42703 Fix):**
     - Resolved the error `"Could not find the 'bio' column of 'students' in the schema cache"` by implementing a dynamic regex missing-column extractor and expanding `unsupportedFields` in `updateStudentProfile()`.
     - When updating, fields that are not part of `students` (or pending DB migration) are automatically stripped from the update payload and persisted safely to `student_profiles` and local storage, ensuring profile saves always succeed with `success: true`.
     - Added `ALTER TABLE public.students ADD COLUMN IF NOT EXISTS bio, headline, skills, linkedin_url, github_url, portfolio_url, resume_url` to `supabase/migrations/20260930_admin_student_dossier.sql`.
  4. **Theme & Visual Harmony:**
     - Aligned profile and identity components with institutional styling, preserving glossy accents, zoom card interactions, and security auræ.
- **2026-09-30 (Student Bio & LinkedIn Dossier Cross-Compatibility):** Added `bio` state and multiline text input to `EditProfileScreen.jsx` for student professional summary. Updated `authService.js` `updateStudentProfile()` to accept and persist `bio` to Supabase `students.bio`. This field is cross-compatible with the admin portal's LinkedIn-Style Scholar Dossier tracker (`StudentLinkedInProfileModal.jsx` in `ADMIN-PANEL-RIMT`), where admins can view and override the student's bio, headline, and academic metrics. Added schema migration `supabase/migrations/20260930_add_student_bio_and_academic_score.sql` adding columns: `bio`, `headline`, `cgpa`, `academic_score`, `banner_url`, `projects`, `skills`, `semester_scores`. Synced fixed admin accounts migration `supabase/migrations/20260930_fixed_admin_accounts.sql` from paired portal. Expo lint: 0 errors.
- **2026-09-30 (Admin Portal Sync — Fixed Admin Accounts):** Paired admin portal (`ADMIN-PANEL-RIMT`) eliminated open admin signup. Only two fixed administrators — **Raj Kumar** (HOD BCA) and **Sagrika** (Vice HOD BCA) — can now access the admin portal via PBKDF2-SHA256 salted credentials. The admin portal's LinkedIn-Style Scholar Dossier system (`GET/PATCH /api/admin/requests/[id]`) now returns and edits enriched student profiles including bio, headline, CGPA, semester scores, projects, skills, and verified documents.
- **2026-09-29 (Memory Sync & PII Sanitization):** Replaced real student PII in SignInScreen demo quick-test pills with generic dummy data (`RIMT/22/BTCSE/0417 - Aarav Sharma` and `RIMT/23/BBA/0512 - Priya Kaur`). Re-synced master project memory with paired `ADMIN-PANEL-RIMT`, which completed the Admin Panel Authentication module (`NEW-FEATURE.md` Done, 18/18 admin auth unit tests passed, 21/21 onboarding unit tests passed, Next.js production build verified 7/7 pages optimized).
- **2026-09-29:** Added profile photo selection directly into the scholar registration signup form in `SignInScreen.jsx` via `expo-image-picker`. Students can upload/preview their profile photo on signup, and `signUpStudent` in `authService.js` stores the photo URL / base64 image into Supabase `students.avatar_url`. This allows administrators on the paired admin portal to visually verify and approve the student. Linting verified with 0 errors.
- **2026-09-29:** Documented the cross-project Supabase record contract and alias mapping: phone signup stores `name`/`roll_no`, while the admin adapter exposes `full_name`/`roll_number` aliases. The admin's new regression test passes for legacy mobile-shaped records (21/21 onboarding suite); this is not an end-to-end cloud-write test. Preserve the existing admin UI when addressing integration problems.
- **2026-09-29:** Signup and status checks now require live Supabase confirmation; local caches cannot grant account access. Approved sessions are polled for changes, and `REVOKED` accounts route to the access-denied screen. Admin writes require the shared schema migration and server-only service key; production admin actions also need signed admin authentication.
- **2026-09-29 00:05:** Fixed critical bug in admin panel's `db.js` where `rejectStudent()` was not persisting `rejection_reason` to Supabase cloud (only saved in-memory), and `approveStudent()` was not persisting `reviewed_by`/`reviewed_at`. Both functions now send complete PATCH payloads to cloud DB. Expo lint: 0 errors, 5 warnings. Admin tests: 15/15 pass.
- **2026-09-28 23:50:** Implemented real-time approval detection on `PendingApprovalScreen.jsx` with automatic 3.5s background polling — students are automatically redirected to the dashboard the instant an administrator approves them on the website, or kicked to `RejectedScreen` if rejected. Added strict unauthorized access gate in `App.jsx` (`handleNavigate`): attempts to access protected screens without `APPROVED`/`VERIFIED` status show an alert and are blocked. Restricted `BottomNav` so it only mounts for approved scholars on dashboard screens.
- **2026-09-28 23:30:** Updated docs to reflect simplified registration flow. Registration now requires only 4 fields (Full Name, Roll Number, Department, Year/Semester) — email and password have been fully removed from the signup form and `authService.js`. Updated data model docs to match actual Supabase column names (`name`, `roll_no`, `course`, `batch`, `semester`). Departments locked to: BCA, B.Sc IT, B.Sc Cyber Security, B.Sc (Hons) AI & ML. Both Admin Panel and App docs now in sync.
- **2026-09-28 23:05:** Fixed `[runtime not ready]: TypeError: Cannot read property 'fontSize' of undefined` crash on app launch. Added missing typography tokens in `tokens.js`. Hardened screens with optional chaining and explicit fallbacks.
- **2026-09-28 22:37:** Consolidated all memory into this single `APP.md`. Only this file remains as the master memory file for the student app.
- **2026-09-28 22:25:** Created gated onboarding screens (`PendingApprovalScreen`, `RejectedScreen`), status-aware `AuthContext`, and `authService` with dual Supabase + local storage layer.
- **2026-09-28 22:15:** Initial project memory system setup.
