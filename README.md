# CBDEVS Cursos V8

Plataforma de cursos grabados/estructurados para CBDEVS. Usa el mismo Firebase project que `cbdevs-admin` (`cbdev-a74dc`) y reutiliza exactamente `users/{uid}`.

## Roles
- `admin`: administración de cursos, fases, lecciones, bloques e inscripciones; lectura de alumnos.
- `empleado`: creación/edición de contenido y lectura de alumnos inscritos; no crea cuentas ni administra inscripciones.
- `cliente`: único rol de auto-registro; solo puede abrir cursos con inscripción activa y guardar su propio progreso.

Admin y empleado se crean exclusivamente desde `cbdevs-admin`. La app de cursos nunca crea esas cuentas.

## Auth
- Email/password para los tres roles.
- Google para los tres roles.
- Un Google/email nuevo sin `users/{uid}` se provisiona automáticamente como `cliente` solo durante el flujo de registro/provisionamiento de cliente.
- Un usuario existente sin documento `users/{uid}` no obtiene acceso hasta ser configurado desde `cbdevs-admin`.
- Persistencia de sesión local del navegador.
- Reset de contraseña por Firebase Auth.

## Contenido
Curso → Fases → Lecciones → Bloques.
Bloques: texto enriquecido, video YouTube/Vimeo, código, ejercicio, quiz y recurso descargable.
Las soluciones de ejercicios se guardan en `solutions/{blockId}` y nunca se leen desde la cuenta cliente.

## Instalación
1. Copia `.env.example` a `.env.local` y coloca únicamente las variables Web de Firebase.
2. En Firebase Authentication habilita Email/Password y Google.
3. En Firestore conserva las reglas de producción de `cbdevs-admin` y añade/mergea las reglas de cursos de `firestore.rules`. No borres condiciones existentes que no estén representadas aquí.
4. Si usarás Storage para portadas/recursos, mergea `storage.rules` con tus reglas de Storage existentes.
5. `npm install`
6. `npm run dev`

## Índices
Las consultas actuales usan ordenamiento/where simples. Si Firebase solicita un índice compuesto, el error de Firebase incluirá un enlace para crearlo; no se requiere Cloud Functions.

## V1 excluye
Pagos/Stripe, clases en vivo, Zoom/Meet, agenda, membresías, foro, certificados y code review.
