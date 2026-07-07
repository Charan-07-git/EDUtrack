# EDUTrack - Complete Code Walkthrough for BE Minor Project Presentation

---

## 1. PROJECT ARCHITECTURE

### Folder Structure

```
edutrack/
├── frontend/                          # Next.js 14 React Application
│   ├── src/
│   │   ├── app/                       # App Router pages
│   │   │   ├── layout.tsx             # Root layout (providers, dark mode)
│   │   │   ├── login/page.tsx         # Login & Signup
│   │   │   ├── settings/page.tsx      # User settings
│   │   │   ├── student/               # All student pages
│   │   │   │   ├── page.tsx           # Legacy redirect
│   │   │   │   ├── dashboard/page.tsx # Student dashboard
│   │   │   │   ├── overview/page.tsx  # Attendance overview + heatmap
│   │   │   │   ├── today/page.tsx     # Today's classes
│   │   │   │   ├── timetable/page.tsx # Weekly timetable
│   │   │   │   ├── gamification/page.tsx # Leaderboard
│   │   │   │   ├── goals/page.tsx     # Attendance goals tracker
│   │   │   │   ├── announcements/page.tsx # View announcements
│   │   │   │   ├── scan/[id]/page.tsx # QR scanner
│   │   │   │   ├── subject-attendance/page.tsx # Per-subject attendance
│   │   │   │   ├── subject/[id]/page.tsx # Individual subject details
│   │   │   │   ├── calendar/page.tsx  # Monthly calendar heatmap
│   │   │   │   └── setup/page.tsx     # Initial academic setup
│   │   │   └── teacher/               # All teacher pages
│   │   │       ├── page.tsx           # Legacy redirect
│   │   │       ├── dashboard/page.tsx # Teacher dashboard
│   │   │       ├── today/page.tsx     # Today's classes list
│   │   │       ├── session/[id]/page.tsx # Session control room
│   │   │       ├── qr/[id]/page.tsx   # QR display for students
│   │   │       ├── announcements/page.tsx # Create/manage announcements
│   │   │       ├── session-archive/page.tsx # Past sessions
│   │   │       ├── low-attendance/page.tsx # Students below 75%
│   │   │       ├── student-report/[classId]/page.tsx # Per-class reports
│   │   │       ├── bulk-attendance/[id]/page.tsx # Bulk mark attendance
│   │   │       ├── subjects/page.tsx  # Subject management
│   │   │       ├── timetable/page.tsx # Master timetable view
│   │   │       ├── schedule/page.tsx  # Schedule input editor
│   │   │       ├── clear-attendance/page.tsx # Delete attendance data
│   │   │       ├── analytics/page.tsx # Quick analysis charts
│   │   │       └── setup/page.tsx     # Initial redirect
│   │   ├── components/                # Shared React components
│   │   │   ├── Shell.tsx             # Main layout wrapper
│   │   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   │   ├── BackButton.tsx        # Reusable back button
│   │   │   └── Charts.tsx            # Chart.js wrapper components
│   │   ├── context/                   # React Context providers
│   │   │   ├── AuthContext.tsx        # Authentication state
│   │   │   └── DarkModeContext.tsx    # Dark/light theme state
│   │   └── lib/                       # Utility libraries
│   │       ├── api.ts                # HTTP client for backend
│   │       └── auth.ts               # Token/user helpers
│   ├── package.json                   # Dependencies
│   ├── tailwind.config.ts             # Tailwind configuration
│   └── next.config.mjs                # Next.js configuration
│
├── backend/                           # Express.js API Server
│   ├── src/
│   │   ├── server.js                  # Entry point - Express + Socket.IO
│   │   ├── db.js                      # Prisma client initialization
│   │   ├── middleware/
│   │   │   └── auth.js                # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.routes.js         # Signup, login, photo upload
│   │   │   ├── data.routes.js         # Users, dashboard, classes, reports
│   │   │   ├── session.routes.js      # Sessions, QR, attendance marking
│   │   │   ├── announcement.routes.js # Announcements CRUD
│   │   │   ├── notification.routes.js # Notifications list/read
│   │   │   ├── attendance.routes.js   # Clear attendance
│   │   │   └── timetable.routes.js    # Timetable data operations
│   │   └── services/
│   │       ├── qr.js                  # QR code generation service
│   │       └── geo.js                 # Distance calculation service
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema definition
│   │   └── timetable-data.json       # Master timetable data
│   └── package.json
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js on Vercel)                                       │
│                                                                     │
│  Browser → React Component → api.ts → fetch() → Backend API         │
│                                                                     │
│  Socket.IO Client ← real-time events ← Socket.IO Server             │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND (Express.js on Render)                                     │
│                                                                     │
│  Route Handler → Middleware (auth) → Prisma Query → Supabase/MySQL  │
│                                                                     │
│  Socket.IO Server ←→ Teacher & Student browsers (real-time)         │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ TCP
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DATABASE (Supabase PostgreSQL)                                     │
│                                                                     │
│  Tables: User, Class, Session, Attendance, Timetable,               │
│          Announcement, Notification                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Flow explanation:**
1. User opens browser → Next.js serves the React page
2. React component calls `api('/api/...')` → `lib/api.ts` prepends backend URL and JWT token → `fetch()` sends HTTP request
3. Backend receives request → `auth` middleware verifies JWT → route handler executes
4. Route handler uses Prisma ORM → Prisma generates SQL → queries Supabase PostgreSQL
5. Response flows back: Database → Prisma → Route handler → JSON → fetch() → React setState → UI updates
6. For real-time: Socket.IO maintains persistent connection for live attendance count updates

---

## 2. IMPORTANT FILES (Frontend)

### `lib/api.ts`
- **Purpose**: Centralized HTTP client for all backend API calls
- **Why needed**: Every page needs to communicate with the backend. Instead of writing fetch() everywhere, this file provides a reusable `api()` function that:
  - Automatically prepends the correct backend URL (`localhost:4000` in dev, `edutrack-7yt9.onrender.com` in production)
  - Automatically attaches JWT token from localStorage as `Authorization: Bearer <token>`
  - Parses JSON responses
  - Throws errors with meaningful messages
- **When**: Imported by every page/component that calls the backend
- **Used by**: All 30+ pages, Shell.tsx, Sidebar.tsx
- **Key function**:
  ```ts
  export async function api(path: string, opts: any = {}) {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Request failed");
    }
    return res.json();
  }
  ```

### `lib/auth.ts`
- **Purpose**: Client-side authentication helpers
- **Why needed**: Provides `getToken()`, `getUser()`, `isAuthenticated()` for auth guards on pages
- **Used by**: `student/page.tsx`, `teacher/page.tsx` (legacy auth guard pages)

### `context/AuthContext.tsx`
- **Purpose**: Global authentication state management
- **Why needed**: All pages need to know if the user is logged in, their role, name, etc. Without a Context, every page would have to fetch `/api/me` independently.
- **Execution**: 
  1. App loads → `useEffect` checks localStorage for `edutrack_token`
  2. If token exists → calls `/api/me` → sets user state
  3. If token expired → catches error → clears localStorage
- **Provided values**: `{ user, login, signup, refreshUser, logout }`
- **Used by**: Every page via `useAuth()` hook

### `context/DarkModeContext.tsx`
- **Purpose**: Manages dark/light theme toggle
- **Why needed**: Theme preference must persist across page reloads
- **Implementation**: Saves to `localStorage.getItem('edutrack_dark')`, toggles `class="dark"` on `<html>` element
- **Used by**: Shell.tsx, Sidebar.tsx

### `components/Shell.tsx`
- **Purpose**: Main layout wrapper for all authenticated pages
- **Why needed**: Provides consistent layout (sidebar, header, notifications, dark mode toggle) without repeating code
- **Behavior**:
  - Renders `<Sidebar role={role} />`
  - Manages notification dropdown (fetches unread count every 30s)
  - Has dark mode toggle button
  - Shows notification bell with badge count
  - Handles "mark all read" and individual notification read
- **Used by**: Every student and teacher page (wraps page content)

### `components/Sidebar.tsx`
- **Purpose**: Navigation sidebar with role-based menu items
- **Why needed**: Provides navigation across all pages
- **Features**:
  - Teacher menu: Today's Classes, Analytics, Timetable, Announcements, Session Archive, Low Attendance, Schedule, Subjects, Clear Attendance
  - Student menu: Overview, Today's Classes, Timetable, Leaderboard, Goals
  - Photo upload modal (compress, upload via `api/auth/upload-photo`)
  - Teacher semester filter
  - Dark mode toggle, logout

### `components/BackButton.tsx`
- **Purpose**: Reusable back navigation button
- **Why needed**: Consistent "go back" UX across all pages
- **Props**: `href` (optional - navigates to specific route) or `label` (optional - custom text)

### `app/layout.tsx`
- **Purpose**: Root layout wrapping the entire application
- **Why needed**: Initializes global providers (DarkMode, Auth) in correct order
- **Structure**: `<html>` → `<DarkModeProvider>` → `<AuthProvider>` → `{children}`

---

## 3. IMPORTANT FUNCTIONS

### `api()` - `lib/api.ts`
- **Params**: `path: string`, `opts: object`
- **Returns**: Parsed JSON response
- **Purpose**: Makes authenticated HTTP requests to the backend
- **Execution Flow**:
  1. Gets backend URL from `API` constant (auto-detects localhost vs production)
  2. Gets JWT token from localStorage
  3. Calls `fetch()` with Authorization header
  4. If response not OK → parses error JSON → throws Error
  5. Returns JSON data

### `login()` - `context/AuthContext.tsx`
- **Params**: `email: string`, `password: string`, `role: string`
- **Returns**: nothing (redirects on success)
- **Purpose**: Authenticates user and stores JWT
- **Execution Flow**:
  1. Calls `POST /api/auth/login` with email, password, role
  2. Saves `d.token` to `localStorage.setItem('edutrack_token')`
  3. Saves `d.user` to `localStorage.setItem('edutrack_user')`
  4. Sets React state `setUser(d.user)`
  5. Checks if user needs academic setup → redirects to setup or dashboard

### `signup()` - `context/AuthContext.tsx`
- **Params**: `f: object` (name, email/password, role, etc.)
- **Returns**: nothing (redirects on success)
- **Purpose**: Creates new user account
- **Execution Flow**:
  1. Calls `POST /api/auth/signup` with user data
  2. Same flow as login() - saves token, user, redirects

### `refreshUser()` - `context/AuthContext.tsx`
- **Params**: none
- **Returns**: user object or null
- **Purpose**: Re-fetches current user data from backend
- **Execution Flow**:
  1. Calls `GET /api/me`
  2. Updates React state `setUser(u)`
  3. Updates localStorage
  4. Used after profile changes (photo, name, department)

### `startSession()` - `teacher/session/[id]/page.tsx`
- **Params**: none (uses `id` from URL)
- **Returns**: nothing
- **Purpose**: Creates a new session for a class
- **Execution Flow**:
  1. Calls `POST /api/sessions/{classId}/start`
  2. Sets session state with returned data
  3. UI updates to show "Live" status

### `generateQR()` - `teacher/session/[id]/page.tsx`
- **Params**: none
- **Returns**: nothing
- **Purpose**: Generates QR code for student attendance
- **Execution Flow**:
  1. Gets teacher's GPS location via `navigator.geolocation.getCurrentPosition()`
  2. Calls `POST /api/sessions/{sessionId}/qr` with lat/lng
  3. Receives QR data URL from server
  4. Sets countdown timer (5 minutes)
  5. QR becomes visible on teacher's screen for students to scan

### `finishSession()` - `teacher/session/[id]/page.tsx`
- **Params**: none
- **Returns**: nothing
- **Purpose**: Ends the active session
- **Execution Flow**:
  1. Calls `POST /api/sessions/{sessionId}/end`
  2. Clears QR display
  3. Updates status to "ENDED"

### `onQrScanned()` - `student/scan/[id]/page.tsx`
- **Params**: `decoded: string` (QR code data)
- **Returns**: nothing
- **Purpose**: Processes scanned QR code
- **Execution Flow**:
  1. Parses QR payload (sessionId + token)
  2. Validates session ID matches URL param
  3. Advances to photo capture step
  4. Gets student's GPS location
  5. Marks attendance via `POST /api/sessions/mark`
  6. Shows success/failure

### `compressImage()` - `Sidebar.tsx` and `settings/page.tsx`
- **Params**: `dataUrl: string`, `maxW: number` (default 400), `quality: number` (default 0.7)
- **Returns**: Promise<string> (compressed JPEG data URL)
- **Purpose**: Reduces image size before upload to save bandwidth
- **Execution Flow**:
  1. Creates `new Image()` element
  2. Sets `img.src = dataUrl`
  3. On load: draws image on canvas at reduced dimensions
  4. Calls `canvas.toDataURL('image/jpeg', quality)`
  5. Returns compressed data URL

### `handlePhotoUpload()` - `Sidebar.tsx`
- **Params**: `e: React.ChangeEvent<HTMLInputElement>`
- **Returns**: nothing
- **Purpose**: Uploads profile photo
- **Execution Flow**:
  1. Reads file via FileReader
  2. Compresses image via `compressImage()`
  3. POSTs to `/api/auth/upload-photo` with compressed data
  4. Reloads page to reflect changes

### `calcStreak()` - backend `data.routes.js`
- **Params**: `attendances: array`
- **Returns**: `number` (consecutive days)
- **Purpose**: Calculates attendance streak for leaderboard
- **Execution Flow**:
  1. Extracts unique dates from attendances
  2. Sorts descending
  3. Counts consecutive days (diff === 1 day)
  4. Breaks on gap > 1 day

### `markRead()` - `components/Shell.tsx`
- **Params**: `id: string`
- **Returns**: nothing
- **Purpose**: Marks a single notification as read
- **Execution Flow**:
  1. Calls `PUT /api/notifications/{id}/read`
  2. Updates local state (optimistic update)
  3. Decrements unread count

### `handleBulkCorrect()` - `teacher/student-report/[classId]/page.tsx`
- **Params**: none (uses state)
- **Returns**: nothing
- **Purpose**: Marks attendance for multiple students at once
- **Execution Flow**:
  1. Calls `POST /api/sessions/{sessionId}/bulk-attendance` with student IDs
  2. Clears selection
  3. Refreshes report data

### `saveAttendance()` - `teacher/bulk-attendance/[id]/page.tsx`
- **Params**: none
- **Returns**: nothing
- **Purpose**: Saves bulk attendance changes
- **Execution Flow**:
  1. Gets all student IDs where `isPresent === true`
  2. POSTs to bulk-attendance endpoint
  3. Shows loading state

---

## 4. FEATURE-WISE IMPLEMENTATION

### AUTHENTICATION (Login & Signup)

**Files involved:**
- `frontend/src/app/login/page.tsx` - UI
- `frontend/src/context/AuthContext.tsx` - Auth state
- `frontend/src/lib/api.ts` - HTTP client
- `backend/src/routes/auth.routes.js` - Backend logic
- `backend/src/middleware/auth.js` - JWT verification

**Functions:**
- `login()` in AuthContext → `POST /api/auth/login`
- `signup()` in AuthContext → `POST /api/auth/signup`
- `auth` middleware in backend → verifies JWT on every protected request

**Execution:**
1. User fills form → selects role (Teacher/Student) → clicks Submit
2. For Login: calls `login(email, password, role)` → backend validates credentials using `bcrypt.compare()` → returns JWT token + user data
3. For Signup: calls `signup(formData)` → backend validates roll number range (students: 100523733001-100523733100), hashes password with `bcrypt.hash()`, creates user in DB
4. Frontend stores token in `localStorage.setItem('edutrack_token', d.token)`
5. Stores user in `localStorage.setItem('edutrack_user', JSON.stringify(d.user))`
6. React state `setUser(d.user)` updates globally
7. Redirects based on role and setup status

**Backend JWT creation:**
```js
function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, rollNumber: user.rollNumber, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}
```

**Roll number validation:** Students must have roll numbers between 100523733001 and 100523733100. This ensures only authorized students can register.

### QR CODE GENERATION

**Files:**
- `frontend/src/app/teacher/session/[id]/page.tsx` - Teacher generates QR
- `backend/src/services/qr.js` - QR service
- `backend/src/routes/session.routes.js` - QR endpoint

**Functions:**
- `generateQR()` in session page
- `makeQr()` in qr.js service

**Execution Flow:**
1. Teacher clicks "Generate QR" button
2. Browser requests GPS permission (`navigator.geolocation.getCurrentPosition`)
3. Teacher's lat/lng sent to `POST /api/sessions/{sessionId}/qr`
4. Backend calls `makeQr(sessionId)` which:
   - Generates a random token via `crypto.randomBytes(32).toString('hex')`
   - Creates QR data URL using `qrcode` npm package
   - Sets expiry to 5 minutes from now
   - Updates session status to `QR_ACTIVE`
   - Stores `qrToken`, `qrExpiresAt`, `teacherLat`, `teacherLng` in DB
5. Returns `qrDataUrl` (base64 PNG image)
6. Frontend displays QR image with 5-minute countdown timer
7. Student scans this QR to mark attendance

### QR SCANNER

**Files:**
- `frontend/src/app/student/scan/[id]/page.tsx` - Full scan flow
- `backend/src/routes/session.routes.js` - `/api/sessions/mark` endpoint

**Functions:**
- `onQrScanned()` - processes QR data
- `capturePhoto()` - takes student photo
- Mark attendance via `POST /api/sessions/mark`

**Execution Flow (5 steps):**
```
Step 1: SCAN → Student points camera at QR, `html5-qrcode` decodes it
         ↓
