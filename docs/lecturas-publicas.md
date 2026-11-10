# Libros leídos en perfiles públicos — 10 de noviembre de 2026

M04 añade «Ya lo leí» al perfil público de cada lector, después de «Quiero leer». Muestra las fichas de los libros que esa persona marcó como terminados. Si no tiene marcas, se indica que todavía no ha marcado libros como leídos. Al quitar una marca, el libro deja de aparecer tras actualizar los datos.

## Datos y visibilidad

La función `get_public_book_reads()` devuelve únicamente `user_id` y `book_id`. Está disponible para visitantes y usuarios autenticados. Excluye usuarios suspendidos, perfiles sin alias y libros archivados. No publica correo ni fecha de registro, ni modifica los permisos de escritura o acceso directo de `book_reads`.

Esto cambia la visibilidad anterior de las marcas existentes: la relación lector/libro pasa a ser pública para los perfiles activos visibles. El aviso junto al botón «Ya lo leí» y la pantalla de acceso explican la visibilidad. El lector puede quitar sus marcas.

## Publicación

1. Respaldar los datos con el procedimiento de la guía de encargados.
	1. Revisar las migraciones pendientes y su destino: `npx supabase migration list --linked` y `npx supabase db push --linked --dry-run`.
2. Aplicar las migraciones pendientes revisadas con `npx supabase db push --linked`. Esta entrega añade `202611100001_public_book_reads.sql`; requiere las migraciones anteriores. No editar ni reaplicar manualmente las migraciones históricas.
3. Publicar el frontend después de aplicar la migración. El frontend necesita la RPC nueva para cargar los datos; publicarlo antes puede impedir la carga del catálogo.
4. Verificar como visitante un perfil con marcas y uno sin marcas. Como lector, marcar y desmarcar un libro y comprobar su perfil público. Verificar que usuarios suspendidos y libros archivados no aparecen.

No se ha aplicado la migración remota ni publicado el frontend desde esta sesión. El despliegue queda pendiente.

## Verificación local

Pruebas de PostgreSQL con PGlite comprueban filtros públicos, campos expuestos, restricciones de acceso directo y eliminación de marcas. Pruebas de React comprueban el perfil seleccionado, el estado vacío y la carga mediante el proveedor real. Ejecutar `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= VITE_CONTACT_EMAIL= npm test` y `npm run build`.
