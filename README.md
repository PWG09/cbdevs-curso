# CBDEVS Cursos V7

Next.js + Firebase course platform. Uses the existing Firebase project `cbdev-a74dc` and existing `users/{uid}` documents from cbdevs-admin.

## Roles
- admin: full course/content administration and enrollments
- empleado: course/content administration and enrollment viewing/creation
- cliente: self-registration, enrolled courses and progress

## Setup
1. Copy `.env.example` to `.env.local` and fill the Firebase Web App values.
2. Enable Email/Password and Google in Firebase Authentication as desired. Google login UI is not included in this MVP yet; email/password is fully wired.
3. Merge `firestore.rules` with the production rules currently used by cbdevs-admin; do not blindly replace unrelated production rules.
4. `npm install`
5. `npm run dev`

Cloud Functions are not required by this V7 build.