Step 2: PHOTO → Student takes selfie via webcam
         ↓
Step 3: LOCATION → Browser gets GPS coordinates
         ↓
Step 4: CONFIRM → Show all data for review
         ↓
Step 5: SUCCESS → Attendance marked in DB
```

**Step-by-step:**
1. **Scan**: Uses `html5-qrcode` library. Camera activates. When QR decoded, validates `sessionId` matches URL param. Extracts `token` from payload.
2. **Photo**: Activates webcam via `getUserMedia()`. Captures frame to canvas. Converts to JPEG data URL.
3. **Location**: Calls `navigator.geolocation.getCurrentPosition()`. Gets lat/lng.
4. **Confirm**: Displays captured photo and location status. User confirms.
5. **Submit**: Calls `POST /api/sessions/mark` with `{ sessionId, token, lat, lng, photo }`
   - Backend validates: session exists? status is QR_ACTIVE? token matches? not expired?
   - Calculates distance between teacher's stored lat/lng and student's sent lat/lng
   - If distance ≤ 100 meters → `locationVerified = true`
   - Creates attendance record via `prisma.attendance.upsert()`
   - Emits Socket.IO event `attendance:count` to teacher's session room
   - Returns attendance data

### LIVE ATTENDANCE (Real-time)

**Files:**
- `frontend/src/app/teacher/session/[id]/page.tsx` - Teacher's session control room
- `frontend/src/components/Shell.tsx` - Notification polling
- `backend/src/routes/session.routes.js` - API endpoints
- `backend/src/server.js` - Socket.IO setup

**How real-time works:**
1. **Socket.IO** is mounted on the Express HTTP server:
```js
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL } });
app.set("io", io);
```
2. **Teacher page** connects via `io(API)` and emits `join:session` with session ID
3. **Student marks attendance** → backend emits `io.to(sessionId).emit("attendance:count", data)`
4. **Teacher receives** `attendance:count` → fetches latest count via `GET /api/sessions/{id}/count`
5. **Polling fallback**: Every 5 seconds, teacher page also polls `/api/sessions/{id}/count`

### ATTENDANCE MARKING (Backend)

**File**: `backend/src/routes/session.routes.js`

**`POST /api/sessions/mark`:**
1. Look up session by `sessionId`
2. Validate: session exists? status is `QR_ACTIVE`? `qrToken` matches? not expired?
3. Calculate `locationVerified`: distance between teacher's stored coords and student's GPS
4. Look up student name/roll number
5. Upsert attendance record (insert if new, update if exists)
6. Broadcast count via Socket.IO
7. Return attendance object

**`POST /api/sessions/{sessionId}/bulk-attendance`:**
1. Get existing attendance for session
2. Create new attendance for students not already marked
3. Remove attendance for students not in the list
4. Return counts

### SUBJECT MANAGEMENT

**Files:**
- `frontend/src/app/teacher/subjects/page.tsx` - Subject management UI
- `backend/src/routes/data.routes.js` - Subject CRUD endpoints

**Features:**
- **Faculty Code linking**: Teacher enters faculty code → auto-suggests from timetable data → links teacher to subjects
- **Auto-populate**: Fetches subjects from master timetable data by faculty code
- **Create custom subject**: Teacher can create new subjects (generates code from initials + random string)
- **Toggle subjects**: Select/deselect subjects by semester
- **Edit subjects**: Change name/semester of existing subjects

**Key function `handleCodeInput()`**:
- Filters faculty codes based on input
- Shows dropdown suggestions (up to 10)
- On selection, links teacher to that faculty code

### ANNOUNCEMENTS

**Files:**
- `frontend/src/app/teacher/announcements/page.tsx` - Create/list/delete
- `frontend/src/app/student/announcements/page.tsx` - View announcements
- `backend/src/routes/announcement.routes.js` - CRUD endpoints

**Teacher creates announcement:**
1. Fills title, content, expiry time, selects target subject
2. `POST /api/announcements` with `{ classId, title, content, expiresInHours }`
3. Backend creates announcement record
4. Backend looks up students in that class's semester/department
5. For each student: creates a `Notification` record with the announcement details
6. Backend returns the created announcement

**Student views announcements:**
1. `GET /api/announcements` with auth token
2. Backend identifies student's department and semester
3. Fetches announcements for classes matching student's department/semester
4. Filters by `expiresAt > now()` (only show non-expired)
5. Filters by `semesters` array (only show announcements targeting student's semester)
6. Returns with class name attached

**Teacher deletes announcement:**
1. Clicks delete button
2. `DELETE /api/announcements/{id}` with auth
3. Backend only deletes if `teacherId` matches (ownership)

### NOTIFICATIONS

**Files:**
- `frontend/src/components/Shell.tsx` - Notification UI
- `backend/src/routes/notification.routes.js` - API endpoints

**Endpoints:**
- `GET /api/notifications?limit=10&page=1` - Paginated notification list
- `GET /api/notifications/unread-count` - Count of unread
- `PUT /api/notifications/{id}/read` - Mark single as read
- `PUT /api/notifications/read-all` - Mark all as read

**Polling:**
- Shell.tsx polls `unread-count` every 30 seconds via `setInterval(fetchUnread, 30000)`
- When notification dropdown opens, fetches full list via `fetchNotifications()`

### TIMETABLE

**Files:**
- `frontend/src/app/student/timetable/page.tsx` - Student view
- `frontend/src/app/teacher/timetable/page.tsx` - Teacher view
- `frontend/src/app/teacher/schedule/page.tsx` - Schedule editor
- `backend/src/routes/timetable.routes.js` - API endpoints
- `backend/prisma/timetable-data.json` - Master timetable data

**Data source:** `timetable-data.json` is the master timetable containing:
- All semesters with subjects
- Day-wise time slots
- Faculty assignments
- Room allocations
- Lab batches

**Student timetable:**
1. Fetches `/api/timetable/master?semester={sem}` → gets semester's timetable
2. Displays as table: rows = time slots (09:00-16:00), columns = days (Mon-Fri)
3. Cells show subject code, faculty, room
4. Lab sessions get gradient colors based on batch

**Teacher schedule editor:**
1. Selects department + semester
2. Views existing timetable for that semester
3. Can click cells to toggle subjects
4. Submits via `POST /api/timetable/bulk`

### ATTENDANCE OVERVIEW

**Files:**
- `frontend/src/app/student/overview/page.tsx`
- `backend/src/routes/data.routes.js` (`GET /student/dashboard`)

**Display:**
- Pie chart showing attendance percentage (using Chart.js via PieCard)
- Summary: total sessions, attended, percentage
- Monthly calendar heatmap (green dots on days student attended)
- Link to per-subject breakdown

**Data:**
- `GET /api/student/dashboard` returns classes with sessions and attendances
- Frontend computes: `attended = sessions.filter(s => s.attendances.some(a => a.studentId === user.id)).length`
- Heatmap: collects unique dates from attended sessions in current month

### GOALS

**Files:**
- `frontend/src/app/student/goals/page.tsx`
- `backend/src/routes/data.routes.js` (`GET /goals`)

**Function:**
- Shows per-subject attendance percentage
- Shows "classes needed to reach 75%" for each subject
- What-if calculator: slider to adjust future classes, shows projected percentage
- Overall summary across all subjects

### SETTINGS

**Files:**
- `frontend/src/app/settings/page.tsx`

**Features:**
- Update profile: name, department, year, semester
- Password change (with current password verification)
- Profile photo upload (compression + API call)
- Account deletion (with confirmation cascade)

### THEME TOGGLE

**Files:**
- `frontend/src/context/DarkModeContext.tsx`
- `frontend/src/components/Shell.tsx`
- `frontend/src/components/Sidebar.tsx`

**Implementation:**
1. `DarkModeContext` provides `{ dark, toggle }`
2. `toggle()` flips state, saves to localStorage, toggles `class="dark"` on `<html>`
3. Tailwind's `darkMode: 'class'` applies dark styles when `.dark` class is present
4. Both Shell.tsx and Sidebar.tsx have toggle buttons

---

## 5. DATABASE (Prisma Schema)

### Full Schema: `backend/prisma/schema.prisma`

```prisma
enum Role { STUDENT, TEACHER }
enum SessionStatus { SCHEDULED, ACTIVE, ENDED, QR_ACTIVE, QR_EXPIRED }

