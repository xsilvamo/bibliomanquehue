import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { bootstrapDatabase } from './helpers/database';

const db = new PGlite();
const admin = '00000000-0000-4000-8000-000000000001';
const ana = '00000000-0000-4000-8000-000000000002';
const ben = '00000000-0000-4000-8000-000000000003';
let book: string;
async function as<T = Record<string, unknown>>(id: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`set role ${id ? 'authenticated' : 'anon'};`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? '']);
  try { return (await db.query<T>(sql, params)).rows; }
  finally { await db.exec('reset role'); }
}
beforeAll(async () => {
  await bootstrapDatabase(db);
});
afterAll(() => db.close());

describe.sequential('Database authorization and publishing workflow', () => {
  it('rejects an uninvited account at database level', async () => {
    await expect(db.query('insert into auth.users(id,email) values ($1,$2)', [ana, 'outsider@example.org'])).rejects.toThrow(/invit/i);
  });
  it('creates invited members without exposing Google name or email', async () => {
    await db.exec("insert into public.invitations(email) values ('admin@example.org'),('ana@example.org'),('ben@example.org')");
    for (const [id, email] of [[admin,'admin'],[ana,'ana'],[ben,'ben']]) {
      await db.query("insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,'{\"full_name\":\"Private Google Name\"}')", [id, `${email}@example.org`]);
    }
    await db.query("update public.memberships set role='admin' where user_id=$1", [admin]);
    for (const [id, name] of [[admin,'Encargado'],[ana,'Ana'],[ben,'Ben']]) await as(id, 'select public.save_profile($1,$2)', [name,'']);
    const profiles = await as(null,'select * from public.profiles');
    expect(profiles).toHaveLength(3);
    expect(Object.keys(profiles[0])).not.toContain('email');
    expect(JSON.stringify(profiles)).not.toContain('Private Google Name');
  });
  it('allows admins to create books and blocks readers', async () => {
    const data = await as<{id:string}>(admin, "insert into public.books(title,author,category,description) values ('Libro de prueba','Autora','Espiritualidad','Una descripción de prueba') returning id");
    book = data[0].id;
    await expect(as(ana,"insert into public.books(title,author,category,description) values ('Intruso','X','Espiritualidad','Texto')")).rejects.toThrow();
  });
  it('protects invitations and membership changes against direct API access', async () => {
    expect(await as(null,'select * from public.invitations')).toEqual([]);
    await expect(as(ana,"update public.memberships set role='admin' where user_id=$1",[ana])).rejects.toThrow();
    await expect(as(ana,'select public.manage_invitation($1,true)',['intruder@example.org'])).rejects.toThrow();
  });
  it('keeps pending text private even on direct row queries', async () => {
    await as(ana,'select public.submit_reflection($1,$2)',[book,'Mi primera reflexión privada.']);
    expect(await as(null,'select * from public.reflections')).toHaveLength(0);
    expect(await as(ben,'select * from public.reflection_submissions')).toHaveLength(0);
    expect(await as(ana,'select * from public.reflection_submissions')).toHaveLength(1);
  });
  it('validates whitespace and the 1500-character limit on the server', async () => {
    for (const body of ['   ','x'.repeat(1501)]) await expect(as(ana,'select public.submit_reflection($1,$2)',[book,body])).rejects.toThrow(/1500/);
  });
  it('only admins can publish and rejection requires a reason', async () => {
    const [submission] = await as<{id:string}>(admin,"select id from public.reflection_submissions where status='pending'");
    await expect(as(ana,'select public.moderate_submission($1,true,$2)',[submission.id,''])).rejects.toThrow();
    await expect(as(admin,'select public.moderate_submission($1,false,$2)',[submission.id,''])).rejects.toThrow(/motivo/i);
    await as(admin,'select public.moderate_submission($1,true,$2)',[submission.id,'']);
    expect((await as<{body:string}>(null,'select body from public.reflections'))[0].body).toBe('Mi primera reflexión privada.');
  });
  it('preserves published text during edits and prevents approval of superseded drafts', async () => {
    const [reflection] = await as<{id:string}>(ana,'select id from public.reflections');
    await as(ana,'select public.submit_reflection($1,$2,$3)',[book,'Primera edición pendiente',reflection.id]);
    const [stale] = await as<{id:string}>(admin,"select id from public.reflection_submissions where status='pending'");
    await as(ana,'select public.submit_reflection($1,$2,$3)',[book,'Segunda edición pendiente',reflection.id]);
    expect((await as<{body:string}>(null,'select body from public.reflections'))[0].body).toBe('Mi primera reflexión privada.');
    await expect(as(admin,'select public.moderate_submission($1,true,$2)',[stale.id,''])).rejects.toThrow(/pendiente/i);
    const [latest] = await as<{id:string}>(admin,"select id from public.reflection_submissions where status='pending'");
    await as(admin,'select public.moderate_submission($1,true,$2)',[latest.id,'']);
    expect((await as<{body:string}>(null,'select body from public.reflections'))[0].body).toBe('Segunda edición pendiente');
  });
  it('cannot edit, delete, or directly publish somebody else’s content', async () => {
    const [reflection] = await as<{id:string}>(ana,'select id from public.reflections');
    await expect(as(ben,'select public.submit_reflection($1,$2,$3)',[book,'Ataque',reflection.id])).rejects.toThrow();
    await expect(as(ben,'select public.delete_reflection($1)',[reflection.id])).rejects.toThrow();
    await expect(as(ana,"update public.reflections set body='Sin moderar' where id=$1",[reflection.id])).rejects.toThrow();
  });
  it('allows multiple reflections and public lists without duplicate saved books', async () => {
    await as(ana,'select public.submit_reflection($1,$2)',[book,'Otra reflexión sobre el mismo libro']);
    await as(ana,'select public.set_want_to_read($1,true)',[book]);
    await as(ana,'select public.set_want_to_read($1,true)',[book]);
    expect(await as(null,'select * from public.reading_list')).toHaveLength(1);
    await as(ben,'select public.set_want_to_read($1,false)',[book]);
    expect(await as(null,'select * from public.reading_list')).toHaveLength(1);
  });
  it('filters language without blocking submission and records flags server-side', async () => {
    await as(ben,'select public.submit_reflection($1,$2)',[book,'La palabra mierda aparece en este ejemplo.']);
    const [submission] = await as<{flags:string[]}>(ben,'select flags from public.reflection_submissions');
    expect(submission.flags).toContain('mierda');
  });
  it('suspension hides public contributions and blocks an existing session', async () => {
    await as(admin,'select public.set_member_suspended($1,true)',[ana]);
    expect(await as(null,'select * from public.reflections')).toHaveLength(0);
    expect(await as(null,'select * from public.reading_list')).toHaveLength(0);
    await expect(as(ana,'select public.submit_reflection($1,$2)',[book,'Ya no puedo publicar'])).rejects.toThrow();
    await expect(as(ana,'select public.save_profile($1,$2)',['Nuevo',''])).rejects.toThrow();
    await as(admin,'select public.set_member_suspended($1,false)',[ana]);
  });
  it('archives books without leaking related reflections or allowing new contributions', async () => {
    await as(admin,'update public.books set archived=true where id=$1',[book]);
    expect(await as(null,'select * from public.books')).toHaveLength(0);
    expect(await as(null,'select * from public.reflections')).toHaveLength(0);
    await expect(as(ana,'select public.submit_reflection($1,$2)',[book,'No debe permitirse'])).rejects.toThrow();
    await as(admin,'update public.books set archived=false where id=$1',[book]);
  });
  it('deletes the author’s reflection and all private revisions', async () => {
    const [reflection] = await as<{id:string}>(ana,'select id from public.reflections where body is not null');
    await as(ana,'select public.delete_reflection($1)',[reflection.id]);
    expect(await as(null,'select * from public.reflections')).toHaveLength(0);
    expect(await as(admin,'select * from public.reflection_submissions where reflection_id=$1',[reflection.id])).toHaveLength(0);
  });
  it('imports books atomically and refuses non-admin imports', async () => {
    const payload = [{title:'Nuevo libro',author:'Autora',category:'Espiritualidad',description:'Descripción',isbn:'',cover_url:null}, {title:'Inválido',author:'Autora',category:'Otra',description:'Descripción',isbn:'',cover_url:null}];
    await expect(as(ana,'select public.import_books($1::jsonb)',[JSON.stringify(payload.slice(0,1))])).rejects.toThrow();
    await expect(as(admin,'select public.import_books($1::jsonb)',[JSON.stringify(payload)])).rejects.toThrow();
    expect(await as(null,"select * from public.books where title='Nuevo libro'")).toHaveLength(0);
    await as(admin,'select public.import_books($1::jsonb)',[JSON.stringify(payload.slice(0,1))]);
    expect(await as(null,"select * from public.books where title='Nuevo libro'")).toHaveLength(1);
  });
  it('uses explicit first and last names for the public alias and allows full homonyms', async () => {
    await as(ana,'select public.save_reader_profile($1,$2,$3)',['  Ana  María ',' Pérez  Soto ','Lectora']);
    const [profile]=await as<{alias:string;first_name:string;last_name:string}>(ana,'select * from public.profiles where id=$1',[ana]);
    expect(profile.alias).toBe('Ana María Pérez Soto');
    expect(profile.first_name).toBe('Ana María');
    expect(profile.last_name).toBe('Pérez Soto');
    await as(ben,'select public.save_reader_profile($1,$2,$3)',['Ana María','Pérez Soto','Otro lector']);
    expect(await as(null,"select id from public.profiles where alias='Ana María Pérez Soto'")).toHaveLength(2);
  });
  it('rejects missing names and oversized fields without changing another account', async () => {
    for(const [first,last] of [['','Pérez'],['Ana','  '],['x'.repeat(61),'Pérez'],['Ana','x'.repeat(81)]]) {
      await expect(as(ana,'select public.save_reader_profile($1,$2,$3)',[first,last,''])).rejects.toThrow();
    }
    await expect(as(null,'select public.save_reader_profile($1,$2,$3)',['Ana','Pérez',''])).rejects.toThrow();
    await expect(as(ana,'select public.save_reader_profile($1,$2,$3)',['Ana','Pérez','x'.repeat(301)])).rejects.toThrow();
    expect((await as<{bio:string}>(ben,'select bio from public.profiles where id=$1',[ben]))[0].bio).toBe('Otro lector');
  });
  it('keeps the full name consistent when an older client edits the legacy alias', async () => {
    await as(ana,'select public.save_profile($1,$2)',['Alias antiguo','Bio actualizada']);
    expect((await as<{alias:string}>(ana,'select alias from public.profiles where id=$1',[ana]))[0].alias).toBe('Ana María Pérez Soto');
  });
  it('counts a finished book only once per reader without publishing individual reading records', async () => {
    await as(ana,'select public.set_book_read($1,true)',[book]);
    await as(ana,'select public.set_book_read($1,true)',[book]);
    expect((await as<{read_count:number}>(null,'select * from public.get_book_read_counts() where book_id=$1',[book]))[0].read_count).toBe(1);
    await as(ben,'select public.set_book_read($1,true)',[book]);
    expect((await as<{read_count:number}>(null,'select * from public.get_book_read_counts() where book_id=$1',[book]))[0].read_count).toBe(2);
    expect(await as(ana,'select * from public.book_reads')).toHaveLength(1);
    expect(await as(ben,'select * from public.book_reads where user_id=$1',[ana])).toHaveLength(0);
    await expect(as(null,'select * from public.book_reads')).rejects.toThrow();
    expect(Object.keys((await as(null,'select * from public.get_book_read_counts()'))[0]).sort()).toEqual(['book_id','read_count']);
  });
  it('blocks forged reading records and does not count views, reviews, or wishlists as completed reads', async () => {
    await expect(as(null,'select public.set_book_read($1,true)',[book])).rejects.toThrow();
    await expect(as(ana,'insert into public.book_reads(user_id,book_id) values($1,$2)',[ben,book])).rejects.toThrow();
    await expect(as(ana,'update public.book_reads set user_id=$1',[ben])).rejects.toThrow();
    await expect(as(ana,'select public.set_book_read($1,true)',['00000000-0000-4000-8000-999999999999'])).rejects.toThrow();
    const [newBook]=await as<{id:string}>(admin,"insert into public.books(title,author,category,description) values('Sin lecturas','Autora','Espiritualidad','Descripción') returning id");
    await as(ana,'select public.set_want_to_read($1,true)',[newBook.id]);
    await as(ana,'select public.submit_reflection($1,$2)',[newBook.id,'Una reflexión no equivale a confirmar una lectura.']);
    expect(await as(null,'select * from public.get_book_read_counts() where book_id=$1',[newBook.id])).toHaveLength(0);
  });
  it('excludes archived books and suspended readers, and allows each reader to undo only their read', async () => {
    await as(admin,'select public.set_member_suspended($1,true)',[ben]);
    expect((await as<{read_count:number}>(null,'select * from public.get_book_read_counts() where book_id=$1',[book]))[0].read_count).toBe(1);
    await expect(as(ben,'select public.set_book_read($1,false)',[book])).rejects.toThrow();
    await as(admin,'select public.set_member_suspended($1,false)',[ben]);
    await as(ana,'select public.set_book_read($1,false)',[book]);
    expect((await as<{read_count:number}>(null,'select * from public.get_book_read_counts() where book_id=$1',[book]))[0].read_count).toBe(1);
    expect(await as(ben,'select * from public.book_reads')).toHaveLength(1);
    await as(admin,'update public.books set archived=true where id=$1',[book]);
    expect(await as(null,'select * from public.get_book_read_counts() where book_id=$1',[book])).toHaveLength(0);
    await expect(as(ana,'select public.set_book_read($1,true)',[book])).rejects.toThrow();
    await as(ben,'select public.set_book_read($1,false)',[book]);
    await as(admin,'update public.books set archived=false where id=$1',[book]);
  });
  it('requires full names for new read confirmations and blocks suspended profile edits', async () => {
    await expect(as(admin,'select public.set_book_read($1,true)',[book])).rejects.toThrow(/nombre|apellido/i);
    await as(admin,'select public.set_member_suspended($1,true)',[ana]);
    await expect(as(ana,'select public.save_reader_profile($1,$2,$3)',['Ana','Pérez',''])).rejects.toThrow();
    await as(admin,'select public.set_member_suspended($1,false)',[ana]);
  });
  it('requires an active admin and matching title before permanently deleting a book and its relations', async () => {
    const [b]=await as<{id:string}>(admin,"insert into public.books(title,author,category,description) values('Para borrar','Autora','Espiritualidad','Descripción') returning id");
    await as(ana,'select public.set_want_to_read($1,true)',[b.id]);
    await as(ana,'select public.set_book_read($1,true)',[b.id]);
    await as(ana,'select public.submit_reflection($1,$2)',[b.id,'Este aporte se elimina junto al libro.']);
    const [reflection]=await as<{id:string}>(admin,'select id from public.reflections where book_id=$1',[b.id]);
    await expect(as(ana,'select public.delete_book($1,$2)',[b.id,'Para borrar'])).rejects.toThrow();
    await expect(as(null,'select public.delete_book($1,$2)',[b.id,'Para borrar'])).rejects.toThrow();
    await expect(as(admin,'select public.delete_book($1,$2)',[b.id,'Otro título'])).rejects.toThrow(/título/i);
    expect(await as(null,'select id from public.books where id=$1',[b.id])).toHaveLength(1);
    await as(admin,'select public.delete_book($1,$2)',[b.id,'Para borrar']);
    for(const table of ['books','reflections','reading_list','book_reads']) {
      expect(await as(admin,`select * from public.${table} where ${table==='books'?'id':'book_id'}=$1`,[b.id])).toHaveLength(0);
    }
    expect(await as(admin,'select * from public.reflection_submissions where reflection_id=$1',[reflection.id])).toHaveLength(0);
    await expect(as(admin,'select public.delete_book($1,$2)',[b.id,'Para borrar'])).rejects.toThrow(/encontr/i);
  });


  it('prevents administrators from suspending themselves', async () => {
    await expect(as(admin,'select public.set_member_suspended($1,true)',[admin])).rejects.toThrow();
  });
});
