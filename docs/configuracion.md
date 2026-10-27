# Configuración de Supabase, Google y acceso inicial

## Proyecto existente: por dónde continuar

El proyecto remoto `manquepe` ya existe y recibió la migración inicial. **No repetirla en SQL Editor.** Verifica el historial con la CLI y completa solo los ajustes que falten.

Para vincular una copia nueva de la carpeta:

```sh
npx supabase login
npx supabase link --project-ref TU_PROJECT_REFERENCE
npx supabase migration list --linked
```

El Project Reference es el identificador de `https://supabase.com/dashboard/project/IDENTIFICADOR`; no es el nombre `manquepe` ni una contraseña. Sustituye el marcador antes de ejecutar. La CLI puede pedir la contraseña de la base de datos: introdúcela únicamente en su solicitud local.

`supabase/.temp/` mantiene información local de la vinculación y está ignorado por Git. Otra máquina debe vincularse de nuevo. No necesita Docker para este flujo de vinculación y aplicación de migraciones remotas; levantar el stack completo local sí requiere un runtime compatible.

## Instalación en un proyecto remoto nuevo

Solo para recrear Manquehue en otro proyecto nuevo y vacío:

1. Crea el proyecto en Supabase bajo una cuenta de sus responsables.
2. Clona el repositorio y ejecuta los comandos de vinculación anteriores con el nuevo Project Reference.
3. Comprueba que `supabase/config.toml` existe. Si falta, usa `npx supabase init`; no fuerces una reinicialización de una configuración existente.
4. Revisa y aplica las migraciones:

```sh
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

La migración crea tablas, funciones, políticas RLS y el bucket público `covers` para portadas. No crea libros, usuarios de demostración ni un administrador predefinido.

## Auth y lista de invitaciones

En el panel remoto:

- Mantén permitido el registro para que Google pueda crear cuentas invitadas.
- Habilita Google y desactiva correo/contraseña y accesos anónimos.
- En Authentication → Hooks, configura Before User Created, tipo PostgreSQL, esquema `public`, función `before_user_created`, y habilítalo.

La lista `invitations` restringe las altas. Además del hook, un trigger de base de datos impide crear usuarios no invitados. No uses «desactivar todos los registros» como sustituto de la lista: bloquearías también a los invitados.

Referencia: [Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks).

## Google Cloud y proveedor Google

El responsable ya indicó que guardó Client ID y Client Secret en Supabase. Para revisar o recrear esa configuración:

1. En Google Cloud, configura la pantalla de consentimiento de Manquehue y crea un cliente OAuth de tipo Aplicación web.
2. Usa audiencia externa si participarán cuentas personales de Google. Si está en modo de prueba, incluye las cuentas de prueba correspondientes.
3. En URI de redirección autorizados del cliente Google, utiliza exactamente la Callback URL mostrada por Supabase:

```text
https://TU_PROJECT_REFERENCE.supabase.co/auth/v1/callback
```

4. Guarda Client ID y Client Secret en el proveedor Google del panel de Supabase. No en GitHub ni en el `.env` del frontend.
5. Guarda y habilita el proveedor. Mantén el flujo OAuth estándar; no actives opciones de omisión de verificaciones para resolver un error de configuración.

La Callback URL de Google devuelve la respuesta a Supabase. Es diferente de las Redirect URLs de la aplicación, que determinan a dónde vuelve el lector después.

Referencia: [Google con Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Direcciones de retorno de la web

Para desarrollo, en Authentication → URL Configuration:

```text
Site URL: http://127.0.0.1:5173

Redirect URLs:
http://127.0.0.1:5173/entrar
http://localhost:5173/entrar
```

Si Vite utiliza otro puerto, debes autorizar su dirección exacta. Mantén el mismo origen al iniciar Google y al volver: el verificador PKCE se conserva en la sesión de ese navegador.

Después de publicar, cambia Site URL al origen HTTPS definitivo y agrega `https://TU-SITIO.pages.dev/entrar` o su dominio real. Puedes mantener las dos direcciones locales para desarrollo; no uses comodines amplios de producción.

