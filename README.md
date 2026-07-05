# EDUTrack – Your Academic Life, Simplified

Production-style full-stack attendance system using Next.js, Tailwind, Express, Prisma, Supabase PostgreSQL, Socket.io, Chart.js, face-api.js, and QR codes.

> Note: The Figma link could not be fetched from this environment, so the UI implements the requested sidebar/workflow with a calm modern palette and can be adjusted to pixel-match once exported Figma assets/screens are available.

## Run

### 1) Backend terminal
```bash
cd edutrack/backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### 2) Frontend terminal
```bash
cd edutrack/frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

Demo logins:
- Teacher: teacher@edutrack.dev / password123
- Student: student@edutrack.dev / password123

## Supabase setup
Create a Supabase project, copy the pooled PostgreSQL connection string into `backend/.env` as `DATABASE_URL`, then run the Prisma commands above.