model User {
  id              String       @id @default(cuid())
  name            String
  email           String       @unique
  password        String
  role            Role
  department      String?
  semester        Int?
  year            Int?
  selectedSubject String?
  designation     String?
  facultyCode     String?
  rollNumber      String?
  photoUrl        String?
  faceDescriptor  Json?
  faceRegistered  Boolean      @default(false)
  createdAt       DateTime     @default(now())

  teacherClasses Class[]       @relation("TeacherClasses")
  attendances    Attendance[]
  announcements  Announcement[]
  notifications  Notification[]
}
```

**Why User exists:** Stores all users (students and teachers) in one table. Differentiated by `role` enum. This avoids having separate Student/Teacher tables, simplifying auth. Teachers log in by email, students by roll number.

```prisma
model Class {
  id        String        @id @default(cuid())
  subject   String
  code      String
  department String
  semester  Int
  year      Int
  teacherId String
  teacher   User          @relation("TeacherClasses", fields: [teacherId], references: [id])
  timetable Timetable[]
  sessions  Session[]
  announcements Announcement[]
}
```

**Why Class exists:** Represents a subject taught by a teacher to a specific semester. Links teacher (via `teacherId`) to students (via `department` + `semester`). Has a unique `code` (e.g., "CSE301").

```prisma
model Timetable {
  id        String   @id @default(cuid())
  classId   String
  dayOfWeek Int      // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime String   // "09:00"
  endTime   String   // "10:00"
  room      String
  class     Class    @relation(fields: [classId], references: [id])
}
```

**Why Timetable exists:** Defines when and where a class takes place. A class can have multiple timetable entries (e.g., Monday 09:00-10:00 in Room 101, Wednesday 10:00-11:00 in Lab 2).

```prisma
model Session {
  id          String        @id @default(cuid())
  classId     String
  teacherId   String
  status      SessionStatus @default(SCHEDULED)
  startTime   DateTime?
  endTime     DateTime?
  qrToken     String?       // Random token for QR verification
  qrExpiresAt DateTime?     // QR expiry time
  teacherLat  Float?        // Teacher's GPS latitude when QR generated
  teacherLng  Float?        // Teacher's GPS longitude when QR generated
  createdAt   DateTime      @default(now())
  class       Class         @relation(fields: [classId], references: [id])
  attendances Attendance[]
}
```

**Why Session exists:** Represents a single class meeting. Status flows: SCHEDULED → ACTIVE → QR_ACTIVE → ENDED. Stores QR token and teacher's location for verification. Each session can have many attendances.

```prisma
model Attendance {
  id               String   @id @default(cuid())
  sessionId        String
  studentId        String
  markedAt         DateTime @default(now())
  faceVerified     Boolean  @default(false)
  locationVerified Boolean  @default(false)
  photo            String?
  studentName      String?
  rollNumber       String?
  subjectId        String?
  teacherId        String?
  session          Session  @relation(fields: [sessionId], references: [id])
  student          User     @relation(fields: [studentId], references: [id])
  @@unique([sessionId, studentId])  // One attendance per student per session
  @@index([studentId])
  @@index([sessionId])
}
```

**Why Attendance exists:** Tracks which students attended which sessions. The `@@unique([sessionId, studentId])` constraint ensures a student can only be marked once per session. Stores photo for verification proof.

```prisma
model Announcement {
  id         String   @id @default(cuid())
  teacherId  String
  classId    String?
  title      String
  content    String
  semesters  Json?    // Array of semester numbers (e.g., [5, 6])
  expiresAt  DateTime?
  createdAt  DateTime @default(now())
  class      Class?   @relation(fields: [classId], references: [id])
  teacher    User     @relation(fields: [teacherId], references: [id])
}
```

**Why Announcement exists:** Teachers broadcast messages to students. The `semesters` JSON array allows targeting specific semesters. `expiresAt` auto-hides old announcements.

```prisma
model Notification {
  id             String       @id @default(cuid())
  userId         String
  type           String?      // e.g., "announcement"
  title          String
  message        String?
  link           String?
  announcementId String?
  isRead         Boolean      @default(false)
  createdAt      DateTime     @default(now())
  user           User         @relation(fields: [userId], references: [id])
  @@index([userId, isRead])
}
```

**Why Notification exists:** Delivers announcements to individual students. Created automatically when teacher posts an announcement. The `@@index([userId, isRead])` speeds up the unread count query.

### Entity Relationships Diagram

```
User (TEACHER) ──1:N──> Class ──1:N──> Timetable
                    │
                    └──1:N──> Session ──1:N──> Attendance ──N:1──> User (STUDENT)
                    │
                    └──1:N──> Announcement
                    │
