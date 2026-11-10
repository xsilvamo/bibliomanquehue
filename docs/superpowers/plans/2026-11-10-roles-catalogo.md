# Roles y catálogo — M10, M12, M13

Objetivo: lector por defecto, ayudante que agrega/edita catálogo y administrador que cambia roles de otras personas.

Arquitectura: ruta `/catalogo` protegida para ayudante/admin, editor compartido con Administración y RPC `save_catalog_book(p_book jsonb,p_book_id uuid)` con lista explícita de campos. No ampliar escrituras directas del ayudante. RPC `set_member_role(p_user_id uuid,p_role text)` solo admin activo; sin cambio de rol propio. Serializar cambios de roles y suspensiones y verificar autorización después de bloquear para evitar pérdida concurrente del último administrador activo.

- [x] Pruebas SQL: alta reader, ayudante edita/agrega/portadas pero no archiva, borra, importa, modera, invita ni cambia roles; suspendido bloqueado; admin asigna los tres roles, no se degrada a sí mismo y entradas inválidas rechazadas.
- [x] Pruebas UI: acceso y rutas por rol, pantalla de ayudante sin opciones administrativas, guardado y selector de roles con errores.
- [x] Ejecutar pruebas nuevas antes de implementación.
- [x] Crear migración nueva sin editar migraciones anteriores.
- [x] Extraer BookEditor a componente compartido, crear CatalogManager, ampliar Guard y navegación.
- [x] Añadir editor de roles en Lectores e invitaciones y refrescar permisos después de guardar.
- [x] Ejecutar suite, compilación y revisión; documentar despliegue y completar seguimiento local.
