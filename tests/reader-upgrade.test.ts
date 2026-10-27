import {it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {bootstrapDatabase} from './helpers/database';
it('upgrades existing aliases and books without inventing surnames or past reads',async()=>{
 const db=new PGlite();
 try{
  await bootstrapDatabase(db,true);
  await db.exec("insert into public.invitations(email) values('legacy@example.org'); insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000099','legacy@example.org'); update public.profiles set alias='Ana',bio='Perfil existente'; insert into public.books(title,author,category,description) values('Libro existente','Autora','Espiritualidad','Descripción existente');");
  await db.exec(readFileSync('supabase/migrations/202610270001_reader_updates.sql','utf8'));
  const [profile]=(await db.query('select alias,bio,first_name,last_name from public.profiles')).rows;
  expect(profile).toEqual({alias:'Ana',bio:'Perfil existente',first_name:null,last_name:null});
  expect((await db.query('select title from public.books')).rows).toEqual([{title:'Libro existente'}]);
  expect((await db.query('select * from public.get_book_read_counts()')).rows).toEqual([]);
 }finally{await db.close();}
});