User ──1:N──> Notification
```

---

## 6. API ROUTES

### Auth Routes (`/api/auth`)

| Endpoint | Method | Request Body | Response | Purpose | Called From |
|----------|--------|-------------|----------|---------|-------------|
| `/signup` | POST | `{ name, email, password, role, department, semester, rollNumber }` | `{ token, user }` | Register new user | `AuthContext.signup()` |
| `/login` | POST | `{ email, password, role }` | `{ token, user }` | Authenticate user | `AuthContext.login()` |
| `/upload-photo` | POST | `{ photoData }` (base64) | `{ user }` | Upload/change profile photo | `Sidebar.handlePhotoUpload()`, `settings/page.tsx` |

### Data Routes (`/api`) - All require auth middleware

| Endpoint | Method | Response | Purpose | Called From |
|----------|--------|----------|---------|-------------|
| `/me` | GET | User object | Get current user profile | `AuthContext` initial load, `refreshUser()`, `student/dashboard` |
| `/me` | PUT | Updated user | Update profile fields | `settings/page.tsx` |
| `/me` | DELETE | `{ success }` | Delete account | `settings/page.tsx` |
| `/me/password` | PUT | `{ success }` | Change password | `settings/page.tsx` |
| `/teacher/dashboard` | GET | `{ classes, lowAttendance }` | Teacher dashboard data | `teacher/dashboard/page.tsx` |
| `/student/dashboard` | GET | `{ classes }` | Student dashboard data | `student/dashboard`, `overview`, `subject-attendance`, etc. |
| `/classes/today` | GET | Array of classes | Today's classes (filtered by day) | `teacher/today`, `student/today` |
| `/classes/:id` | GET | Class with timetable+sessions | Single class by ID | `teacher/session/[id]` |
| `/teacher/student-report/:classId` | GET | `{ class, students[] }` | Per-class attendance report | `teacher/student-report/[classId]` |
| `/teacher/subjects` | POST | `{ name, semester }` | Create custom subject | `teacher/subjects/page.tsx` |
| `/teacher/my-subjects` | GET | Subject array | Get teacher's linked subjects | `teacher/subjects/page.tsx` |
| `/teacher/my-subjects` | PUT | `{ success }` | Save subject selection | `teacher/subjects/page.tsx` |
| `/teacher/session-archive` | GET | Session array | Past completed sessions | `teacher/session-archive/page.tsx` |
| `/analytics` | GET | Stats object | Quick analysis data | `teacher/analytics/page.tsx` |
| `/leaderboard` | GET | Top 10 students | Gamification leaderboard | `student/gamification/page.tsx` |
| `/goals` | GET | Goal array per subject | Attendance goals | `student/goals/page.tsx` |
| `/low-attendance` | GET | Student array | Students below 75% | `teacher/low-attendance/page.tsx` |
| `/export/:classId` | GET | CSV file | Download attendance CSV | `teacher/student-report/[classId]` |

### Session Routes (`/api/sessions`) - All require auth

| Endpoint | Method | Request Body | Response | Purpose | Called From |
|----------|--------|-------------|----------|---------|-------------|
| `/:sessionId` | GET | - | Session with class+timetable | Get session info | `student/scan/[id]` |
| `/archive` | GET | - | Session array | Past sessions (teacher) | `teacher/session-archive` |
| `/:sessionId/students` | GET | - | Students with attendance status | Get student list for session | `teacher/session/[id]`, `bulk-attendance`, `qr/[id]` |
| `/:classId/start` | POST | - | Created session | Start new session | `teacher/session/[id]` |
| `/:sessionId/end` | POST | - | Updated session | End session | `teacher/session/[id]` |
| `/:sessionId/qr` | POST | `{ teacherLat, teacherLng }` | Session with qrDataUrl | Generate QR code | `teacher/session/[id]`, `teacher/qr/[id]` |
| `/:sessionId/bulk-attendance` | POST | `{ studentIds }` | `{ count, created, removed }` | Bulk mark attendance | `teacher/bulk-attendance/[id]`, `student-report` |
| `/:sessionId/count` | GET | `{ count }` | Attendance count | Live count polling | `teacher/session/[id]`, `teacher/qr/[id]` |
| `/mark` | POST | `{ sessionId, token, lat, lng, photo }` | Attendance record | Student marks attendance | `student/scan/[id]` |

### Announcement Routes (`/api/announcements`) - All require auth

| Endpoint | Method | Request Body | Response | Purpose | Called From |
|----------|--------|-------------|----------|---------|-------------|
| `/` | GET | - | Announcement array | List announcements | `teacher/announcements`, `student/announcements` |
| `/` | POST | `{ classId, title, content, expiresInHours }` | Created announcement | Create announcement | `teacher/announcements/page.tsx` |
| `/:id` | PUT | `{ title, content, ... }` | Updated announcement | Edit announcement | - |
| `/:id` | DELETE | `{ success }` | - | Delete announcement | `teacher/announcements/page.tsx` |

### Notification Routes (`/api/notifications`) - All require auth

| Endpoint | Method | Query/Params | Response | Purpose | Called From |
|----------|--------|-------------|----------|---------|-------------|
| `/` | GET | `?limit=10&page=1` | `{ notifications, total, page, limit }` | List notifications | `Shell.tsx`, `student/announcements` |
| `/unread-count` | GET | - | `{ count }` | Unread count | `Shell.tsx` |
| `/:id/read` | PUT | - | `{ success }` | Mark as read | `Shell.tsx` |
| `/read-all` | PUT | - | `{ success }` | Mark all read | `Shell.tsx` |

### Timetable Routes (`/api/timetable`) - All require auth

| Endpoint | Method | Query/Params | Response | Purpose | Called From |
|----------|--------|-------------|----------|---------|-------------|
| `/semesters` | GET | - | Semester array with subjects | List all semesters | `student/timetable`, `teacher/timetable`, `teacher/subjects` |
| `/master` | GET | `?semester=N` | Semester timetable data | Master timetable | `student/timetable`, `teacher/timetable` |
| `/departments` | GET | - | Department+semester pairs | Get teacher's departments | `Sidebar.tsx`, `teacher/schedule` |
| `/by-department` | GET | `?department=X&semester=N` | Classes with timetable | Schedule by dept/sem | `teacher/schedule` |
| `/by-faculty` | GET | `?code=X` | Subjects array | Subjects by faculty code | `teacher/subjects` |
| `/faculty-codes` | GET | - | Faculty code array | Autocomplete suggestions | `teacher/subjects` |
| `/available-subjects` | GET | `?semester=N` | Subject array | All available subjects | `teacher/subjects` |
| `/bulk` | POST | `{ classId, entries[] }` | Timetable array | Save timetable | `teacher/schedule` |

---

## 7. REACT CONCEPTS (from actual codebase)

### Why React Components are Used

Each `.tsx` file in `src/app/` is a React component. React components encapsulate UI + logic. Example:

**`BackButton.tsx`** - A small, reusable component:
```tsx
export default function BackButton({ href, label }) {
  const router = useRouter();
  return (
    <button onClick={() => (href ? router.push(href) : router.back())}>
      <span>{label || 'Back'}</span>
    </button>
  );
}
```
**Why**: Every page needs a "go back" button. Instead of copying the same JSX 30 times, we create one component and reuse it with different props.

### Why useState is Used

`useState` manages component-local state. Examples:

**`teacher/session/[id]/page.tsx`**:
```tsx
const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
const [countdown, setCountdown] = useState(0);
const [loading, setLoading] = useState(false);
const [students, setStudents] = useState<any[]>([]);
```
**Why**: Each of these represents UI state that changes over time. QR data URL changes when teacher generates QR. Countdown changes every second. Loading changes when API calls start/end. Students array updates as attendees are marked.

### Why useEffect is Used

`useEffect` runs side effects (API calls, timers, subscriptions). Examples:

**`teacher/session/[id]/page.tsx`**:
```tsx
useEffect(() => {
  if (id) {
    api(`/api/classes/${id}`).then((classData) => {
      setCls(classData);
      // ...
    });
  }
}, [id]);  // Re-runs when `id` changes
```
**Why**: When the page loads or the `id` param changes, we need to fetch class/session data from the backend.

**QR countdown timer**:
```tsx
useEffect(() => {
  if (qrExpiry) {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((qrExpiry - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setQrDataUrl(null);
      }
    }, 1000);
    return () => clearInterval(interval);  // Cleanup!
  }
}, [qrExpiry]);
```
**Why**: Creates a 1-second interval that counts down. The cleanup function (`clearInterval`) prevents memory leaks when component unmounts.

### Why Context is Used

Context provides global state without prop drilling.

**`AuthContext.tsx`**:
```tsx
<C.Provider value={{ user, login, signup, refreshUser, logout }}>
  {children}
