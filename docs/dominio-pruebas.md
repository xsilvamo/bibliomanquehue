# Móvil y subdominio de pruebas

## Dirección propuesta y estado

Se propone **https://manquepe.aaronsilva.site** como dirección estable de pruebas, usando el dominio `aaronsilva.site` que el responsable indicó tener en Cloudflare. El nombre de subdominio es una propuesta de implementación, no una confirmación de que DNS o HTTPS estén activos.

El código está preparado para Pages. Esta sesión no tiene una conexión a la cuenta Cloudflare ni credenciales de despliegue; no creó un proyecto Pages, registros DNS o un certificado, ni cambió la configuración remota de Supabase. Completar los pasos siguientes desde la cuenta de los responsables y registrar los resultados.

El subdominio usa el mismo proyecto Supabase configurado en las variables de compilación. No crea una base de datos aislada: las pruebas que escriban datos actúan sobre ese proyecto.

## 1. Subir los cambios

Desde la carpeta del proyecto, revisa y respalda los archivos de esta entrega. La carpeta local `.obsidian/` pertenece al usuario: no es parte del cambio y no debe agregarse por accidente.

```sh
git status --short
git diff --check
git add src/components/Layout.tsx src/main.tsx src/mobile.css src/pages/Admin.tsx
git add tests/app.test.tsx scripts/browser-check.mjs index.html public/_headers public/robots.txt .node-version
git add README.md docs/
git diff --cached --stat
git diff --cached --name-only
git commit -m "feat: mejorar experiencia móvil y preparar dominio de pruebas"
git push origin main
```

Se versionan solo archivos revisados. `.env`, secretos, `.temp`, dependencias y datos exportados siguen excluidos.

## 2. Crear o revisar Cloudflare Pages

Si ya existe un proyecto Pages conectado al repositorio, úsalo y revisa estos valores. Si no existe, entra en Cloudflare → Workers & Pages → crear aplicación → Pages → importar/conectar un repositorio Git y selecciona `xsilvamo/manquepe`. Asegúrate de estar creando un proyecto **Pages**, porque el repositorio utiliza su configuración de archivos estáticos y redirecciones.

| Ajuste | Valor |
| --- | --- |
| Repositorio | `xsilvamo/manquepe` |
| Rama de publicación | `main` |
| Directorio raíz | raíz del repositorio |
| Framework | React (Vite), o configuración manual equivalente |
| Comando de compilación | `npm run build` |
| Directorio de salida | `dist` |
| Versión de Node | `22`; el repositorio incluye `.node-version` |

Configura antes de compilar estas variables de entorno de producción del proyecto Pages:

```text
VITE_SUPABASE_URL        → URL HTTPS del proyecto manquepe
VITE_SUPABASE_ANON_KEY   → clave pública legacy anon JWT
VITE_CONTACT_EMAIL      → correo de contacto validado
```

Usa los valores locales que ya funcionan, sin subir `.env`. No pongas Client Secret de Google, `service_role` o contraseñas en variables VITE. Si omites estas variables, el sitio se podrá abrir pero no tendrá acceso funcional a Supabase.

Publica y copia el hostname `pages.dev` que Cloudflare realmente asigne. Puede diferir de `manquepe.pages.dev`; no se presupone disponibilidad del nombre.

