# Manquepe

**Libros que nos acercan a Cristo.** Web de Jóvenes Manquehue para descubrir los libros de su librero físico y compartir lecturas en comunidad.

La primera versión incluye catálogo, búsqueda, fichas, acceso por invitación con Google, perfiles y listas «Quiero leer» públicos, reflexiones moderadas y panel de encargados. No incluye PDF, préstamos, disponibilidad, estrellas ni citas favoritas.

## Estado y documentación

El código ya está respaldado en [GitHub](https://github.com/xsilvamo/manquepe). El responsable creó la organización y el proyecto `manquepe` en Supabase, aplicó la migración inicial con la CLI y configuró las credenciales del proveedor Google. También probó el sitio y expresó conformidad con el resultado. Esto no equivale a haber completado todos los recorridos del piloto.

| Documento | Para qué sirve |
| --- | --- |
| [Móvil y dominio de pruebas](docs/dominio-pruebas.md) | Publicación propuesta en `manquepe.aaronsilva.site` y ajustes de OAuth |
| [Estado y próximos pasos](docs/estado-proyecto.md) | Avances confirmados, pendientes y punto de continuación |
| [Configuración](docs/configuracion.md) | Supabase, Google, variables y primer administrador |
| [Arquitectura](docs/arquitectura.md) | Pantallas, datos, permisos y flujo de moderación |
| [Desarrollo y respaldo](docs/desarrollo.md) | Retomar en otro equipo, GitHub, migraciones, pruebas y publicación |
| [Guía de encargados](docs/guia-encargados.md) | Libros, invitaciones, moderación y recuperación de datos |
| [Piloto](docs/piloto.md) | Comprobaciones antes de abrir a la comunidad |
| [Textos para validar](docs/contenidos.md) | Borradores institucionales y de convivencia |
| [Plan inicial](docs/superpowers/plans/2026-10-25-manquepe.md) | Alcance y decisiones originales |

## Abrir localmente

Requiere Node.js 22 o posterior y npm. Desde la carpeta del proyecto:

```sh
npm ci
```

Si aún no tienes `.env`, crea una copia de la plantilla. **Si ya existe, conserva sus valores:**

```sh
cp .env.example .env
```

Completa las variables y ejecuta:

```sh
npm run dev
```

Abre la dirección indicada por Vite, normalmente `http://127.0.0.1:5173`. Sin Supabase configurado se pueden recorrer las pantallas públicas y sus estados vacíos, pero no iniciar sesión ni guardar datos.

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL HTTPS del proyecto remoto |
| `VITE_SUPABASE_ANON_KEY` | Clave pública **legacy `anon` JWT**, compatible con el cliente REST actual |
| `VITE_CONTACT_EMAIL` | Correo real de contacto del proyecto |

Nunca incluyas contraseñas, secretos OAuth, tokens personales ni claves `service_role` en `.env` del frontend o en GitHub. Las variables `VITE_` se incorporan al navegador al compilar. El Client Secret de Google se conserva en el proveedor de Supabase.

La implementación REST actual también envía la clave pública como Bearer cuando no hay sesión; por eso este proyecto utiliza `anon` JWT. Cambiar a una clave `sb_publishable_...` requiere adaptar y probar ese manejo de cabeceras primero. Véase [configuración](docs/configuracion.md).

## Verificación

Las pruebas públicas incluyen el caso de sitio sin configurar. Para aislarlas del Supabase real aunque tengas `.env`, ejecuta en Linux/macOS:

```sh
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= VITE_CONTACT_EMAIL= npm test
npm run build
```

La última verificación de esta entrega documental pasó **36 pruebas** y la compilación de producción. La suite SQL ejecuta la migración y sus permisos sobre PostgreSQL mediante PGlite, con infraestructura mínima de Auth y Storage preparada para pruebas. No sustituye la integración con Supabase alojado.

Con Chrome/Chromium instalado y permiso para abrir puertos locales:

```sh
npm run test:e2e
```

El smoke test usa Chrome DevTools y genera capturas en `/tmp/manquepe-escritorio.png` y `/tmp/manquepe-movil.png`. Puedes elegir otro ejecutable con `BROWSER_BIN=/ruta/a/chromium npm run test:e2e`. No descarga navegadores. En la sesión inicial del agente, el entorno bloqueó los sockets y el arranque de Chrome; la prueba manual posterior del responsable se registra por separado en [estado](docs/estado-proyecto.md).

## Cambios en Supabase

La migración `supabase/migrations/202610250001_manquepe.sql` **ya se aplicó al proyecto remoto**. No la ejecutes otra vez pegándola en SQL Editor ni modifiques su contenido para hacer cambios nuevos.

Después de vincular tu carpeta al proyecto, comprueba historial y futuras migraciones con:

```sh
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Para aplicar únicamente las migraciones pendientes revisadas:

```sh
npx supabase db push --linked
```

Usamos `--linked` explícitamente para identificar el destino remoto. La [guía de desarrollo](docs/desarrollo.md) describe cómo crear migraciones nuevas y cómo preparar la futura automatización con GitHub. La integración automática todavía no se ha confirmado.

## Publicación y operación

El destino previsto es Cloudflare Pages: comando `npm run build`, salida `dist`, Node.js 22 o posterior y las tres variables VITE configuradas en el alojamiento. Falta confirmar/publicar la URL final y ajustar las redirecciones de Supabase. Sigue [desarrollo y publicación](docs/desarrollo.md) y después [piloto](docs/piloto.md).

GitHub conserva código y migraciones; los usuarios, libros cargados, reflexiones, secretos y portadas subidas a Supabase requieren respaldos separados. Consulta la [guía de encargados](docs/guia-encargados.md).

Se pretende empezar con planes gratuitos; sus límites se revisan antes de publicar y ampliar el uso. No hay contratación automática de servicios pagados. [Precios de Supabase](https://supabase.com/pricing).

Las fuentes se sirven desde el propio sitio. Sus licencias están en `public/fonts/`.
