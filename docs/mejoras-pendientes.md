# Mejoras recopiladas de la comunidad

Registro creado el **10 de noviembre de 2026** para avanzar progresivamente con la retroalimentación de Bibliomanquehue (proyectoconi).

Este documento registra tareas y decisiones; no implica que las funciones pendientes estén implementadas. El orden de las filas no establece prioridad. La etapa de diseño se deja para el final, una vez listas las demás mejoras acordadas.

## Seguimiento

Marcar la casilla al completar una tarea y añadir fecha y referencia al cambio. Usar los estados **Pendiente**, **Por evaluar**, **Por conversar**, **Para el final**, **En curso** y **Completada**. La tarea de borrar reflexiones se registra como completada según lo informado por el responsable.

| Hecho | ID | Mejora | Estado | Alcance y decisiones pendientes |
| --- | --- | --- | --- | --- |
| [ ] | M01 | Cambiar el diseño | Para el final | Abordar cuando estén listas las demás mejoras acordadas. |
| [ ] | M02 | Editar los iconos generados con IA | Para el final | Revisarlos y reemplazarlos o ajustarlos durante la etapa de diseño. |
| [ ] | M03 | Crear nuevas frases | Para el final | Se escribirán a mano durante la etapa de diseño. |
| [x] | M04 | Mostrar los libros «Ya lo leí» en el perfil público | Completada | Implementada localmente el 2026-11-10: sección pública de lecturas terminadas, con filtros de perfiles activos y libros visibles. 65 pruebas aprobadas y compilación correcta. Requiere aplicar migración y desplegar; ver [publicación](lecturas-publicas.md). |
| [ ] | M05 | Mostrar si un libro está disponible | Por evaluar | Primero definir cómo se gestionarán los préstamos por los administradores y cómo eso determinará la disponibilidad. No se ha elegido todavía un flujo de préstamos. |
| [ ] | M06 | Decidir si el sitio llevará el nombre Manquehue | Por conversar | Conversarlo con el equipo antes de cambiar el nombre o la identidad. |
| [ ] | M07 | Incorporar un apartado de donaciones de libros | Por evaluar | Definir un apartado o mecanismo para coordinar las donaciones y quién será responsable de gestionarlas. |
| [x] | M08 | Borrar reflexión | Completada | El responsable informa que esta tarea ya está lista. Fecha de finalización no indicada. |
| [x] | M09 | Poner la fecha arriba de las reflexiones | Completada | Implementada localmente el 2026-11-10: fecha de publicación arriba en tarjetas públicas y fecha de envío arriba en «Mis reflexiones». El agrupamiento por mes queda por definir. Despliegue pendiente. |
| [x] | M10 | Separar los roles de lector, administrador y ayudante | Completada | Implementada localmente el 2026-11-10: ayudante agrega y edita libros activos y sube portadas desde su pantalla de catálogo, sin acceso administrativo. No borra, archiva ni importa CSV. Migración remota y despliegue pendientes; ver [roles y catálogo](roles-catalogo.md). |
| [x] | M11 | Limitar la extensión de las reseñas en el inicio | Completada | Implementada localmente el 2026-11-10: extracto de hasta 280 caracteres con «Mostrar más» y «Mostrar menos» en todas las tarjetas públicas: inicio, menú de reflexiones, fichas de libros y perfiles. Se conserva el enlace al perfil del autor. Despliegue pendiente. |
| [x] | M12 | Permitir que un administrador cambie roles | Completada | Implementada localmente el 2026-11-10: administradores asignan Lector, Ayudante o Administrador a otras personas con guardado explícito. Sin cambio de rol propio. Migración remota y despliegue pendientes; ver [roles y catálogo](roles-catalogo.md). |
| [x] | M13 | Usar lector como rol por defecto | Completada | Confirmado y mantenido el 2026-11-10: nuevas cuentas invitadas reciben el rol Lector por defecto. Verificado mediante pruebas SQL. Migración remota y despliegue pendientes; ver [roles y catálogo](roles-catalogo.md). |

## Dependencias para avanzar

- Resolver conjuntamente M10, M12 y M13 para mantener coherentes los roles y permisos.
- Evaluar el manejo de préstamos antes de implementar disponibilidad (M05).
- Conversar el nombre con el equipo (M06) antes de cerrar la identidad visual.
- Dejar diseño, iconos y frases (M01–M03) para la etapa final.

## Registro de avances

| Fecha | Tareas | Actualización |
| --- | --- | --- |
| 2026-11-10 | M01–M13 | Registro inicial de la retroalimentación. M08 ya estaba completada según el responsable. Las demás tareas quedan pendientes o sujetas a evaluación/conversación. |

| 2026-11-10 | M09, M11 | Implementación local: fechas arriba y extractos expandibles en el inicio. 59 pruebas aprobadas y compilación correcta. Sin migraciones ni despliegue. |

| 2026-11-10 | M11 | Ampliado «Mostrar más» a todas las tarjetas públicas de reflexiones, por solicitud del responsable. |

| 2026-11-10 | M04 | Perfil público con «Ya lo leí», consulta pública limitada a lector/libro y avisos de visibilidad. Migración remota y despliegue pendientes. |

| 2026-11-10 | M10, M12, M13 | Roles de ayudante y administración de roles implementados localmente. Lector predeterminado confirmado. 73 pruebas y compilación correctas; migración y despliegue pendientes. |
