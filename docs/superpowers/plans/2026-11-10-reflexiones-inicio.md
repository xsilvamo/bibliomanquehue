# Fechas y extractos de reflexiones

**Objetivo:** completar M09 y M11 de `docs/mejoras-pendientes.md`.

**Arquitectura:** reutilizar `ReflectionCard` con una propiedad opcional `preview`, activada solamente desde `Home`. Mantener el texto completo en las demás páginas. Mostrar la fecha de publicación mediante `time` antes del cuerpo; en «Mis reflexiones», mover la fecha de envío antes del texto.

**Tecnologías:** React, TypeScript, Vitest y jsdom. Sin dependencias ni migraciones nuevas.

## Pasos

- [x] Agregar pruebas de interacción: extracto inicial, expansión y contracción independientes, texto corto sin botón y texto completo fuera del inicio.
- [x] Ejecutar las pruebas y confirmar el fallo por la función ausente.
- [x] Implementar `preview?:boolean` en `src/components/ui.tsx`: extracto de 280 caracteres Unicode, botón con `aria-expanded` y `aria-controls`, identificador generado con `useId`.
- [x] Mostrar `published_at` arriba del texto y quitar su ubicación inferior. Si no hay fecha de publicación, no inventarla.
- [x] Activar `preview` en `src/pages/Public.tsx`, únicamente en las tarjetas de `Home`. Mover la fecha de envío en `src/pages/Account.tsx`.
- [x] Dar estilo a la fecha y al botón en `src/styles.css`, siguiendo la apariencia actual.
- [x] Ejecutar la suite aislada de Supabase, compilar y revisar los cambios.
- [x] Actualizar M09 y M11 con la evidencia local y dejar explícito que el despliegue no se realizó.

## Ajuste de alcance solicitado tras probar

El responsable pidió el mismo comportamiento en el menú de reflexiones y las fichas de libros. Se elimina la propiedad `preview`: todas las tarjetas públicas, incluidos los perfiles, muestran un extracto cuando superan 280 caracteres. Las pruebas originales que exigían texto completo fuera del inicio se sustituyen por pruebas de expansión en esas páginas. Verificación actual: 61 pruebas aprobadas y compilación correcta; sin despliegue.