</C.Provider>
```
**Why**: `user` object is needed by every page (to show name, check role, filter data). Without Context, every page would need to fetch `/api/me` on mount. With Context, one fetch at app startup provides user to all components.

Any component can access user via:
```tsx
const { user, logout } = useAuth();
```

### Why Props are Used

Props pass data from parent to child components.

**`Shell.tsx`**:
```tsx
<Shell role="teacher" title="Session Control">
  {/* page content */}
</Shell>
```
**Why**: `Shell` needs to know the role (to render correct sidebar) and title (to show in header). The page content is passed as `children` prop.

**`BackButton.tsx`**:
```tsx
<BackButton href="/teacher/today" label="Back to Today's Classes" />
```
**Why**: Different pages need different back destinations. Props make BackButton reusable.

### Why Custom Hooks are Used

Custom hooks encapsulate reusable logic.

**`useAuth()`**: Returns `{ user, login, signup, refreshUser, logout }` - encapsulates all auth logic.
**`useDarkMode()`**: Returns `{ dark, toggle }` - encapsulates theme logic.

**Why**: Without `useAuth()`, every component that needs user data would have to import Context, useContext, etc. The hook simplifies usage.

---

## 8. NEXT.JS CONCEPTS

### App Router

EDUTrack uses **Next.js 14 App Router** (`/app` directory). File-system based routing:
```
app/student/dashboard/page.tsx → /student/dashboard
app/student/scan/[id]/page.tsx → /student/scan/abc123 (dynamic route)
app/teacher/session/[id]/page.tsx → /teacher/session/abc123
app/teacher/student-report/[classId]/page.tsx → /teacher/student-report/xyz789
```

### Dynamic Routing

Files named `[param]` create dynamic routes:

| File Path | Example URL | Param Access |
|-----------|------------|--------------|
| `student/scan/[id]/page.tsx` | `/student/scan/abc123` | `const { id } = use(params)` |
| `teacher/session/[id]/page.tsx` | `/teacher/session/xyz` | `const { id } = useParams()` |
| `teacher/qr/[id]/page.tsx` | `/teacher/qr/456` | `const { id } = use(params)` |
| `teacher/student-report/[classId]/page.tsx` | `/teacher/student-report/789` | `const { classId } = useParams()` |
| `teacher/bulk-attendance/[id]/page.tsx` | `/teacher/bulk-attendance/111` | `const { id } = useParams()` |

**How params are accessed:**
- Next.js 14: `useParams()` from `next/navigation`
- Next.js 15: `async Page({ params }: { params: Promise<{ id }> })` with `use(params)`

### Client Components

Every page uses `'use client'` directive because they all use:
- `useState` / `useEffect` (hooks require client)
- `useAuth()` (context requires client)
- Event handlers (onClick, onSubmit)
- Browser APIs (localStorage, navigator.geolocation)

### API Routes

Backend API runs on Express on port 4000, NOT as Next.js API routes. This separation allows:
- Independent scaling (backend on Render, frontend on Vercel)
- Technology choice (Express is better for complex APIs)
- Socket.IO support (Next.js serverless doesn't support WebSocket easily)

### Layout

`app/layout.tsx` is the root layout:
```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DarkModeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
```
**Why**: Every page needs Auth and Dark Mode providers. Putting them in root layout ensures they wrap all pages automatically.

---

## 9. TECHNOLOGIES

### React (v18)
**Why React instead of Vue/Angular?**
- **Component model**: Each page/section is a self-contained component with its own state
- **useState/useEffect**: Perfect for data fetching and UI updates
- **Context API**: Simple global state without external libraries (Redux unnecessary)
- **Huge ecosystem**: Chart.js, framer-motion, html5-qrcode all have React wrappers
- **Next.js integration**: React is the only framework Next.js supports

### Next.js 14
**Why Next.js instead of Vite/CRA?**
- **File-system routing**: `app/student/dashboard/page.tsx` = `/student/dashboard` automatically
- **Server-side rendering**: Faster initial load, better SEO
- **Production build**: `next build` optimizes bundles, code-splits automatically
- **Vercel deployment**: One-click deploy, built-in CI/CD
- **Image optimization**: Built-in `<Image>` component (not used heavily here though)

### TypeScript
**Why TypeScript instead of JavaScript?**
- **Type safety**: Prevents `undefined is not a function` errors at compile time
- **Self-documenting**: Function signatures show what parameters are expected
- **Editor support**: Autocomplete, refactoring, error highlighting
- **Used for**: All `.tsx` and `.ts` files in the frontend

### Prisma ORM
**Why Prisma instead of raw SQL or other ORMs?**
- **Type-safe queries**: `prisma.user.findMany()` returns typed objects
- **Schema-first**: `schema.prisma` defines models → Prisma generates client code
- **Migrations**: `prisma migrate` manages database schema changes
- **Relations**: Simple syntax for `include: { class: { include: { timetable: true } } }`
- **No SQL**: We don't write raw SQL anywhere in the codebase

### PostgreSQL / Supabase
**Why PostgreSQL instead of MongoDB?**
- **Relational data**: Users-Classes-Sessions-Attendance is perfectly relational
- **ACID compliance**: Attendance data must be consistent (no duplicates)
- **Foreign keys**: `sessionId` references `Session.id` - enforces data integrity
- **Unique constraints**: `@@unique([sessionId, studentId])` prevents double-marking
- **Supabase**: Free PostgreSQL hosting with dashboard, built-in auth, auto-pause to save costs

### Tailwind CSS
**Why Tailwind instead of traditional CSS?**
- **Utility-first**: `className="flex items-center gap-2 px-4 py-3 rounded-xl"` - no separate CSS files
- **Dark mode**: `dark:bg-slate-800` - built-in dark mode support via `class` strategy
- **Consistent design**: Pre-defined color palette, spacing scale
- **Rapid development**: No context switching between HTML and CSS files

### Socket.IO
**Why Socket.IO for real-time?**
- **WebSocket with fallback**: Works even when WebSocket is blocked (falls back to long-polling)
- **Rooms**: `socket.join(sessionId)` - only teachers and students in same session receive events
- **Events**: `io.to(sessionId).emit("attendance:count", data)` - targeted, real-time updates
- **Used for**: Live attendance count updates on teacher's screen when a student scans QR

### Framer Motion
**Why framer-motion?**
- **Animated page transitions**: `motion.div` with `initial`, `animate`, `variants` for staggered children
- **No CSS animations needed**: All animations defined in JSX
- **Performance**: Uses CSS transforms, GPU-accelerated

### Deployment: Vercel + Render + Supabase
**Why three services?**
- **Vercel (frontend)**: Optimized for Next.js, free tier, automatic HTTPS, CDN
- **Render (backend)**: Node.js hosting, free tier (goes to sleep), easy Express deployment
- **Supabase (database)**: Free PostgreSQL, dashboard for data exploration, auto-pause when idle

---

## 10. DEPLOYMENT

### Local Development

**Frontend** (`localhost:3000`):
```bash
cd frontend
npm run dev    # next dev -p 3000
```

**Backend** (`localhost:4000`):
```bash
cd backend
npm run dev    # node --watch src/server.js
```

**Database**: Supabase cloud PostgreSQL (not local)

The `lib/api.ts` auto-detects localhost:
```ts
const API = typeof window !== "undefined" && location.hostname === "localhost"
  ? "http://localhost:4000"
  : "https://edutrack-7yt9.onrender.com";
