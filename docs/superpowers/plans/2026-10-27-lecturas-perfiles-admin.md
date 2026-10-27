# Lecturas, perfiles y administración — plan de implementación

**Objetivo:** borrar libros con confirmación, corregir la navegación administrativa móvil, ordenar la portada por lecturas confirmadas y mostrar nombre y apellido como alias público.

**Arquitectura:** conservar la migración inicial; añadir una migración incremental para nombres, lecturas individuales privadas, agregado público y borrado administrativo. Los perfiles mantienen `alias` como nombre de presentación, derivado de nombre y apellido al completarlos; los datos existentes permanecen hasta que el lector los actualice.

**Tecnología:** React, TypeScript, Supabase/PostgreSQL y Vitest/PGlite existentes.

## Decisiones

- Cada lector marca «Ya lo leí»; una clave lector/libro evita contar varias veces. Puede desmarcarlo. No se infieren lecturas de listas, visitas ni reseñas.
- El agregado público excluye lectores suspendidos y libros archivados. Las filas individuales solo se consultan por su autor activo y encargados.
- «Los más leídos» incluye solo libros con al menos una lectura; empate por título e identificador. Sin lecturas se explica el estado vacío, sin inventar un ranking.
- Nombre y apellido se ingresan explícitamente. No se extraen de Google ni se adivinan apellidos de alias antiguos. El perfil advierte la visibilidad pública. Los homónimos completos pueden existir con identificadores de perfil distintos.
- Borrar requiere un encargado activo y escribir el título actual. Se eliminan el libro y sus relaciones mediante cascada; no se eliminan archivos de Storage que podrían compartirse.
- Móvil: selector nativo de sección; escritorio: pestañas sin contracción, con navegación por teclado.

## Entregables y verificación

- [x] Extender la suite para aplicar todas las migraciones ordenadas y probar actualización desde datos antiguos.
- [x] Pruebas SQL de autorización, nombres completos, conteo único, privacidad, suspensión/archivo y borrado con cascada.
- [x] Migración `202610270001_reader_updates.sql` con funciones `save_reader_profile`, `set_book_read`, `get_book_read_counts` y `delete_book`.
- [x] Selector administrativo y confirmación de borrado; pruebas de interacción y rechazo visible.
- [x] Botón «Ya lo leí», lista personal de leídos y portada ordenada por agregados; pruebas de orden y estados vacíos.
- [x] Nombre y apellido en formulario, mensajes y perfil; pruebas del envío y actualización de datos propios.
- [x] Documentar despliegue: respaldo, migración primero y frontend después; ejecutar pruebas/compilación y revisión.

**Entrega:** implementación y comprobaciones locales completas; publicación remota pendiente de seguir la guía de despliegue.
