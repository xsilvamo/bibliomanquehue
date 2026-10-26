export const categories = ['Espiritualidad', 'Biblia y lectio divina', 'Vida cristiana y formación', 'Testimonios', 'Oración y vida monástica'] as const;
export type Category = typeof categories[number];
export type Book = {id:string; title:string; author:string; category:Category; description:string; isbn:string; cover_url:string|null; featured:boolean; archived:boolean; created_at:string};
export type Profile = {id:string; alias:string|null; bio:string; created_at:string};
export type Member = {user_id:string; role:'reader'|'admin'; suspended:boolean};
export type Reflection = {id:string; book_id:string; author_id:string; body:string|null; featured:boolean; published_at:string|null; created_at:string};
export type Submission = {id:string; reflection_id:string; author_id:string; body:string; flags:string[]; status:'pending'|'approved'|'rejected'|'superseded'; rejection_reason:string; moderated_by:string|null; created_at:string};
export type ReadingItem = {user_id:string; book_id:string; created_at:string};
export type Invitation = {email:string; active:boolean; created_at:string};
export const normalize = (text:string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export function filterBooks<T extends {title:string;author:string;category:string}>(books:T[], query:string, category:string):T[] {
  const q=normalize(query);
  return books.filter(b => (!category || b.category===category) && (!q || normalize(`${b.title} ${b.author}`).includes(q)));
}
export const characterCount = (text:string) => [...text].length;
export function validateReflection(text:string):string|null {
  const n=characterCount(text.trim());
  return n<1 || n>1500 ? 'Escribe entre 1 y 1500 caracteres.' : null;
}
export const formatDate = (date:string) => new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(date));
export function safeImage(url:string|null):string|undefined {
  if(!url) return;
  try {const u=new URL(url);return u.protocol==='https:' ? u.href : undefined;} catch {return;}
}
export type InventoryBook = Pick<Book,'title'|'author'|'category'|'description'|'isbn'> & {cover_file:string};
// RFC 4180: quoted commas, escaped quotes and line breaks are retained.
function csvRows(text:string):string[][] {
  const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;let closed=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell || closed) throw new Error('Comillas inesperadas en el CSV.');quoted=true;continue;}
    if(c===',' || c==='\n' || c==='\r') {
      row.push(cell);cell='';closed=false;
      if(c!==','){if(c==='\r' && text[i+1]==='\n')i++;if(row.some(x=>x.trim()))rows.push(row);row=[];}
    }else{if(closed && c.trim())throw new Error('Texto fuera de las comillas del CSV.');if(!closed)cell+=c;}
  }
  if(quoted)throw new Error('Hay comillas sin cerrar en el CSV.');
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
export function parseInventory(text:string):{books:InventoryBook[];errors:string[]} {
  const books:InventoryBook[]=[];const errors:string[]=[];
  let rows:string[][];
  try {rows=csvRows(text);}catch(e){return {books,errors:[(e as Error).message]};}
  const headers=rows.shift()?.map(normalize)??[];
  for(const name of ['titulo','autor','categoria','descripcion']) if(!headers.includes(name))errors.push(`Falta la columna ${name}.`);
  if(errors.length)return {books,errors};
  const seen=new Set<string>();
  rows.forEach((r,index)=>{
    const get=(name:string)=> (r[headers.indexOf(name)]??'').trim();
    const b:InventoryBook={title:get('titulo'),author:get('autor'),category:get('categoria') as Category,description:get('descripcion'),isbn:get('isbn'),cover_file:get('portada')};
    const before=errors.length;const line=`Fila ${index+2}: `;
    if(r.length!==headers.length)errors.push(line+'la cantidad de columnas no coincide con el encabezado.');
    if(!b.title || b.title.length>200 || !b.author || b.author.length>200 || !b.description || b.description.length>3000)errors.push(line+'revisa título, autor y descripción y sus límites.');
    if(!categories.includes(b.category))errors.push(line+'categoría no reconocida.');
    if(b.isbn.length>32)errors.push(line+'ISBN demasiado largo.');
    if(b.cover_file && !safeImage(b.cover_file) && !/^[\p{L}\p{N}_ .()-]+\.(jpe?g|png|webp)$/iu.test(b.cover_file))errors.push(line+'portada debe ser un archivo JPG, PNG o WebP, o una URL HTTPS.');
    const key=[normalize(b.title),normalize(b.author),b.isbn].join('|');
    if(seen.has(key))errors.push(line+'libro/edición duplicado.');seen.add(key);
    if(errors.length===before)books.push(b);
  });
  return {books,errors};
}
export function download(name:string, contents:string, type='application/json') {
  const a=document.createElement('a');const url=URL.createObjectURL(new Blob([contents],{type}));
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
