# Piloto de Manquepe

## Material pendiente de la comunidad

- [ ] Validar textos de `docs/contenidos.md`, nombre, lema y diseño.
- [ ] Aportar correo de contacto y completar la variable correspondiente.
- [ ] Registrar al menos cinco libros físicos reales con sus portadas y descripciones.
- [ ] Elegir 1–2 encargados y autorizar sus cuentas.
- [ ] Invitar a 5–10 lectores y explicar que perfiles y listas serán públicos.
- [ ] Configurar Supabase, Google y Cloudflare Pages siguiendo el README.

## Recorridos con cuentas reales

- [ ] Sin sesión: recorrer inicio, catálogo, categorías, búsqueda con/sin tildes, ficha, reflexiones y perfiles.
- [ ] Abrir directamente las rutas de una ficha y de un perfil, y recargar: no deben responder 404 del alojamiento.
- [ ] Entrar con una cuenta Google no invitada: no debe crearse su cuenta.
- [ ] Entrar con una cuenta invitada: elegir alias, sin copiar nombre ni foto de Google al perfil.
- [ ] Guardar y quitar libros de «Quiero leer» y comprobar su visibilidad desde otro navegador sin sesión.
- [ ] Enviar dos reflexiones sobre un mismo libro. Hasta su aprobación solo debe verlas el autor y los encargados.
- [ ] Probar texto vacío, espacios, 1501 caracteres y 1500 caracteres Unicode. No se debe poder eludir el límite mediante la API.
- [ ] Enviar una reflexión con una palabra del filtro: se recibe para revisión y aparece una alerta al moderador.
- [ ] Rechazar con motivo; comprobarlo desde Mi espacio. Corregir y aprobar.
- [ ] Editar una publicada: el visitante conserva el texto anterior hasta aprobar el nuevo.
- [ ] Reemplazar otra vez la edición pendiente: la revisión anterior no debe poder aprobarse.
- [ ] Escribir un borrador y cambiar de pestaña; al volver, el texto debe conservarse.
- [ ] Eliminar una reflexión y comprobar que desaparece del libro, del perfil y de la cola de moderación.
- [ ] Desde una cuenta lectora, intentar abrir `/admin` y escribir mediante la API: debe denegarse.
- [ ] Suspender un lector con sesión abierta; verificar bloqueo de nuevas escrituras y ocultación pública de aportes.
- [ ] Importar un CSV válido; intentar uno con una fila inválida: no debe aparecer una importación parcial.
- [ ] Archivar y restaurar un libro; comprobar catálogo, listas y aportes asociados.
- [ ] Comprobar cierre de sesión, renovación de sesión y errores de conexión sin mensajes de éxito falsos.

## Presentación y accesibilidad

- [ ] Revisar celular (375–430 px), tablet (768 px) y escritorio (1440 px), sin desbordamientos.
- [ ] Revisar portadas reales y textos largos.
- [ ] Recorrer enlaces, menú y formularios con teclado, con foco visible y etiquetas comprensibles.
- [ ] Comprobar que el correo no aparece en consultas públicas a perfiles y que los borradores no son accesibles directamente.
- [ ] Confirmar que Contacto utiliza el correo aprobado y que ningún borrador institucional se presenta como validado sin revisión.

## Criterio de apertura

Los lectores completan el recorrido sin ayuda técnica y los encargados pueden invitar, registrar libros, moderar y respaldar. Se corrigen los fallos encontrados antes de ampliar la invitación. No hay una fecha fija ni una promesa de gratuidad ilimitada: se revisan límites del proveedor antes de ampliar el uso.
