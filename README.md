# EDUTrack — Your Academic Life, Simplified

A production-style full-stack attendance management system built with Next.js 14, Tailwind CSS, Express.js, Prisma, Supabase PostgreSQL, Socket.io, and QR codes.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css)
![Express](https://img.shields.io/badge/Express.js-000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase)

---

## Features

### Teacher
- **Dashboard** — 2×2 grid with animated counters for classes, sessions, analytics, low-attendance alerts, timetable view, and announcements
- **Quick Analytics** — Chart.js visualizations with per-subject attendance, session trends, and class performance
- **Today's Classes** — Session management with QR code generation, student scanning, geo-restriction, and real-time socket updates
- **Timetable View** — Weekly schedule display with subject-colored blocks
- **Schedule Input** — Visual grid-based timetable editor with click-to-toggle cells
- **Session Archive** — Past sessions with search and attendance details
- **Bulk Attendance** — Quick mark attendance for entire class
- **Student Report** — Per-student detailed attendance report with progress bars
- **Low Attendance (<75%)** — Students below threshold with sorted list
- **Announcements** — Post class-wide updates with timestamps
- **Clear Attendance** — End-of-semester purge with confirmation flow
- **Profile** — Photo upload via file reader with 2MB limit

### Student
- **Dashboard** — Feature tiles with quick links to overview, calendar, today's classes, leaderboard, and goals
- **Attendance Overview** — Subject-wise attendance with progress bars
- **Today's Classes** — QR code scanning for attendance marking (with camera or file upload)
- **Calendar & What-If Calculator** — Monthly view with attendance prediction for future classes
- **Leaderboard** — Podium layout with real streak calculations, animated counters, gold/silver/bronze medals
- **Goals** — Track attendance targets per subject
- **Subject History** — Detailed session-by-session attendance for each subject

### General
- **Dark Mode** — Full dark mode with toggle, persisted in localStorage, applied across all pages and sidebar
- **Sidebar Navigation** — Role-based nav (teacher/student) with active indicators, compact scrollable design
- **Mobile Responsive** — Hamburger menu overlay on small screens
- **Login Setup Flow** — After login, prompts teacher to select year → semester → subject, and student to select year → department → semester. Redirects on subsequent logins if setup is incomplete.
- **Settings Page** — Academic setup section with year/semester/subject picker, logout
- **Animations** — Framer Motion page transitions, staggered tile reveals, animated number counters

---

## Run

### Prerequisites
- Node.js 18+
- PostgreSQL (Supabase free tier)

### 1) Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### 2) Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

### Demo Logins
| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Teacher | teacher@edutrack.dev     | password123 |
| Student | student@edutrack.dev     | password123 |

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy the pooled PostgreSQL connection string from Project Settings → Database
3. Set it in `backend/.env` as `DATABASE_URL`
4. Run the Prisma commands above to migrate and seed

> Note: Supabase free tier auto-pauses after inactivity. If the DB connection fails, restore from the Supabase dashboard.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable        | Description                          |
|-----------------|--------------------------------------|
| `DATABASE_URL`  | Supabase PostgreSQL connection string |
| `JWT_SECRET`    | Secret key for JWT token signing      |
| `PORT`          | Server port (default: 4000)           |

### Frontend (`frontend/.env.local`)
| Variable                | Description              |
|-------------------------|--------------------------|
| `NEXT_PUBLIC_API_URL`   | Backend API URL (default: http://localhost:4000) |

---

## Project Structure

```
edutrack/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   ├── seed.js                # Seed data
│   │   └── timetable-data.json    # Multi-semester timetable data
│   ├── src/
│   │   ├── routes/                # API routes
│   │   ├── middleware/            # Auth middleware
│   │   ├── services/              # Geo, QR services
│   │   └── server.js              # Express entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages
│   │   │   ├── teacher/           # Teacher pages (9 routes)
│   │   │   ├── student/           # Student pages (8 routes)
│   │   │   ├── login/             # Login/signup page
│   │   │   ├── settings/          # Settings page
│   │   │   └── globals.css        # Global styles
│   │   ├── components/            # Shared components
│   │   │   ├── Shell.tsx          # Page layout wrapper
│   │   │   ├── Sidebar.tsx        # Role-based sidebar nav
│   │   │   ├── BackButton.tsx     # Navigation back button
│   │   │   ├── Charts.tsx         # Chart.js wrapper
│   │   │   └── Loader.tsx         # Loading spinner
│   │   ├── context/               # React context providers
│   │   │   ├── AuthContext.tsx     # Auth + setup flow
│   │   │   └── DarkModeContext.tsx # Dark mode state
│   │   └── lib/                   # API client, auth helpers
│   └── package.json
└── README.md
```

---

## Changelog

### v0.5.0 (2026-07-06)
- Removed Schedule Input and Clear Attendance tiles from teacher dashboard (kept in sidebar nav)
- Cleaned git history: removed node_modules from all commits, pushed clean single-commit history to GitHub
- Updated README with full feature list, roadmap, changelog, and project structure

### v0.4.0 (2026-07-05)
- **Login Setup Flow**: Teacher year → semester → subject picker after auth; Student year → department → semester picker
- **AuthContext**: Redirects to setup on login if year/semester/subject not configured
- **Settings Page**: Academic Setup section with year/semester/subject picker
- **Sidebar**: Compact padding, scrollbar-hide, overflow-y-auto for shorter screens
- **Multi-semester Timetable**: Restructured data container with semester keying

### v0.3.0 (2026-07-04)
- Dark mode on all teacher, student, and login pages
- Loading/empty states on several pages
- Master timetable endpoint + CSE timetable data
- Build error fixes (Set spread, TS syntax in JS files)

### v0.2.0 (2026-07-03)
- Calendar & What-If calculator for students
- Bulk attendance marking for teachers
- Session archive with search
- Profile settings with photo upload
- Export CSV functionality
- Mobile responsive menu

### v0.1.0 (2026-07-02)
- Premium theme with animations, hover effects, polished UI
- QR code session flow for attendance
- Today's classes view
- Timetable grid display

### v0.0.1 (2026-07-01)
- Initial prototype: teacher/student dashboards, basic attendance tracking, leaderboard with streaks

---

## Roadmap

### v0.x — Core (Completed)
- ✅ Teacher dashboard with animated tiles
- ✅ Student dashboard with feature tiles
- ✅ QR code attendance marking
- ✅ Real-time socket updates
- ✅ Leaderboard with streak tracking
- ✅ Subject-wise attendance overview
- ✅ Dark mode across all pages
- ✅ Loading/empty states
- ✅ Login setup flow (year/semester/subject)
- ✅ Multi-semester timetable support

### v1.0 — Stable Release (In Progress)
- [x] Remove deprecated dashboard tiles
- [ ] API error boundary and toast notifications
- [ ] Pagination for session archive
- [ ] Export reports to PDF
- [ ] Full test coverage (backend + frontend)
- [ ] CI/CD pipeline with GitHub Actions

### v1.1 — Enhancements (Planned)
- [ ] Email notifications for announcements
- [ ] Teacher dashboards with per-class analytics
- [ ] Batch/section management for larger cohorts
- [ ] OAuth login (Google, GitHub)
- [ ] PWA support with offline fallback
