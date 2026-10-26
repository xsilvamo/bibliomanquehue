# Estado del proyecto y punto de continuación

Actualizado: **25 de octubre de 2026**. Este documento distingue la implementación local, lo comunicado por el responsable y las comprobaciones que aún faltan. No contiene credenciales ni copias de datos personales.

## Objetivo y decisiones vigentes

Manquehue conecta el librero físico de Jóvenes Manquehue con una comunidad de lectores. El nombre, lema «Libros que nos acercan a Cristo», identidad católica y manquehuina y estética juvenil en crema, naranjo y madera forman parte del alcance acordado.

El catálogo contiene únicamente libros físicos del librero. El sitio es público; la participación requiere invitación y cuenta Google. Alias, descripción, lista «Quiero leer» y reflexiones aprobadas son públicos. El correo no se publica. No hay PDFs, préstamos, disponibilidad, estrellas ni citas en esta versión.

## Avances y evidencia

| Elemento | Estado | Evidencia o límite |
| --- | --- | --- |
| Aplicación React/TypeScript/Vite | Implementada | Pantallas públicas, cuentas, panel y documentos en el repositorio |
| Repositorio GitHub | Subido por el responsable | `https://github.com/xsilvamo/manquepe` |
| Organización y proyecto Supabase | Creados por el responsable | El proyecto remoto se llama `manquepe`; no publicar contraseña ni tokens |
| Vinculación local por CLI | Utilizada | El responsable ejecutó `supabase db push` sobre el remoto vinculado |
| Migración inicial | Aplicada | Salida compartida: `Applying migration 202610250001_manquepe.sql... Finished supabase db push.` |
| Credenciales Google en Supabase | Configuradas por el responsable | Confirmó haber guardado Client ID y Client Secret; no se documentan sus valores |
| Variables locales de frontend | Presentes | Se comprobó presencia de URL, clave y correo sin imprimirlos; la clave es de tipo `anon` JWT |
| Configuración local de Supabase | Generada por la CLI | Existen `supabase/config.toml` y `supabase/.gitignore`; deben respaldarse |
| Prueba manual del sitio | Realizada por el responsable | Expresó conformidad; no detalló cada recorrido verificado |
| Pruebas automáticas | 32 aprobadas, verificadas nuevamente en esta entrega documental | PostgreSQL/RLS, validaciones, API, navegación y conservación de borradores; variables remotas vacías durante la prueba |
| Compilación | Correcta, verificada nuevamente en esta entrega documental | TypeScript y Vite produjeron `dist/` |
| Smoke test del agente en Chrome | No completado | Restricciones de sockets y Chrome en el entorno inicial |
| Publicación definitiva | No confirmada | No se ha proporcionado una URL pública de Cloudflare Pages |
| GitHub → migraciones Supabase automáticas | Pendiente | No se ha configurado un workflow ni confirmado la integración nativa |

## Configuraciones que se deben verificar al retomar

Las instrucciones fueron entregadas, pero no se confirmó de forma individual el resultado de cada punto:

- Hook Before User Created habilitado con `public.before_user_created`.
- Google habilitado; proveedores de correo/contraseña y acceso anónimo desactivados.
- Site URL y redirecciones coincidentes con la dirección real del sitio.
- Invitación del correo correcto y rol `admin` de al menos un encargado.
- Acceso Google completo, selección de alias y apertura del panel administrativo.
- Corrección del correo de ejemplo que el responsable indicó haber usado por error. Revisar la invitación de ejemplo; no borrarla ni cambiar cuentas reales sin verificar.

El archivo `supabase/config.toml` fue creado para trabajo local y contiene valores iniciales distintos de la web (por ejemplo, puerto 3000). **No es una exportación del panel remoto.** Antes de sincronizar configuraciones o activar integración automática, revisar URL, proveedores y hooks. No sobrescribir la configuración remota con esos valores por defecto.

## Próximos pasos, en orden

