# CBDEVS Cursos

Plataforma de cursos estructurados de CBDEVS (Next.js App Router + TypeScript + Tailwind + Supabase Auth/Postgres/RLS/Storage). Comparte el proyecto Supabase central y la identidad visual con CBDEVS Admin, Web y Client Portal. Firebase no se usa ni debe reintroducirse.

## Funciones

**Alumnos**
- Registro (contraseña ≥ 12 caracteres, confirmación por correo), inicio de sesión con correo o Google y recuperación de contraseña completa en `/reset` (solicitud y nueva contraseña).
- *Mis cursos*: cursos inscritos y publicados con portada, avance y botón “Continuar” a la siguiente lección pendiente.
- Vista del curso con temario por fases, lecciones completadas y siguiente lección.
- Reproductor de lección: lectura, video (YouTube/Vimeo/https), código con resaltado y copiar, ejercicios con solución liberada, quizzes con retroalimentación y recursos descargables (URLs firmadas de 1 h). Temario lateral, anterior/siguiente y “Completar y continuar”.
- *Mi cuenta*: nombre visible y cambio de contraseña.

**Equipo (owner/admin/manager con la app `courses`)**
- Cursos: búsqueda, filtros, métricas, creación como borrador, portada, publicar/despublicar (requiere al menos una lección).
- Temario en una sola pantalla: fases y lecciones con edición, reordenamiento atómico y eliminación con confirmación (solo admin).
- Editor de lecciones con autoguardado, aviso de cambios sin guardar, vista del alumno, duplicar/mover bloques y soluciones de ejercicios guardadas aparte.
- Inscripciones por correo de la cuenta del alumno, baja y reactivación.
- Alumnos: avance por alumno y curso, última actividad, búsqueda y filtro.

## Base de datos

Tablas: `cbdevs_courses`, `cbdevs_course_phases`, `cbdevs_course_lessons`, `cbdevs_exercise_solutions`, `cbdevs_course_enrollments`, `cbdevs_course_progress`. Bucket privado `cbdevs-course-assets` (JPG/PNG/WebP/PDF/TXT/ZIP, 10 MB; no admite video — los videos se enlazan desde YouTube/Vimeo).

Requiere la migración `20261022233000_cbdevs_courses_enrollment_and_ordering.sql` del repositorio **cbdevs-database** (RPCs `cbdevs_enroll_course_student` y `cbdevs_swap_course_item_order`). Sin ella, inscribir y reordenar muestran “Falta aplicar una actualización de base de datos”.

## Seguridad

- Toda autorización la aplica Postgres (RLS); los guardias de ruta son solo UX.
- El HTML de las lecciones se sanitiza con DOMPurify (lista blanca, solo enlaces `https:`/`mailto:`) al pegar, al guardar y al mostrar.
- Videos: hosts exactos y IDs validados; iframes con `sandbox`. Enlaces externos solo `https` sin credenciales.
- Las soluciones nunca se guardan en `blocks` (legible por alumnos); viven en `cbdevs_exercise_solutions` y RLS solo entrega las liberadas.
- Los errores de base de datos se muestran con mensajes propios, sin filtrar nombres de tablas o políticas.
- Encabezados: CSP (origen de Supabase tomado de la variable de entorno), HSTS, `X-Frame-Options: DENY`, `nosniff`.
- Las respuestas de los quizzes van al navegador: sirven para práctica, no para evaluaciones calificadas.

## Desarrollo

```bash
cp .env.example .env.local   # completa la clave pública
npm ci
npm run dev
npm run check   # lint + typecheck + pruebas
npm run build
```

En Supabase Auth configura Site URL y redirecciones para `/my-courses` y `/reset`, la confirmación por correo y Google solo si se usa.
