# Actualización: libros, lecturas y nombres públicos

Fecha: 27 de octubre de 2026. Código implementado localmente; la migración remota y el despliegue requieren los pasos de esta guía.

## Cambios solicitados

### Borrar libros

Administración → Libros incorpora «Borrar» además de Archivar. Solo un encargado activo puede ejecutar el borrado. Debe escribir el título actual y confirmar «Eliminar definitivamente».

Se eliminan el libro, sus reflexiones y versiones, las entradas «Quiero leer» y las marcas «Ya lo leí» asociadas. La acción no se puede deshacer. Archivar sigue siendo la alternativa para ocultar sin perder datos. Las portadas de Storage no se eliminan automáticamente porque otra ficha podría utilizarlas.

El servidor comprueba también el título, por lo que una confirmación antigua no elimina silenciosamente un libro cuyo título cambió.

### Administración desde celular

Hasta 680 px las secciones se eligen con un selector nativo «Sección de administración». Las opciones completas son Por revisar, Libros, Publicadas, Lectores e invitaciones y Respaldos. Evita comprimir nombres largos dentro del ancho de un teléfono.

En escritorio continúan las pestañas, con ancho propio y desplazamiento cuando se necesita. Se pueden recorrer con flechas izquierda/derecha e Inicio/Fin. Las tablas conservan su desplazamiento lateral independiente.

### Los más leídos

El responsable eligió que cada lector confirme sus lecturas con **«Ya lo leí»** desde la ficha del libro. Puede desmarcarlo si se equivoca. Cada persona cuenta una vez por libro, aunque pulse varias veces o publique varias reflexiones.

La portada muestra hasta cuatro libros, ordenados por lectores que confirmaron la lectura, con desempate por título e identificador. Los suspendidos y los libros archivados no participan. No se usan visitas, reseñas ni listas de deseos para inferir lecturas; no se inventan datos anteriores.

Sin marcas todavía se muestra «Aún no hay lecturas registradas» y un acceso al catálogo. En Mi espacio → Ya leí cada lector puede consultar sus propias marcas. Las marcas individuales son privadas para su dueño y los encargados; el agregado de cantidad por libro es público.

La elección manual de libros destacados deja de gobernar la portada. Los campos históricos se conservan en la base, pero se retiran del editor los controles que prometían «Destacar en el inicio». Las reflexiones destacadas siguen funcionando de forma independiente.

### Nombre y apellido como alias

Cada persona completa Nombre y Apellido, con descripción opcional. El alias público se compone de ambos y se muestra en perfiles, navegación y reflexiones. El formulario explica que serán públicos.

Los perfiles anteriores conservan sus datos. Al entrar en Mi espacio o Administración, se solicita completar los nombres antes de continuar si faltan. No se inventan apellidos a partir de un alias ni se copia automáticamente el nombre de Google.

Nombre admite hasta 60 caracteres; apellido hasta 80; descripción hasta 300. Los espacios se normalizan. Dos personas pueden tener el mismo nombre completo; los perfiles se identifican por UUID, no por el texto del nombre. Incluir apellidos resuelve la confusión habitual entre personas con el mismo nombre, pero no garantiza identidad civil única.

## Orden de publicación

**La migración debe aplicarse antes de publicar este frontend**, ya que incorpora nuevas consultas y RPC. La migración inicial ya aplicada no cambia.

1. Conserva un respaldo privado de los datos actuales desde Administración y las portadas de Storage.
2. Desde la carpeta local vinculada al proyecto correcto, revisa el historial y lo pendiente:

```sh
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Debe aparecer como pendiente `202610270001_reader_updates.sql`. El dry-run muestra los archivos; no ejecuta una prueba completa del SQL.

3. Aplica la migración nueva:

```sh
npx supabase db push --linked
npx supabase migration list --linked
```

La migración añade columnas/tablas/funciones sin rellenar nombres ni lecturas por su cuenta. No ejecutes la migración inicial otra vez y no uses `db reset` sobre datos reales. Si falla la migración nueva, conserva el mensaje y resuelve antes de publicar la web.

4. Verifica pruebas y compilación de la aplicación:

```sh
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= VITE_CONTACT_EMAIL= npm test
npm run build
```

5. Revisa y sube los archivos a la rama conectada a Cloudflare Pages:

```sh
git status --short
git add src/ tests/ scripts/browser-check.mjs supabase/migrations/202610270001_reader_updates.sql README.md docs/
git diff --cached --stat
git commit -m "feat: registrar lecturas y mejorar perfiles y administración"
git push
```

No se necesitan variables nuevas ni cambios en las credenciales de Google para estas funciones. Las políticas del proyecto remoto se actualizan mediante la migración, no mediante el push del frontend.

6. Espera al despliegue correcto y prueba desde la URL que ya funciona, `https://manquepe.pages.dev`.

## Pruebas de aceptación tras desplegar

- [ ] Un lector existente conserva sus reflexiones y lista; ve el formulario para completar Nombre y Apellido.
- [ ] Guardar muestra el nombre completo en el perfil y en sus reflexiones; el correo sigue privado.
- [ ] Marcar dos veces el mismo libro produce una sola lectura; otro lector puede sumar una segunda.
- [ ] Desmarcar resta únicamente la marca propia; el ranking se actualiza después de guardar.
- [ ] Guardar en «Quiero leer» o publicar una reseña no incrementa lecturas.
- [ ] Suspender y reactivar afecta al agregado; archivar/restaurar oculta/reincorpora el libro.
- [ ] En teléfono, el selector muestra completos los nombres de todas las secciones administrativas.
- [ ] Un lector no puede borrar libros desde la web ni mediante una llamada directa a la API.
- [ ] Prueba el borrado con un libro de prueba creado para ese fin: título incorrecto no permite confirmar; título correcto elimina ficha y relaciones.
- [ ] Exportar datos desde Respaldos incluye los nombres y las marcas de lectura para recuperación privada.

## Verificación local

55 pruebas aprobadas y compilación correcta. La suite SQL aplica todos los archivos de migración en orden y prueba también la actualización de una base con perfiles/libros anteriores. Incluye conteo único, privacidad de filas, exclusión de suspendidos/archivados, permisos de borrado y cascadas, orden de portada, campos de nombre y apellido y controles administrativos.

La revisión de código no encontró problemas críticos o importantes. La comprobación visual en un navegador real sigue pendiente por las restricciones del entorno del agente; las pruebas JSDOM no certifican el layout de un dispositivo.

Referencias: [migraciones de Supabase](https://supabase.com/docs/guides/deployment/database-migrations) y [funciones de base de datos](https://supabase.com/docs/guides/database/functions).
