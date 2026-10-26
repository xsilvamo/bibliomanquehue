# Arquitectura de Manquehue

## Componentes y límites

Aplicación de una sola página con React 18, TypeScript, Vite y React Router. Se publica como archivos estáticos; no tiene servidor de aplicación propio. Se comunica por HTTPS con Supabase Auth, PostgREST y Storage mediante el cliente REST de `src/lib/backend.ts`.

Supabase proporciona PostgreSQL, acceso Google y almacenamiento de portadas. Los permisos se verifican en la base de datos; ocultar botones o rutas no reemplaza esa autorización. El frontend no necesita una clave administrativa.

Las variables `VITE_` son públicas y se incorporan durante la compilación. Secretos de Google, credenciales de base de datos y tokens para automatización permanecen fuera del frontend.

## Organización del código

| Área | Responsabilidad |
| --- | --- |
| `src/App.tsx` | Rutas y carga diferida del panel administrativo |
| `src/main.tsx` | Arranque, router y recuperación ante errores de renderizado |
| `src/pages/` | Inicio/catálogo/comunidad/información, ficha, cuenta y administración |
| `src/components/` | Navegación, tarjetas, estados, formulario de reflexión e ilustración |
| `src/lib/backend.ts` | Google PKCE, sesión, renovación, consultas REST, RPC y portadas |
| `src/lib/store.tsx` | Datos compartidos, identidad, membresía y actualización sin perder formularios |
| `src/lib/domain.ts` | Tipos, categorías, búsqueda sin tildes, límites y lectura del inventario CSV |
| `src/styles.css` | Identidad visual y adaptación de pantallas |
| `supabase/migrations/` | Evolución versionada de tablas, funciones y permisos |
| `tests/` | Pruebas de permisos SQL, dominio, API, navegación y conservación de borradores |
| `public/` | Fuentes/licencias, favicon, plantilla CSV y reglas de Cloudflare Pages |

## Rutas

| Ruta | Acceso y función |
| --- | --- |
| `/` | Presentación, libros destacados, categorías y reflexiones |
| `/biblioteca` | Catálogo, búsqueda por título/autor y filtro temático |
| `/biblioteca/:id` | Ficha, libros relacionados, lista de lectura y aportes |
| `/reflexiones` | Publicaciones aprobadas y búsqueda |
| `/lectores` y `/lectores/:id` | Alias, perfiles, listas y aportes públicos |
| `/sobre`, `/contacto`, `/convivencia` | Información del proyecto y participación |
| `/entrar` | Acceso Google y retorno de OAuth |
| `/mi-espacio` | Perfil, lista y seguimiento de reflexiones del lector activo |
| `/admin` | Libros, CSV, moderación, invitaciones, lectores y exportación; solo encargados activos |

Las rutas privadas requieren sesión, membresía activa y perfil preparado. La migración verifica los permisos de las operaciones aunque se invoquen directamente desde la API.

## Modelo de datos

La fuente exacta de definiciones es la migración SQL; esta tabla explica su intención.

| Tabla | Datos y visibilidad |
| --- | --- |
| `auth.users` | Identidad administrada por Supabase; no se consulta desde el catálogo público |
| `invitations` | Correos autorizados y estado; consulta útil solo para encargados |
| `profiles` | Alias, descripción e identificador; sin columna de correo ni copia de nombre/foto Google |
| `memberships` | Rol `reader` o `admin` y suspensión; lectura propia o administrativa |
| `books` | Título/edición, autor, categoría, descripción, ISBN, portada, destacado y archivo |
| `reading_list` | Relación lector/libro única; lista pública cuando corresponde al lector activo y libro visible |
| `reflections` | Identidad del aporte y texto aprobado; `body` puede ser nulo antes de la primera aprobación |
| `reflection_submissions` | Versiones, estado, alertas de lenguaje y motivo de rechazo; autor activo y encargados |

Las cinco categorías son Espiritualidad; Biblia y lectio divina; Vida cristiana y formación; Testimonios; Oración y vida monástica.

No se registran copias ni préstamos. El archivo de un libro oculta su ficha del catálogo público y bloquea aportes nuevos; no elimina sus datos.

