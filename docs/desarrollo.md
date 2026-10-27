# Desarrollo, respaldo y continuidad

## Retomar en el mismo equipo

Lee `docs/estado-proyecto.md`, revisa cambios locales con `git status` y conserva `.env`. No copies la plantilla encima de una configuración que ya funciona.

```sh
npm ci
npm run dev
```

Para actualizar desde GitHub, comprueba primero que tus cambios estén respaldados y luego usa `git pull --ff-only`. Si existen divergencias o modificaciones que impiden actualizar, revísalas; no uses reset destructivo ni force push para resolverlas automáticamente.

## Retomar en otro equipo

```sh
git clone https://github.com/xsilvamo/manquepe.git
cd manquepe
npm ci
cp .env.example .env
```

Solicita por un canal privado los valores necesarios y completa `.env`. El repositorio no contiene la sesión del lector ni credenciales. Inicia la web con `npm run dev`.

Si necesitas gestionar migraciones remotas:

```sh
npx supabase login
npx supabase link --project-ref TU_PROJECT_REFERENCE
npx supabase migration list --linked
```

El Project Reference se obtiene del proyecto Supabase de los responsables. No crear una organización/proyecto nuevos por defecto: el existente ya contiene la migración inicial y puede tener datos reales.

## Qué respaldar en GitHub

Incluir código, `package.json`, `package-lock.json`, configuración de compilación, pruebas, documentación, fuentes/licencias, plantilla sin datos, migraciones, `supabase/config.toml` y `supabase/.gitignore`.

Excluir `.env`, claves, tokens, secretos de Google, contraseñas, `node_modules/`, `dist/`, `supabase/.temp/`, `supabase/.branches/`, capturas/resultados temporales y exportaciones con datos de lectores. `.env.example` sí se guarda, con valores vacíos.

La carpeta `respaldos/` contiene un bundle de la primera implementación preparado antes del primer push. Es una instantánea antigua, no un respaldo automático actualizado. El historial de GitHub y los nuevos commits son la referencia para continuar.

### Subir la documentación de esta entrega

Desde la carpeta del proyecto:

```sh
git status --short
git diff --check
git add README.md .gitignore docs/ supabase/.gitignore supabase/config.toml
git diff --cached --stat
git diff --cached --name-only
```

Comprueba que la lista no incluya `.env`, secretos, carpetas `.temp` ni respaldos con datos. Revisa también el contenido preparado con `git diff --cached`. Luego:

```sh
git commit -m "docs: documentar configuración y continuidad de Manquehue"
git push origin main
```

Si trabajas en otra rama, adapta el destino y utiliza una revisión antes de integrar. Si el push indica cambios remotos nuevos, actualiza e integra conservando ambos historiales. No uses `--force`.

Para respaldos futuros, agrega explícitamente los archivos del cambio, revisa lo preparado y escribe un mensaje que describa su efecto. No es necesario reinicializar Git ni volver a agregar el remoto.

## Base de datos: cambios versionados

La migración `202610250001_manquepe.sql` ya fue aplicada al proyecto remoto. Se conserva como historia; no se edita para cambiar una base existente ni se vuelve a pegar en SQL Editor.

Para una función que modifica esquema o permisos:

1. Crea una rama de trabajo y define el comportamiento y sus pruebas.
2. Genera una migración nueva con nombre descriptivo:

```sh
npx supabase migration new nombre_del_cambio
```

3. Escribe el SQL en el nuevo archivo, actualiza la aplicación y agrega pruebas de la nueva conducta y sus permisos. No insertes participantes reales ni secretos en una migración.
4. Prueba primero en un entorno de desarrollo o proyecto de pruebas. Un `--dry-run` muestra qué archivos se aplicarían; **no valida ejecutando todo el SQL**.
5. Revisa historial, proyecto vinculado y contenido pendiente:

```sh
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

6. Después de revisar y respaldar los datos afectados, aplica al proyecto remoto correcto:

```sh
npx supabase db push --linked
```

7. Guarda en Git los archivos de migración, aplicación, pruebas y documentación asociados al mismo cambio.

Los cambios de estructura hechos manualmente en el panel pueden desalinear el historial. Si aparecen conflictos, inspecciona antes de usar `migration repair`, que modifica el registro de migraciones. No uses `db reset` contra un remoto con datos como paso de actualización.

Referencias: [migraciones](https://supabase.com/docs/guides/deployment/database-migrations), [flujo CLI](https://supabase.com/docs/guides/local-development/cli-workflows).

### Límite actual de la suite SQL

`tests/helpers/database.ts` aplica todos los archivos SQL de `supabase/migrations/` ordenados por nombre. `tests/database.test.ts` verifica sus permisos con PostgreSQL/PGlite; `tests/reader-upgrade.test.ts` comprueba la actualización desde datos anteriores. Al agregar una migración, incorpora casos de prueba para la conducta nueva y los permisos afectados.

La infraestructura externa de `auth` y `storage` en estas pruebas es mínima. La suite no certifica el panel alojado, las credenciales de Google ni las políticas/configuraciones que cambies por fuera de las migraciones.

## GitHub y Supabase: automatización pendiente

El repositorio contiene migraciones y el proyecto remoto está vinculado desde una máquina. Esto **no activa por sí solo** sincronización automática entre GitHub y Supabase.

La decisión pendiente es usar la integración nativa de Supabase o GitHub Actions con CLI. Antes de elegir, revisar disponibilidad del plan, costo, permisos, proyecto de pruebas y quién podrá autorizar despliegues a producción. No hay un workflow de despliegue de base de datos en esta entrega.

Al configurarla:

- Fijar una versión de CLI probada para el equipo y el workflow.
- Aplicar solo cambios revisados de `supabase/migrations/` al proyecto correcto.
- Mantener tokens y contraseñas en secretos de automatización; nunca variables `VITE_`.
- Revisar `supabase/config.toml` antes de sincronizar configuración: conserva valores locales iniciales y no es una copia de Auth remoto.
- Separar pruebas/revisión de la ejecución contra producción y verificar historial después de desplegar.
- No incluir exportaciones de datos reales como seeds públicos.

La integración GitHub de Supabase puede sincronizar configuración además de migraciones; no habilitarla suponiendo que solo copia archivos SQL. Referencia: [integración nativa](https://supabase.com/docs/guides/deployment/branching/github-integration).

## Pruebas y comprobaciones

En Linux/macOS, aísla las pruebas del `.env` real:

```sh
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= VITE_CONTACT_EMAIL= npm test
npm run build
```

`npm run test:watch` mantiene Vitest abierto; utiliza las mismas variables vacías si necesitas probar los estados sin configurar. La compilación utiliza la configuración real de `.env` y produce `dist/`, que no se versiona.

El smoke test opcional requiere Chrome/Chromium instalado y permiso para iniciar un servidor local:

```sh
npm run test:e2e
```

Cubre navegación pública y menú móvil, comprueba ausencia de errores JavaScript observados y genera capturas. No automatiza Google, moderación con cuentas reales ni todo el piloto. Si el entorno bloquea los puertos o Chrome, registrar esa limitación y completar las pruebas manuales en un equipo adecuado.

Los casos de aceptación de comunidad y administración están en `docs/piloto.md`. Una prueba general del sitio no marca automáticamente esos casos como verificados.

## Publicar en Cloudflare Pages

1. Conecta el repositorio GitHub de Manquehue a un proyecto de Cloudflare Pages de los responsables.
2. Configura rama de producción `main`, comando `npm run build`, salida `dist` y Node.js 22 o posterior.
3. Agrega `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_CONTACT_EMAIL` como variables de compilación. No agregues el Client Secret de Google ni claves administrativas.
4. Publica y registra la URL real en `docs/estado-proyecto.md` cuando esté verificada.
5. En Supabase actualiza Site URL al origen HTTPS publicado y autoriza su `/entrar`. Conserva en Google la Callback URL de Supabase; no la reemplaces por `/entrar` de la web.
6. Prueba abrir directamente y recargar `/biblioteca`, una ficha, `/entrar` y `/admin`. El archivo `public/_redirects` configura el fallback SPA; `public/_headers` aporta cabeceras de seguridad.
7. Comprueba Google, permisos, cuenta administrativa, correo de contacto, portadas y accesibilidad en los dispositivos del piloto.
8. Valida los textos institucionales y el inventario real antes de compartir con más lectores.

Cambiar variables VITE requiere recompilar. Un cambio de esquema necesita una migración en Supabase; desplegar el frontend no la aplica automáticamente mientras no exista esa automatización.

## Tres respaldos diferentes

| Respaldo | Qué conserva | Qué no conserva |
| --- | --- | --- |
| GitHub | Código, documentación, historial y migraciones | Datos cargados, usuarios, secretos y portadas subidas |
| Exportación/volcado de Supabase | Datos según la herramienta y alcance elegido | No asumir que incluye archivos de Storage ni secretos/configuración externos |
| Storage | Archivos binarios de portadas | Usuarios, permisos y filas de la base de datos |

Sigue `docs/guia-encargados.md` para respaldar y recuperar contenido. Conserva también un registro privado de responsables y acceso a servicios. Una recuperación completa debe probarse fuera de producción antes de depender de ella.