```

### Production Architecture

```
User → Browser → Vercel CDN → Next.js (SSR)
                               ↓ fetch()
                    Render → Express API → Prisma → Supabase PostgreSQL
                               ↓
                    Socket.IO (real-time WebSocket)
```

### Communication Flow

```
Frontend (Vercel)                  Backend (Render)              Database (Supabase)
edutrack.vercel.app                edutrack-7yt9.onrender.com    hosted on Supabase Cloud
       │                                  │                            │
       │──── fetch(API + path) ──────────>│                            │
       │                                  │──── Prisma query ────────>│
       │                                  │<─── result ───────────────│
       │<──── JSON response ──────────────│                            │
       │                                  │                            │
       │──── Socket.IO connect ──────────>│                            │
       │<─── real-time events ────────────│                            │
```

### Why This Architecture?

1. **Frontend on Vercel**: Vercel was built BY the creators of Next.js. Zero-config deployment. Automatic HTTPS. CDN distribution. Free tier is generous.
2. **Backend on Render**: Render supports Node.js with persistent processes (unlike Vercel serverless). Needed for Socket.IO and long-running connections. Free tier sleeps after inactivity (wakes up on first request).
3. **Database on Supabase**: Supabase provides PostgreSQL with a free tier. The project auto-pauses after 7 days of inactivity to save resources. Provides web dashboard for data inspection.

---

## 11. COMPLETE EXECUTION FLOW (Student Attendance)

### Student Logs In
```
login/page.tsx → AuthContext.login() → POST /api/auth/login
                                      → JWT stored in localStorage
                                      → Redirect to /student/dashboard
```

### Student Dashboard
```
student/dashboard/page.tsx → api('/api/student/dashboard')
                           → Shows: greeting, attendance %, navigation tiles
                           → Tiles: Overview, Today, Timetable, Leaderboard, Goals
```

### Today's Classes
```
student/today/page.tsx → api('/api/classes/today')
                       → Lists today's classes with time slots
                       → Each class has "Mark Attendance" button
                       → Button links to /student/scan/{sessionId}
```

### QR Scan
```
student/scan/[id]/page.tsx → User clicks "Start Scanning"
                           → Camera activates via html5-qrcode
                           → QR decoded → { sessionId, token } extracted
                           → Validates sessionId matches URL param
```

### Photo Capture
```
student/scan/[id]/page.tsx → Webcam activates via getUserMedia()
                           → Photo captured to canvas as JPEG data URL
                           → Shows preview to student
```

### Location Capture
```
student/scan/[id]/page.tsx → navigator.geolocation.getCurrentPosition()
                           → lat & lng obtained
```

### Submit Attendance
```
student/scan/[id]/page.tsx → POST /api/sessions/mark
                           → Body: { sessionId, token, lat, lng, photo }
```

### Backend Processes
```
session.routes.js → Validates QR token & expiry
                  → Calculates distance: teacherLat vs studentLat
                  → If distance ≤ 100m → locationVerified = true
                  → prisma.attendance.upsert() → saves to DB
                  → io.to(sessionId).emit("attendance:count")
                  → Returns attendance record
```

### Teacher Sees Live Update
```
teacher/session/[id]/page.tsx → Socket.IO receives "attendance:count"
                              → api('/api/sessions/{id}/count') → new count
                              → api('/api/sessions/{id}/students') → updated list
                              → UI re-renders with new attendance count
```

### Attendance Overview
```
student/overview/page.tsx → api('/api/student/dashboard')
                          → Computes: total sessions, attended, percent
                          → Shows: Pie chart, heatmap, per-subject breakdown
                          → Data from: sessions where student has attendance