Referencia: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Variables del frontend

En un equipo nuevo, crea `.env` a partir de `.env.example` solo si aún no existe. Completa los valores localmente:

```env
VITE_SUPABASE_URL=https://TU_PROJECT_REFERENCE.supabase.co
VITE_SUPABASE_ANON_KEY=REEMPLAZAR_POR_LA_CLAVE_ANON_JWT
VITE_CONTACT_EMAIL=REEMPLAZAR_POR_EL_CORREO_DE_CONTACTO
```

La URL y clave se obtienen del diálogo Connect o de Settings → API Keys. Para el cliente REST actual utiliza **legacy `anon` JWT**. No uses `service_role`, claves `sb_secret_...`, tokens personales ni el secreto de Google.

La clave `anon` es pública y los permisos efectivos dependen de RLS y del JWT del lector. Las claves nuevas `sb_publishable_...` se envían solo en `apikey`; el cliente actual también pone su clave en `Authorization` sin sesión, por lo que esa sustitución requiere un cambio de código y pruebas. No rotar ni cambiar el tipo de clave como parte de esta documentación.

Reinicia `npm run dev` después de editar `.env`. En producción, las variables se fijan al compilar: cambiar el panel del alojamiento requiere generar un despliegue nuevo.

Referencia: [Claves de API](https://supabase.com/docs/guides/getting-started/api-keys).

## Primer encargado: ejemplos que exigen reemplazar el correo

Los bloques siguientes se ejecutan en SQL Editor, con privilegios del responsable. Cada bloque se detiene si no has cambiado el marcador, para evitar repetir el error del correo de ejemplo.

**Autorizar el correo antes del primer acceso:**

```sql
do $$
declare
  correo text := 'REEMPLAZAR_POR_TU_CORREO_REAL';
begin
  if correo = 'REEMPLAZAR_POR_TU_CORREO_REAL' then
    raise exception 'Reemplaza el marcador por el correo real de tu cuenta Google.';
  end if;
  insert into public.invitations(email)
  values (lower(btrim(correo)))
  on conflict(email) do update set active = true;
end;
$$;
```

Después, abre `/entrar`, usa esa cuenta Google y completa nombre y apellido en `/mi-espacio` para formar el alias público.

**Asignar el rol después de crear la cuenta:**

```sql
do $$
declare
  correo text := 'REEMPLAZAR_POR_TU_CORREO_REAL';
begin
  if correo = 'REEMPLAZAR_POR_TU_CORREO_REAL' then
    raise exception 'Reemplaza el marcador por el correo de la cuenta que ya ingresó.';
  end if;
  update public.memberships
  set role = 'admin'
  where user_id = (
    select id from auth.users where lower(email) = lower(btrim(correo))
  );
  if not found then
    raise exception 'No se encontró la cuenta. Primero ingresa con Google y prepara el perfil.';
  end if;
end;
$$;
```

Actualiza la página y abre `/admin`. Repite con el correo del segundo encargado si corresponde. No guardes correos reales de participantes ni asignaciones administrativas dentro de una migración pública.

Si por error se autorizó `tu-correo@gmail.com`, revisa esa fila en `public.invitations`. Si efectivamente es el marcador accidental y nadie lo utiliza, revócala o elimínala y autoriza la cuenta correcta. Un UPDATE de rol que no encontró usuario no asignó permisos a otra cuenta por sí solo.

## Configuración local y configuración remota

`supabase/config.toml` es el archivo local generado por `supabase init`, con valores por defecto. No contiene automáticamente los cambios hechos en el panel remoto y su `project_id` local no reemplaza el Project Reference del proyecto alojado.

Antes de usar `supabase config push` o permitir sincronización de configuración mediante GitHub, revisar y alinear proveedores, URL y hook. Aplicar migraciones con `db push --linked` y sincronizar la configuración de Auth son operaciones distintas.
