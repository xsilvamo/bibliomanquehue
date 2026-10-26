# Manquepe

Web de Jóvenes Manquehue: catálogo del **librero físico**, perfiles públicos, listas «Quiero leer» y reflexiones con moderación. No contiene libros ni testimonios ficticios, préstamos, puntuaciones, PDF ni descargas de libros.

## Abrir localmente

Requiere Node.js 22 o posterior y npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Abre la dirección que imprime Vite. Sin configurar Supabase puedes recorrer las pantallas públicas y los estados vacíos. El acceso con Google permanece deshabilitado: no existe un inicio de sesión de demostración ni una cuenta administrativa incorporada.

Variables públicas de compilación:

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL HTTPS del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública `anon` o publishable, nunca service role |
| `VITE_CONTACT_EMAIL` | Correo real de contacto validado por la comunidad |

**No pongas contraseñas, secretos OAuth ni claves service role en variables VITE.** El cliente usa las APIs REST oficiales de Supabase para Auth PKCE, PostgREST y Storage. El secreto de Google se configura únicamente en Supabase.

## Configurar Supabase y Google

1. Crea un proyecto gratuito de Supabase bajo una cuenta de los responsables.
2. Ejecuta completo `supabase/migrations/202610250001_manquepe.sql` en el SQL Editor. Es una migración inicial, para un proyecto nuevo; no la vuelvas a ejecutar sobre las mismas tablas.
3. En Authentication, desactiva el proveedor de correo/contraseña y los accesos anónimos. Habilita Google. El registro OAuth debe estar permitido: la lista de invitaciones, el hook y el trigger restringen quién puede registrarse.
4. En Auth Hooks configura **Before User Created → PostgreSQL → public.before_user_created**. La función solo puede ejecutarla `supabase_auth_admin`. El trigger también bloquea las cuentas no invitadas si falta el hook, aunque el mensaje puede ser menos amigable.
5. En Google Cloud crea un cliente OAuth de tipo Web para el proyecto. Usa la URL de callback que muestra Supabase, normalmente `https://PROYECTO.supabase.co/auth/v1/callback`. Configura la pantalla de consentimiento y sus usuarios de prueba si está en modo Testing.
6. Copia el Client ID y Client Secret de Google al proveedor Google en Supabase. No los copies al repositorio.
7. En Supabase URL Configuration fija el Site URL final y permite explícitamente las redirecciones `http://localhost:5173/entrar`, `http://127.0.0.1:5173/entrar` y `https://TU-SITIO.pages.dev/entrar`. No uses comodines amplios en producción.
8. Completa `.env` con la URL, la clave pública y el correo. Reinicia Vite o recompila cuando cambien estas variables.

Referencias: [Google con Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Primer encargado

Antes de su primer acceso, autoriza su correo desde el SQL Editor, reemplazando el ejemplo:

```sql
insert into public.invitations(email)
values ('correo-real@gmail.com')
on conflict(email) do update set active=true;
```

La persona entra con Google y elige un alias en `/mi-espacio`. Después, desde el SQL Editor:

```sql
update public.memberships
set role='admin'
where user_id = (
  select id from auth.users where lower(email)='correo-real@gmail.com'
);
```

La persona actualiza la página y abre `/admin`. Repite para el segundo encargado. Los roles se asignan exclusivamente desde SQL, nunca desde un formulario de lectores.

## Verificación

```sh
npm test
npm run build
# Opcional: requiere Chrome/Chromium instalado y permiso para abrir puertos locales
npm run test:e2e
```

Puedes indicar otro ejecutable con `BROWSER_BIN=/ruta/a/chromium npm run test:e2e`. El smoke test usa Chrome DevTools y genera capturas de escritorio y móvil en `/tmp/`; no descarga navegadores.

Las pruebas usan PostgreSQL real mediante PGlite para ejecutar la migración y sus políticas RLS. Solo los esquemas externos `auth` y `storage` se preparan como infraestructura mínima de prueba; se usan los roles `anon`, `authenticated` y `supabase_auth_admin`. No sustituyen una prueba de integración contra Supabase alojado.

Las pruebas también verifican búsqueda sin tildes, importación CSV, límites Unicode, estados vacíos, navegación, privacidad explicada antes del acceso, PKCE y errores de API, y conservación de borradores durante actualizaciones de fondo.

La comprobación de navegador real, con Google y un proyecto Supabase configurado, se realiza con la lista de `docs/piloto.md`. Este entorno de implementación bloquea sockets locales y el arranque de Chrome: no se ha certificado visualmente en un navegador real ni probado OAuth contra credenciales reales.

## Publicar en Cloudflare Pages

1. Guarda el proyecto en un repositorio bajo control de los responsables. Si tu carpeta de trabajo todavía no tiene Git inicializado, inicialízalo o clona el respaldo Git antes de conectar el repositorio.
2. En Cloudflare Pages crea un proyecto conectado a ese repositorio.
3. Configura `npm run build` como comando y `dist` como directorio de salida; Node.js 22 o posterior.
4. Añade las tres variables VITE en la configuración de compilación. Recompila cada vez que cambien.
5. Actualiza Site URL y redirecciones de Supabase con la dirección definitiva `pages.dev` y completa la configuración de Google.
6. Verifica las rutas `/biblioteca`, `/entrar` y `/admin` al abrirlas directamente. `_redirects` permite la navegación SPA y `_headers` configura cabeceras de seguridad para Pages.
7. Sigue `docs/piloto.md` antes de compartir el enlace.

No se ha creado una cuenta externa ni publicado el sitio. Faltan las cuentas/credenciales de los responsables, el inventario real y la aprobación de los textos institucionales.

## Operación y costo

Consulta `docs/guia-encargados.md`. El plan gratuito de Supabase tiene límites y puede pausarse después de una semana de poca actividad. No se implementaron peticiones artificiales para evitar la pausa ni contratación automática de servicios pagados. [Límites y precios oficiales](https://supabase.com/pricing).

La tipografía se sirve desde el propio sitio, sin Google Fonts ni solicitudes de seguimiento. Las licencias de Red Hat Text y Nimbus Roman están en `public/fonts/`.