1. Respaldar esta documentación y la configuración local no secreta en GitHub.
2. Verificar los puntos de configuración anteriores sin repetir la migración inicial.
3. Elegir cómo automatizar futuras migraciones: integración nativa de Supabase o GitHub Actions. Comprobar disponibilidad, costo y permisos antes de habilitarla. El flujo manual con CLI sigue funcionando.
4. Publicar en Cloudflare Pages y fijar Site URL/redirecciones de producción.
5. Validar textos institucionales y correo de contacto; registrar al menos cinco libros físicos reales.
6. Completar el piloto con 1–2 encargados y 5–10 lectores usando `docs/piloto.md`.
7. Abrir a más invitados después de resolver los fallos del piloto.

## Funciones futuras, sin aprobación de implementación todavía

Citas favoritas separadas, puntuaciones de experiencia de lectura, perfiles más completos y mejoras de descubrimiento. Préstamos, disponibilidad y lectura de PDFs requieren un alcance nuevo; los PDFs también requieren autorización de distribución. No asumir que pertenecen al próximo cambio.

Antes de desarrollar una función nueva, definir propósito, pantallas, permisos, datos/migraciones y pruebas de aceptación. Conservar el flujo de moderación y la privacidad ya acordados.

## Qué necesita quien retome el proyecto

Leer primero este documento, el README y `docs/arquitectura.md`. Después seguir `docs/configuracion.md` y `docs/desarrollo.md`. Consultar el PDF y audio originales para el contexto; las decisiones de alcance de la primera versión están recogidas en el plan inicial.

Los accesos a Supabase, Google Cloud, GitHub y Cloudflare se entregan por un canal privado a sus responsables. No pegar secretos en documentación, issues, commits ni conversaciones de soporte.

## Verificación de esta entrega documental

Se ejecutaron las 32 pruebas con las variables de conexión vacías para aislarlas del proyecto remoto, y `npm run build` terminó correctamente con la configuración local. Se comprobó `git diff --check`, la existencia de los enlaces Markdown relativos y la exclusión de `.env`, `.temp`, bundles y exportaciones privadas. Se revisaron los documentos y la configuración a respaldar sin copiar valores de credenciales a este registro.

No se aplicaron nuevas migraciones ni se modificó la configuración remota durante esta tarea. Los cambios documentales quedan preparados en la carpeta de trabajo; el commit y push se realizan con los comandos de `docs/desarrollo.md`.

## Optimización móvil y subdominio solicitado

El responsable solicitó mejorar el uso en teléfonos y preparar un subdominio de `aaronsilva.site`, alojado en su Cloudflare. Se propone `manquepe.aaronsilva.site`; la activación de Pages, DNS, HTTPS y las redirecciones remotas no está confirmada.

Se añadieron ajustes móviles para campos, objetivos táctiles, encabezados, tarjetas, tablas y navegación, además de cuatro regresiones del menú. El procedimiento de despliegue y verificación está en `docs/dominio-pruebas.md`. La carpeta local `.obsidian/` se mantiene fuera de este cambio. La migración y los datos de Supabase no cambian.

Verificación del cambio móvil: 36 pruebas aprobadas, compilación correcta y revisión de código sin hallazgos importantes. El smoke test real sigue bloqueado por `listen EPERM` en esta sesión; el diseño debe revisarse en dispositivos/navegador al desplegar. El subdominio no se marca como activo hasta verificarlo en Cloudflare.

## Corrección del nombre — 26 de octubre de 2026

El responsable aclaró que «Manquehue» es el nombre correcto del sitio. Se actualizan el logotipo tipográfico del encabezado y pie, navegación, títulos de pestaña, descripción, bienvenida, textos públicos y administrativos y nombres de nuevas exportaciones. La documentación adopta el nombre corregido.

El repositorio, proyecto Supabase, hostname Pages, referencias del subdominio anterior, migración ya aplicada y claves internas de sesión conservan sus identificadores existentes para mantener las conexiones y el historial. Renombrar servicios o direcciones externas requiere una tarea separada y actualizar las redirecciones OAuth. Si Google todavía muestra el nombre anterior en el consentimiento, ajustar el nombre público de la aplicación en Google Auth Platform desde la cuenta responsable.
