# Guía de encargados

Para instalar o retomar el proyecto, consulta [configuración](configuracion.md), [desarrollo y respaldo del código](desarrollo.md) y [estado vigente](estado-proyecto.md). Esta guía describe la operación del contenido y el respaldo de datos.

## Preparar el librero

Descarga `public/inventario-plantilla.csv` o usa «Importar CSV» en Administración → Libros. La plantilla solo contiene encabezados; no hay libros ficticios para borrar.

Campos:

- `titulo`: obligatorio, hasta 200 caracteres.
- `autor`: obligatorio, hasta 200 caracteres.
- `categoria`: exactamente una de las cinco categorías indicadas a continuación.
- `descripcion`: texto propio o autorizado, hasta 3000 caracteres.
- `portada`: nombre exacto de un archivo JPG, PNG o WebP que adjuntarás al importar, o URL HTTPS autorizada. Se puede dejar vacío; la ficha tendrá una cubierta tipográfica de reemplazo.
- `isbn`: opcional, hasta 32 caracteres. Permite distinguir ediciones.

Categorías: Espiritualidad; Biblia y lectio divina; Vida cristiana y formación; Testimonios; Oración y vida monástica.

Guarda el CSV en UTF-8, separado por comas. Encierra entre comillas las descripciones que contengan comas o saltos de línea. Una comilla dentro de un campo se escribe doble. Los duplicados se detectan por título, autor e ISBN. No registres cada ejemplar como un libro diferente: esta versión no gestiona préstamos ni copias.

## Agregar e importar

En Administración → Libros puedes agregar un título, editarlo, destacarlo en el inicio o archivarlo. Archivar lo oculta del catálogo, las listas públicas y las reflexiones públicas; conserva los datos para poder restaurarlo. Los lectores no pueden aportar reflexiones a un libro archivado.

Para importar: selecciona el CSV y los archivos de portada, revisa errores y previsualización y pulsa Importar. Hasta 500 libros y 2 MB por CSV; cada portada admite 2 MB. Si un libro falla, la transacción del catálogo se revierte completa. Las imágenes subidas antes del error pueden quedar sin usar en Storage: se indica en la interfaz y puedes revisarlas desde Supabase. No borres archivos sin comprobar que ninguna ficha los utiliza.

## Invitar y administrar lectores

En Lectores e invitaciones autoriza el correo de Google y comparte el enlace `/entrar` por tu canal habitual. La web no envía correos ni mensajes automáticamente. El lector elige su alias y descripción: no se publica su correo ni se toma automáticamente su nombre de Google.

Revocar una invitación impide crear una cuenta con ese correo, pero no elimina ni suspende a una persona ya registrada. Para eso usa Suspender en Lectores registrados. Una sesión que ya esté abierta tampoco podrá escribir después de la suspensión; sus perfiles, listas y reflexiones dejan de estar disponibles para visitantes. Puedes reactivar al lector después. No puedes suspender tu propia cuenta.

## Moderar reflexiones

Los aportes se muestran en Por revisar. Lee el texto completo y consulta las alertas de lenguaje: son pistas, no una decisión automática. La lista inicial de palabras incluye variantes habituales de groserías chilenas. Para ampliarla, el equipo debe crear una migración nueva que actualice `submit_reflection` y sus pruebas; no editar la migración inicial ya aplicada.

- Aprobar publica el texto en su libro y perfil.
- Rechazar requiere un motivo respetuoso, visible para el autor en Mi espacio.
- Una edición conserva el texto publicado mientras espera revisión.
- Si el autor sustituye un borrador, no puedes aprobar una versión antigua: actualiza la cola y revisa la última.
- En Publicadas puedes destacar un aporte para el inicio o retirarlo. Retirar elimina definitivamente el texto y sus versiones, después de confirmarlo.

## Respaldo y recuperación

Haz una exportación antes de importar o modificar muchos libros y, durante el piloto, al menos una vez por semana. Administración → Respaldo descarga JSON de las tablas de aplicación, incluidas invitaciones y borradores. Guárdalo en un lugar privado con fecha. Descarga además las imágenes del bucket `covers` desde Storage.

El JSON es un respaldo de contenido, no una copia completa del servicio: no incluye cuentas de Supabase Auth, secretos ni configuración de OAuth. Para una recuperación completa del mismo proyecto, utiliza un volcado PostgreSQL mediante las herramientas de Supabase y respalda Storage por separado. Consulta [copias de Supabase](https://supabase.com/docs/guides/platform/backups).

Si necesitas restaurar el contenido JSON, hazlo primero en un proyecto de prueba: aplica la migración, recrea las cuentas invitadas a través de Auth, elabora un mapa entre sus UUID antiguos y nuevos, y carga en orden perfiles/membresías, libros, listas, reflexiones y revisiones con credenciales administrativas fuera del navegador. Restaura portadas y actualiza URLs. No subas el respaldo al repositorio ni intentes restaurarlo desde el cliente público. Una copia SQL completa conserva las relaciones e identificadores y es preferible si está disponible.

## Cuenta eliminada

Si un lector solicita eliminar su cuenta, verifica su identidad y elimina el usuario desde Supabase Authentication. Las claves foráneas eliminan su perfil, membresía, lista y reflexiones. Revoca también su invitación si no debe volver a registrarse. La eliminación es irreversible. Si solo requiere ocultar el perfil temporalmente, suspende su participación.

## Cuando el servicio no responde

Si toda la biblioteca muestra un error, revisa el estado del proyecto en Supabase. El plan gratuito puede pausarse tras poca actividad: el propietario debe reactivarlo en el panel y esperar a que esté listo. No hagas registros ni compras nuevos para resolver una pausa.

Si falla Google, comprueba que se usa el correo invitado, que el proveedor está habilitado y que la URL `/entrar` está permitida. En la fase de prueba de Google, la cuenta debe estar también entre los usuarios de prueba del consentimiento OAuth. Una invitación de Manquepe y un usuario de prueba de Google son configuraciones diferentes.

Las variables `VITE_` se fijan al compilar: después de corregirlas, vuelve a desplegar. No copies mensajes completos con tokens o códigos de acceso en correos públicos.
