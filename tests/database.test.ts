import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, existsSync } from 'node:fs';

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
  await db.exec(`
    create role anon; create role authenticated; create role supabase_auth_admin;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text, owner_id text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `);
  const path = 'supabase/migrations/202610250001_manquepe.sql';
  if (existsSync(path)) await db.exec(readFileSync(path, 'utf8'));
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
  it('prevents administrators from suspending themselves', async () => {
    await expect(as(admin,'select public.set_member_suspended($1,true)',[admin])).rejects.toThrow();
  });
});
