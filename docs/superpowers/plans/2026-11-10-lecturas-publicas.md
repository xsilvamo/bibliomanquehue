# Libros leídos en perfiles públicos

**Objetivo:** completar M04 de `docs/mejoras-pendientes.md`.

**Arquitectura:** añadir `get_public_book_reads()` con privilegios definidos explícitamente, que devuelve únicamente `user_id` y `book_id` para lectores activos con alias y libros no archivados. Mantener las políticas de la tabla privada y el flujo de `completed` personal. Cargar las relaciones públicas en `publicReads` desde el proveedor y utilizarlas en `ReaderProfile`.

**Tecnologías:** React, TypeScript, PostgreSQL/Supabase, Vitest y PGlite. Sin dependencias nuevas.

- [x] Probar la consulta como visitante y lector: sin fechas privadas, sin suspendidos, perfiles sin alias ni libros archivados; sin escrituras públicas.
- [x] Probar la sección del perfil, la separación entre lectores y el estado vacío.
- [x] Confirmar fallos antes de implementar.
- [x] Crear migración `202611100001_public_book_reads.sql`, sin modificar las anteriores.
- [x] Añadir tipo `PublicBookRead`, carga `publicReads` y sección «Ya lo leí» con `BookCard`.
- [x] Actualizar avisos de visibilidad y documentación, incluyendo orden de migración y despliegue.
- [x] Ejecutar pruebas y compilación, solicitar revisión y actualizar el seguimiento.