```

---

## 12. VIVA PREPARATION

### Likely Questions and Answers

**Q: Why did you choose React?**
- *Simple*: React is popular, component-based, and works well with Next.js.
- *Technical*: React's component model lets us reuse UI like `BackButton` across 30 pages. useState/useEffect handle API calls and timers. Context API provides global auth/theme state without Redux complexity.
- *Follow-up*: "Could you use useState in a server component?" → No, useState only works in client components (marked with `'use client'`).

**Q: Why Next.js instead of Vite or Create React App?**
- *Simple*: Next.js gives us routing automatically based on file structure.
- *Technical*: Next.js App Router provides file-system based routing. `app/student/dashboard/page.tsx` automatically maps to `/student/dashboard`. Dynamic routes like `[id]` handle URL parameters. Built-in build optimization with `next build`.
- *Follow-up*: "What is dynamic routing?" → Files named `[param]` create dynamic URL segments. Example: `student/scan/[id]` matches `/student/scan/abc123`, and `id` is accessible via `useParams()` or `use()` in the page component.

**Q: Why Prisma instead of writing SQL directly?**
- *Simple*: Prisma generates type-safe queries and manages schema migrations automatically.
- *Technical*: Prisma provides a schema-first approach. We define models in `schema.prisma`, run `prisma generate`, and get type-safe client code. Queries like `prisma.session.findUnique({ where: { id }, include: { class: true, attendances: true } })` automatically generate the correct SQL JOINs. No raw SQL in the entire project.
- *Follow-up*: "How does Prisma handle relations?" → Relations are defined in schema using `@relation`. Prisma eagerly loads related data when `include` is specified. Example: `Session` has `@@unique([sessionId, studentId])` constraint preventing duplicate attendance.

**Q: Why PostgreSQL and not MongoDB?**
- *Simple*: Attendance data is relational - students, classes, sessions are all connected.
- *Technical*: PostgreSQL's foreign keys enforce referential integrity. The `@@unique([sessionId, studentId])` constraint prevents a student from being marked twice for the same session. ACID compliance ensures attendance data is never corrupted. MongoDB would require manual handling of these constraints in application code.
- *Follow-up*: "What are the benefits of relational databases for your project?" → Attendance tracking requires consistency. A student must not be double-marked. A session must belong to a valid class. These constraints are enforced at database level, not just application level.

**Q: Why use QR codes for attendance?**
- *Simple*: QR codes are scannable by phone cameras, work offline, and expire after 5 minutes.
- *Technical*: QR contains `{ sessionId, token }`. The token is a random 32-byte hex string (`crypto.randomBytes(32).toString('hex')`). It expires after 5 minutes (stored as `qrExpiresAt`). Backend validates: session status must be `QR_ACTIVE`, token must match, must not be expired. This prevents: reusing old QR codes, scanning from outside class (via location verification).
- *Follow-up*: "How does location verification work?" → Teacher's GPS coordinates are saved when QR is generated. Student's GPS is captured when they scan. Backend calculates distance using Haversine formula (in `geo.js`). If distance ≤ 100 meters, `locationVerified = true`.

**Q: Why location verification?**
- *Simple*: Ensures students are physically in class when marking attendance.
- *Technical*: The teacher's latitude/longitude is saved during QR generation. The student's latitude/longitude is sent during attendance marking. `geo.js` uses the Haversine formula to calculate distance between two GPS coordinates. Threshold: 100 meters. This prevents students from marking attendance from outside the classroom.
- *Follow-up*: "What is the Haversine formula?" → It calculates the great-circle distance between two points on a sphere using their latitudes and longitudes. Accuracy is sufficient for classroom-level verification.

**Q: How does teacher semester filter work in the sidebar?**
- *Simple*: The teacher selects a semester from a dropdown, which filters their classes.
- *Technical*: On mount, `Sidebar.tsx` fetches `/api/timetable/departments` which returns unique department/semester pairs from the teacher's classes. Semesters are extracted into a sorted array. When teacher selects one, `handleSidebarSemesterChange()` saves to localStorage and updates the user's `semester` field via `PUT /api/me`. Many teacher pages use `localStorage.getItem('edutrack_teacher_semester')` to filter displayed classes.

**Q: How do announcements reach students?**
- *Simple*: Teacher creates announcement → backend creates notifications for each student in that class.
- *Technical*: When a teacher posts an announcement via `POST /api/announcements`, the backend: (1) creates the Announcement record, (2) looks up students in `User` table matching `department` and `semester`, (3) creates a `Notification` record for each student with the announcement title and content snippet. The notification is stored with `isRead: false`. Students see unread count through polling (`GET /api/notifications/unread-count` every 30s in Shell.tsx).

**Q: How does the real-time attendance count work?**
- *Simple*: Socket.IO sends updates to the teacher's screen when a student marks attendance.
- *Technical*: Socket.IO is initialized in `server.js` with CORS for the frontend URL. When teacher opens the session control page, their browser connects to Socket.IO and calls `socket.emit('join:session', sessionId)` to join a room. When a student marks attendance via `POST /api/sessions/mark`, the backend emits `io.to(sessionId).emit('attendance:count', data)`. The teacher's browser receives this event and re-fetches the attendance count. A 5-second polling interval serves as fallback.

**Q: How does the leaderboard work?**
- *Simple*: Students are ranked by attendance score, with streak bonuses.
- *Technical*: `GET /api/leaderboard` queries all students. For each student: `score = Math.round((attendanceCount / Math.max(attendanceCount + 10, 1)) * 100)`. Streak is calculated by sorting attendance dates descending, counting consecutive days. Top 10 students are returned. Frontend shows podium (top 3) and full list. User's own rank is highlighted. Current streak is shown.

**Q: Why is the backend deployed on Render and not Vercel?**
- *Simple*: Render supports persistent Node.js processes needed for Socket.IO.
- *Technical*: Vercel's serverless functions have a 10-second timeout and cannot maintain WebSocket connections. Render runs a full Express server as a long-running process. Socket.IO requires persistent connections for real-time attendance updates. Render also handles the database connection pool more efficiently than serverless.

**Q: How does the timetable data flow from JSON to screen?**
- *Simple*: Admin creates `timetable-data.json` → backend reads it → frontend displays it.
- *Technical*: `backend/prisma/timetable-data.json` contains the master timetable for all semesters. Backend routes like `/api/timetable/master` import this JSON directly using dynamic `import()` with `{ with: { type: "json" } }`. No database storage needed for the master timetable. Frontend receives the data and renders a grid table with time slots as rows and days as columns.

**Q: How is a session started and ended?**
- *Simple*: Teacher clicks "Start" → session created in DB → teacher later clicks "End".
- *Technical*: `POST /api/sessions/{classId}/start` creates a Session record with `status: "ACTIVE"` and `startTime: now()`. `POST /api/sessions/{sessionId}/end` updates to `status: "ENDED"` and sets `endTime: now()`. The session status flow: `SCHEDULED → ACTIVE → QR_ACTIVE → ENDED`. Teachers can generate QR only when in `ACTIVE` or `QR_ACTIVE` states.

**Q: How are profile photos uploaded?**
- *Simple*: User selects file → compressed to JPEG → base64 uploaded → stored in database.
- *Technical*: The image is read via `FileReader`, then passed through `compressImage()` which draws it on a `<canvas>` at max 400px width and 70% JPEG quality. The compressed base64 data URL is sent to `POST /api/auth/upload-photo`. Backend simply stores the base64 string in `User.photoUrl` field. No file system or cloud storage needed. This means photos are stored directly in the PostgreSQL database.

---

## 13. MOST IMPORTANT FILES

### Top 20 Most Important Files to Study

| Rank | File | Why Important |
|------|------|---------------|
| 1 | `backend/src/server.js` | Entry point - Express setup, Socket.IO, route registration |
| 2 | `backend/src/routes/session.routes.js` | Core feature - sessions, QR, attendance marking, real-time |
| 3 | `backend/src/routes/auth.routes.js` | Authentication - signup, login, JWT, photo upload |
| 4 | `backend/src/routes/data.routes.js` | Data APIs - dashboard, classes, reports, leaderboard, goals |
| 5 | `backend/prisma/schema.prisma` | Database schema - all 6 models with relations |
| 6 | `backend/src/middleware/auth.js` | JWT verification - protects all API routes |
| 7 | `frontend/src/app/login/page.tsx` | Login/signup UI - role toggle, form validation |
| 8 | `frontend/src/context/AuthContext.tsx` | Auth state - login/signup/logout/refresh functions |
| 9 | `frontend/src/lib/api.ts` | HTTP client - every page imports this |
| 10 | `frontend/src/context/DarkModeContext.tsx` | Theme toggle - localStorage persistence |
| 11 | `frontend/src/components/Shell.tsx` | Layout wrapper - sidebar, notifications, theme toggle |
| 12 | `frontend/src/components/Sidebar.tsx` | Navigation - role-based menu, photo upload, semester filter |
| 13 | `frontend/src/app/teacher/session/[id]/page.tsx` | Session control - start/end session, QR gen, live view |
| 14 | `frontend/src/app/student/scan/[id]/page.tsx` | QR scan flow - scan, photo capture, location, submit |
| 15 | `frontend/src/app/student/overview/page.tsx` | Student overview - charts, heatmap, attendance summary |
| 16 | `frontend/src/app/teacher/announcements/page.tsx` | Announcement CRUD - create, list, delete |
| 17 | `frontend/src/app/teacher/subjects/page.tsx` | Subject management - faculty code, auto-populate |
| 18 | `frontend/src/app/teacher/student-report/[classId]/page.tsx` | Student reports - filters, bulk correct, CSV export |
| 19 | `frontend/src/app/settings/page.tsx` | Settings - profile update, photo, password, delete |
| 20 | `frontend/src/app/student/goals/page.tsx` | Goals - what-if calculator, per-subject tracking |

### Top 30 Most Important Functions

| Rank | Function | File | Why Important |
|------|----------|------|---------------|
| 1 | `api()` | `frontend/src/lib/api.ts` | Every API call goes through this |
| 2 | `login()` | `AuthContext.tsx` | User authentication |
| 3 | `signup()` | `AuthContext.tsx` | User registration |
| 4 | `logout()` | `AuthContext.tsx` | Session termination |
| 5 | `refreshUser()` | `AuthContext.tsx` | Re-fetch user state |
| 6 | `auth` middleware | `backend/middleware/auth.js` | JWT verification for all routes |
| 7 | `sign()` | `backend/routes/auth.routes.js` | JWT token creation |
| 8 | `startSession()` | `teacher/session/[id]/page.tsx` | Begin class session |
| 9 | `generateQR()` | `teacher/session/[id]/page.tsx` | QR code generation flow |
| 10 | `finishSession()` | `teacher/session/[id]/page.tsx` | End class session |
| 11 | `onQrScanned()` | `student/scan/[id]/page.tsx` | Process scanned QR data |
| 12 | `POST /mark` handler | `backend/routes/session.routes.js` | Core attendance marking logic |
| 13 | `makeQr()` | `backend/services/qr.js` | QR token + image generation |
| 14 | `distanceMeters()` | `backend/services/geo.js` | Haversine GPS distance calc |
| 15 | `compressImage()` | `Sidebar.tsx`, `settings/page.tsx` | Image compression before upload |
| 16 | `handlePhotoUpload()` | `Sidebar.tsx` | Profile photo upload flow |
| 17 | `calcStreak()` | `backend/routes/data.routes.js` | Consecutive day streak calc |
| 18 | `handleBulkCorrect()` | `teacher/student-report/[classId]/page.tsx` | Bulk attendance marking |
| 19 | `deleteAnnouncement()` | `teacher/announcements/page.tsx` | Delete with error handling |
| 20 | `createAnnouncement()` | `teacher/announcements/page.tsx` | Create + notify students |
| 21 | `fetchUnread()` | `Shell.tsx` | Notification unread count poll |
| 22 | `markRead()` | `Shell.tsx` | Individual notification read |
| 23 | `markAllRead()` | `Shell.tsx` | Bulk notification read |
| 24 | `toggle()` in DarkModeContext | `DarkModeContext.tsx` | Dark/light theme switch |
| 25 | `handleCodeInput()` | `teacher/subjects/page.tsx` | Faculty code autocomplete |
| 26 | `selectAll()` / `deselectAll()` | `teacher/bulk-attendance/[id]/page.tsx` | Bulk select helpers |
| 27 | `handleSidebarSemesterChange()` | `Sidebar.tsx` | Teacher semester filter |
| 28 | `exportAttendance()` | `teacher/qr/[id]/page.tsx` | CSV export generation |
| 29 | `needsSetup()` | `AuthContext.tsx` | Academic setup check |
| 30 | `POST /announcements` handler | `backend/routes/announcement.routes.js` | Create + notification creation |

---

## 14. TEACHING MODE - Beginner-Friendly Explanations

### "What is a JWT Token?"

Imagine a JWT token like a **wristband** at a concert:
- You buy a ticket (login with email/password) → you get a wristband (JWT token)
- The wristband has your name and seat number encoded (user ID, role)
- The wristband expires at midnight (7 days)
- Every time you want to enter a restricted area (access an API), you show your wristband
- The security guard (auth middleware) checks: does the wristband look real? Is it expired? If yes, you can enter
- You can't just print a fake wristband because they're cryptographically signed (JWT secret)

In the code:
```js
// Creating the wristband (login)
function sign(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Checking the wristband (auth middleware)
function auth(req, res, next) {
  const h = req.headers.authorization;  // "Bearer <wristband>"
  try {
    req.user = jwt.verify(h.replace("Bearer ", ""), process.env.JWT_SECRET);
    next();  // OK, let them in
  } catch {
    res.status(401).json({ message: "Invalid token" });  // Fake wristband!
  }
}
```

### "How does the login flow work?"

1. User types email and password in the login page
2. User clicks "Sign in" button
3. React calls `login(email, password, role)` from AuthContext
4. AuthContext calls `api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) })`
5. `api()` function in `lib/api.ts` does `fetch('http://localhost:4000/api/auth/login', { body: ..., headers: ... })`
6. Backend receives request at `auth.routes.js`
7. Backend looks up user in database:
   - If student: `prisma.user.findFirst({ where: { rollNumber: email } })`
   - If teacher: `prisma.user.findUnique({ where: { email } })`
8. Backend checks password with `bcrypt.compare(password, user.password)`
9. If correct: creates JWT token, returns `{ token, user }`
10. Frontend saves token to `localStorage.setItem('edutrack_token', d.token)`
11. Frontend saves user to `localStorage.setItem('edutrack_user', JSON.stringify(d.user))`
12. Frontend updates React state: `setUser(d.user)`
13. Frontend redirects: student → `/student/dashboard`, teacher → `/teacher/dashboard`

### "How does a teacher start a session and generate a QR code?"

```
Teacher clicks "Start Session"
  → POST /api/sessions/{classId}/start
  → Session created with status "ACTIVE"
  → UI shows "Live" status

