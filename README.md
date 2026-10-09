# CBDEVS Cursos

Plataforma de cursos estructurados de CBDEVS. Esta rama migra el acceso a datos y autenticación desde Firebase hacia el proyecto Supabase central compartido con CBDEVS Admin, Web y Client Portal.

## Central Supabase

- Project reference: `rpfupihdsqxprhptxypv`
- Browser variables: `NEXT_PUBLIC_CBDEVS_SUPABASE_URL` and `NEXT_PUBLIC_CBDEVS_SUPABASE_ANON_KEY`
- Use only the publishable/anon key in the browser. Never expose a service-role key.
- Course tables: `cbdevs_courses`, `cbdevs_course_phases`, `cbdevs_course_lessons`, `cbdevs_exercise_solutions`, `cbdevs_course_enrollments`, `cbdevs_course_progress`.
- Storage bucket: `cbdevs-course-assets` (private; signed URLs expire after one hour).

Access is determined from Supabase Auth, organization membership, the enabled `courses` app, and active course enrollment. A signed-in user is not automatically staff. RLS enforces tenant boundaries.

## Roles

- `owner` / `admin`: mapped to the UI's `admin` role.
- `manager`: mapped to the UI's `empleado` role.
- Enrolled or newly registered learners: UI `cliente` role.
- Public registration never grants staff privileges.

## Content

Course → Phases → Lessons → Blocks. Blocks support text, video, code, exercises, quizzes, and downloadable resources. Exercise solutions are visible to course staff; learners only see solutions marked released.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_CBDEVS_SUPABASE_URL=https://rpfupihdsqxprhptxypv.supabase.co`.
3. Set `NEXT_PUBLIC_CBDEVS_SUPABASE_ANON_KEY` to the publishable/anon key from the central project.
4. In Supabase Auth, configure the production site URL, local redirect URL, email confirmation, password recovery redirects, and Google OAuth only if Google login is enabled.
5. Run `npm install`, `npm run dev`, and `npm run build`.

## Migration status

The central database schema and RLS policies have been applied to the verified central Supabase project. This branch changes the app code to use Supabase Auth, Postgres, and Storage, but it has **not yet been deployed or tested against production users**.

Legacy Firebase data, course assets, enrollments, and user accounts have not been imported. Firebase project/rules are intentionally retained as a rollback source until the migration is validated. Do not delete Firebase resources or change production traffic before data export, account mapping, build tests, RLS/IDOR tests, and sign-in/confirmation/reset-flow tests pass.

DetailFlow, QuoteSnap, and QuoteAI are explicitly excluded from this central project.
