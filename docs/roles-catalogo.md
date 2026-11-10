# Roles y gestión del catálogo — 10 de noviembre de 2026

Implementación local de M10, M12 y M13. En esta tarea «ayudante» significa agregar y editar libros del catálogo, según lo aclarado por el responsable.

| Acción | Lector | Ayudante | Administrador |
| --- | --- | --- | --- |
| Participar como lector, guardar y marcar libros leídos | Sí | Sí | Sí |
| Agregar y editar libros activos, incluida su portada | No | Sí | Sí |
| Archivar, restaurar o borrar libros | No | No | Sí |
| Importar inventario CSV | No | No | Sí |
| Moderar y destacar reflexiones de la comunidad | No | No | Sí |
| Invitar, suspender y cambiar roles de otras personas | No | No | Sí |
| Consultar respaldos y datos administrativos | No | No | Sí |

Las cuentas suspendidas no pueden ejecutar las operaciones de estos roles. Las acciones sobre reflexiones propias conservan las reglas existentes.

## Uso

Las nuevas cuentas invitadas reciben el rol **Lector**. Este ya era el valor predeterminado; la migración lo conserva explícitamente y las pruebas lo verifican. Las cuentas existentes conservan su rol.

En **Administrar → Lectores e invitaciones → Lectores registrados**, elegir Lector, Ayudante o Administrador y pulsar **Guardar rol**. Seleccionar una opción no guarda automáticamente. Los errores aparecen junto al selector. No se permite cambiar el rol propio ni suspender la cuenta propia. Para cambiar el rol de un administrador, otro administrador activo debe hacerlo.

El ayudante entra por **Gestionar catálogo**, en `/catalogo`. Puede buscar, agregar y editar libros activos utilizando el mismo formulario de catálogo del administrador. No accede a `/admin` ni a las secciones de moderación, usuarios, invitaciones o respaldos. Tampoco puede archivar, restaurar, borrar o importar libros. Puede subir una nueva portada y asociarla a un libro; reemplazar o borrar objetos existentes de Storage sigue reservado al administrador.

## Permisos y migración

`202611100002_catalog_roles.sql` agrega `helper` sin cambiar el rol de las cuentas actuales. La RPC `save_catalog_book(p_book jsonb,p_book_id uuid)` verifica el rol activo y solo escribe título, autor, categoría, descripción, ISBN y portada. Ignora propiedades extra como `archived` o `featured`; las políticas de escritura directa de libros siguen reservadas al administrador.

`set_member_role(p_user_id uuid,p_role text)` solo permite cambios a administradores activos. Los cambios de rol y suspensión obtienen el mismo bloqueo de tabla y vuelven a verificar los permisos después, para serializar operaciones concurrentes. Las pruebas locales no simulan transacciones concurrentes; ese aspecto se revisó estáticamente.

Los permisos se verifican en cada operación del servidor aunque una pestaña conserve temporalmente una interfaz anterior. El proveedor vuelve a consultar la membresía al regresar a la pestaña.

## Publicación y comprobación

1. Respaldar los datos según la [guía de encargados](guia-encargados.md).
2. Ejecutar `npx supabase migration list --linked` y `npx supabase db push --linked --dry-run` para revisar destino y migraciones pendientes.
3. Aplicar las migraciones pendientes revisadas con `npx supabase db push --linked`. Conservar las migraciones históricas; no pegarlas de nuevo en SQL Editor.
4. Publicar el frontend después de aplicar la migración.
5. Con un administrador, asignar Ayudante a una cuenta de prueba. Volver a su pestaña y comprobar el enlace de catálogo, agregar y editar un libro con portada y verificar que `/admin` está bloqueado.
6. Cambiarla a Lector y comprobar que ya no puede guardar cambios del catálogo. Probar también la suspensión y el restablecimiento de acceso.
7. Comprobar asignación de Administrador desde otra cuenta y que el rol propio no se puede cambiar.

La migración remota y el despliegue no se ejecutaron en esta sesión.

## Verificación local

73 pruebas aprobadas y compilación de producción correcta. La suite SQL comprueba alta como lector, cambios de rol, restricciones administrativas del ayudante, campos permitidos del catálogo, portadas y suspensión. Las pruebas React verifican rutas por rol, edición del catálogo y guardado explícito de roles con manejo de errores. Revisión de código sin hallazgos pendientes.