Teacher clicks "Generate QR"
  → Browser asks: "Allow location access?"
  → If YES:
      → navigator.geolocation.getCurrentPosition(success)
      → success callback fires with { coords: { latitude, longitude } }
      → POST /api/sessions/{sessionId}/qr with teacherLat, teacherLng
  → If NO/DENIED:
      → error callback fires
      → POST /api/sessions/{sessionId}/qr WITHOUT coordinates (location verification skipped)
  
Backend receives QR request:
  → crypto.randomBytes(32) → 64-character hex token
  → qrcode.toDataURL(token) → PNG image as base64 string
  → Sets session: status="QR_ACTIVE", qrToken=token, qrExpiresAt=5min
  → Returns { qrDataUrl: "data:image/png;base64,...", qrExpiresAt, ... }

Teacher's screen shows:
  → QR image (students scan this)
  → Countdown timer (5:00, 4:59, 4:58...)
  → Live attendance count (updates in real-time)
```

### "How does a student scan and mark attendance?"

```
Student clicks "Mark Attendance" on today's class
  → Navigates to /student/scan/{sessionId}
  → Camera activates (html5-qrcode library)

Step 1 - SCAN QR:
  → Phone camera scans the QR on teacher's screen
  → QR decoded to: "{ sessionId: "...", token: "..." }"
  → Validates: decoded sessionId matches URL param
  → Advances to Step 2

Step 2 - TAKE PHOTO:
  → Webcam activates (getUserMedia API)
  → Student sees themselves on screen
  → Auto-captures frame after 3 seconds
  → Draws video frame onto canvas
  → Converts to JPEG data URL: "data:image/jpeg;base64,..."
  → Shows preview

Step 3 - LOCATION:
  → Browser asks: "Allow location access?"
  → If allowed: gets lat + lng
  → Shows "Location captured" or "Location unavailable"

Step 4 - CONFIRM:
  → Shows: Student name, Photo preview, Location status
  → Student clicks "Confirm & Mark Attendance"

Step 5 - SUBMIT:
  → POST /api/sessions/mark
  → Body: { sessionId, token, lat, lng, photo }
  
Backend processes:
  → Find session by sessionId
  → Check: session status === "QR_ACTIVE"?
  → Check: provided token === stored qrToken?
  → Check: current time < qrExpiresAt?
  → If location provided: calculate distance (teacher vs student)
  → If distance ≤ 100m: locationVerified = true
  → Upsert attendance record (create or update)
  → Emit Socket.IO event: "attendance:count" to teacher's room
  → Return success

Student sees: ✅ "Attendance marked successfully!"
Teacher sees: Live count increments by 1
```

### "How does the real-time Socket.IO work?"

Think of Socket.IO like a **walkie-talkie** instead of a telephone:
- Telephone (normal HTTP): You call, someone answers, you talk, you hang up. Every time you need to talk, you call again. This is like fetch().
- Walkie-talkie (Socket.IO): You turn it on, you're connected continuously. When someone speaks, everyone on the same channel hears immediately. No need to call again.

```
Server setup (backend/server.js):
  const io = new Server(server)  // Create the walkie-talkie system
  io.on("connection", (socket) => {  // Someone turned on their walkie-talkie
    socket.on("join:session", (id) => socket.join(id));  // Join a channel (room)
  });

Teacher connects (teacher/session/[id]/page.tsx):
  const socket = io(API)     // Turn on walkie-talkie
  socket.emit("join:session", session.id)  // Join channel "{session.id}"

Student marks attendance (backend/session.routes.js):
  req.app.get("io").to(sessionId).emit("attendance:count", data)
  // Broadcast on channel "{sessionId}": "Someone just marked attendance!"

Teacher receives (teacher/session/[id]/page.tsx):
  socket.on("attendance:count", async () => {
    const d = await api(`/api/sessions/${session.id}/count`);
    setAttendanceCount(d.count);  // Update the display
  });
  // Teacher's screen updates without refreshing!
```

---

*End of walkthrough. Good luck with your presentation! 🎯*