## Acceso y autorización

1. El encargado autoriza un correo desde el panel o mediante SQL en el alta inicial.
2. Google autentica la cuenta; Supabase utiliza el hook para comprobar la invitación antes de crearla.
3. Un trigger verifica nuevamente la invitación y crea perfil y membresía de lector. El alias comienza vacío.
4. La persona elige explícitamente un alias; no se publica automáticamente información de Google.
5. El navegador guarda la sesión y un verificador PKCE de corta vida para completar OAuth. Renueva tokens cuando corresponde y permite cerrar sesión.
6. Las funciones verifican que la membresía siga activa en cada escritura. Suspender no depende de esperar a que expire un token.

Los roles administrativos iniciales se asignan desde SQL, no desde un formulario controlado por lectores. Las funciones que necesitan privilegios se definen con un `search_path` fijo y permisos de ejecución explícitos. RLS controla las lecturas públicas y privadas.

Las actualizaciones de fondo preservan formularios abiertos. Al cambiar de identidad se descartan datos de la identidad anterior, y se evita aplicar respuestas antiguas sobre solicitudes más recientes.

## Reflexiones y versiones

- Aportes de 1–1500 caracteres Unicode después de recortar espacios; se permiten varios por persona/libro.
- Cada envío crea una versión pendiente; el texto candidato no se guarda en la columna pública.
- El filtro de palabras marca posibles groserías; la publicación depende de una persona.
- Aprobar copia el candidato al texto público. Rechazar requiere un motivo visible para el autor.
- Editar conserva la última versión aprobada mientras se revisa la propuesta.
- Si se reemplaza un candidato pendiente, el anterior pasa a `superseded`. Una versión reemplazada no puede aprobarse desde una pantalla antigua.
- El autor o un encargado autorizado pueden eliminar una reflexión y sus versiones. En la interfaz se pide confirmación para esta eliminación.

Los estados de las versiones son `pending`, `approved`, `rejected` y `superseded`. Las consultas públicas no tienen acceso a la tabla de versiones; las filas de reflexión aún sin texto aprobado tampoco son públicas.

## Interfaces de escritura

Las RPC públicas principales son `save_profile`, `manage_invitation`, `set_member_suspended`, `set_want_to_read`, `submit_reflection`, `moderate_submission`, `delete_reflection` e `import_books`. Sus parámetros exactos están definidos en SQL y en los llamados del frontend; deben evolucionar juntos.

Los libros se crean o editan mediante PostgREST con autorización administrativa. Solo se permite cambiar `featured` directamente en las reflexiones; publicar contenido se hace mediante la función de moderación, no escribiendo `body` desde el navegador.

La importación CSV valida campos, categorías, duplicados y archivos antes de guardar. La inserción del catálogo usa una transacción mediante `import_books`; admite 1–500 registros. Las imágenes ya subidas pueden quedar sin uso si una operación posterior falla: el sistema informa esa situación.

## Portadas, exportaciones y contenido

Storage usa el bucket público `covers`, con escrituras administrativas. Formatos JPG, PNG y WebP, hasta 2 MB por portada. La aplicación admite URLs HTTPS de portadas; un archivo faltante se reemplaza visualmente por una cubierta tipográfica.

Las portadas externas se solicitan al servidor de su URL; para conservarlas bajo control de la comunidad se pueden subir al bucket. Las fuentes e ilustración propia se sirven con el sitio.

La exportación administrativa JSON incluye datos de aplicación, invitaciones y candidatos privados. No incluye usuarios de Auth, imágenes binarias, secretos ni configuración del servicio. GitHub no sustituye ese respaldo.

## Criterios para cambios futuros

Mantener sincronizados tipos, llamadas REST/RPC, validaciones SQL y pruebas. Crear una migración nueva para cada evolución del esquema. Conservar la separación entre texto aprobado y candidato, evitar credenciales privilegiadas en el navegador y comprobar permisos con roles reales en la suite SQL. Las nuevas funciones fuera del alcance inicial necesitan una decisión de producto antes de desarrollarse.
