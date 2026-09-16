## V6.2 / 1.0.8

- Fixed TypeScript `unknown` → `ReactNode` errors in lesson video descriptions in both the instructor preview and student lesson view.
- Fixed Firestore permission recursion when loading `users/{uid}`: users can now read their own profile directly, allowing the role to be resolved before role-based rules are evaluated.

# CBDEVS Courses V6

Plataforma de cursos grabados con Next.js + Firebase.

## Autenticación y roles

La app de cursos usa el mismo proyecto Firebase que `cbdevs-admin`.

Fuente de identidad:

```text
Firebase Authentication UID
        =
Firestore users/{uid}
```

La colección existente es `users` y el esquema compatible es:

```ts
{
  active: boolean,
  createdAt: Timestamp,
  email: string,
  name: string,
  role: "admin" | "empleado" | "cliente"
}
```

Reglas de creación de cuentas:
- `admin`: se crea únicamente desde `cbdevs-admin`.
- `empleado`: se crea únicamente desde `cbdevs-admin`.
- `cliente`: puede registrarse desde esta app; siempre se crea con `role: "cliente"`.
- La app de cursos no contiene gestión de usuarios ni un endpoint para crear admins/empleados.

El login con email/contraseña funciona para los tres roles. Google también respeta un perfil existente; si el UID todavía no tiene documento `users`, se crea únicamente como `cliente`.

La recuperación de contraseña usa Firebase Authentication.

## Protección

- Las rutas de dashboard requieren autenticación y un documento válido en `users/{uid}`.
- `/courses` está disponible para los tres roles, pero el cliente solo carga cursos inscritos.
- `/courses/*` (excepto `/courses`) y `/courses/new` son solo para admin/empleado.
- `/students` es para admin/empleado.
- Firestore Security Rules vuelven a validar el rol y la inscripción; ocultar la UI no es la única protección.

## Editor de cursos

Jerarquía:
`Curso > Fases > Lecciones > Bloques`

Bloques:
- Texto/lectura
- Video
- Código
- Ejercicio práctico
- Quiz
- Recurso descargable

Incluye autoguardado, vista previa, reordenamiento, duplicado/eliminación y Firebase Storage.

## Ejecutar

Configura `.env.local` con las variables Firebase del mismo proyecto que `cbdevs-admin`.

```bash
npm install
npm run build
npm run dev
```

### Importante: proyecto Firebase compartido

`cbdevs-admin` y esta app usan el mismo proyecto Firebase. Por eso **no debes desplegar `firestore.courses.rules` ni `storage.courses.rules` como reemplazo directo de las reglas actuales**: el reemplazo podría afectar colecciones que pertenecen a `cbdevs-admin`.

Los archivos `firestore.courses.rules` y `storage.courses.rules` contienen las reglas necesarias para la parte de cursos y deben **integrarse/mezclarse con las reglas existentes del proyecto** antes de desplegarlas.

La app de cursos no incluye ninguna API de creación de usuarios admin/empleado ni Firebase Admin SDK.