Referencias: [React en Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/) y [configuración de compilación](https://developers.cloudflare.com/pages/configuration/build-configuration/).

## 3. Asociar el subdominio

En el proyecto Pages: **Custom domains → Set up a custom domain**. Introduce:

```text
manquepe.aaronsilva.site
```

Si la zona `aaronsilva.site` está activa en la misma cuenta Cloudflare, sigue el asistente para que cree el CNAME correspondiente. Debe asociarse al proyecto Pages; crear únicamente un registro DNS sin esa asociación no completa el despliegue.

Si el asistente solicita un registro manual, el resultado esperado será:

| Campo DNS | Valor |
| --- | --- |
| Tipo | `CNAME` |
| Nombre | `manquepe` |
| Destino | hostname real `<PROYECTO_ASIGNADO>.pages.dev`, sin `https://` ni rutas |
| TTL | automático, salvo indicación específica del asistente |

Si ya existe un registro para `manquepe`, revisa a qué servicio pertenece antes de reemplazarlo. El dominio raíz `aaronsilva.site`, su `www` y los registros de correo no necesitan cambiarse.

Espera a que Cloudflare confirme el dominio como **Active** y la provisión de HTTPS. Después abre `https://manquepe.aaronsilva.site`. No hay una duración de activación garantizada.

Referencia: [dominios personalizados de Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## 4. Autorizar Google desde la nueva dirección

En Supabase → Authentication → URL Configuration:

```text
Site URL:
https://manquepe.aaronsilva.site

Redirect URLs:
https://manquepe.aaronsilva.site/entrar
http://127.0.0.1:5173/entrar
http://localhost:5173/entrar
```

Si también necesitas probar acceso desde `pages.dev`, añade su `/entrar` exacto con el hostname asignado. No necesitas autorizar todas las URLs de previews.

En Google Cloud conserva la Callback URL de Supabase:

```text
https://TU_PROJECT_REFERENCE.supabase.co/auth/v1/callback
```

No la reemplaces por el subdominio web. Si el consentimiento OAuth sigue en modo de prueba, los participantes deben ser usuarios de prueba de Google además de estar invitados en Manquehue.

Para probar OAuth, abre el enlace del subdominio directamente en Safari o Chrome. Los navegadores incrustados de algunas aplicaciones pueden impedir el acceso Google. El mismo origen debe iniciar y completar el flujo PKCE.

Referencia: [redirecciones de Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## 5. Verificar desde un teléfono

- [ ] El dominio aparece activo en Pages y abre con HTTPS.
- [ ] Inicio legible, sin desplazamiento horizontal a 320, 360, 390 y 430 px.
- [ ] Menú abre/cierra, admite desplazamiento en horizontal/pantallas bajas y deja volver al contenido.
- [ ] Se puede buscar y cambiar categorías sin zoom involuntario del teclado.
- [ ] Inicio de sesión Google con cuenta invitada, alias y lista de lectura.
- [ ] Portadas, títulos largos, perfiles y reflexiones no desbordan.
- [ ] Enviar/editar una reflexión funciona sin perder el texto al volver de otra pestaña.
- [ ] Encargados pueden usar el panel y desplazar las tablas lateralmente cuando lo necesitan.
- [ ] Abrir directamente y recargar `/biblioteca`, `/entrar` y una ficha real no produce 404.
- [ ] El dominio raíz personal y el correo siguen resolviendo como antes.

Las reglas de CSS no se certifican por JSDOM. El smoke test de Chrome añade comprobaciones reales de desbordamientos, tamaño de campos y objetivos táctiles en varias anchuras; en el entorno inicial del agente no puede ejecutarse porque los sockets locales están restringidos.

## Cambios móviles incluidos

- Menú para pantallas de hasta 1000 px, cabecera accesible al desplazar y soporte para zonas seguras del dispositivo.
- Fondo de cierre, control de foco y Escape; bloqueo del desplazamiento de fondo mientras el menú está abierto y recuperación al cerrarlo.
- Campos de 16 px y controles táctiles principales de al menos 44 × 44 px.
- Títulos adaptables, botones y tarjetas redistribuidos en teléfonos estrechos; textos largos pueden partirse.
- Tablas con desplazamiento lateral y acceso por teclado; panel y formularios conservan sus funciones.
- Precarga de las dos fuentes principales desde el mismo sitio.

El subdominio de pruebas sigue siendo visitable públicamente. Para evitar indexación accidental, esta entrega incorpora `robots.txt` y `X-Robots-Tag: noindex, nofollow`. Eso no es control de acceso. Antes de abrir a buscadores una versión definitiva, revisar ambas reglas.

## Datos para registrar al terminar

Actualizar `docs/estado-proyecto.md` con el nombre real del proyecto Pages, URL `pages.dev`, subdominio activo, commit desplegado y pruebas realizadas. No guardar capturas con tokens, secretos o datos privados. Hasta disponer de esa evidencia, el dominio se registra como preparado y pendiente de activación.
