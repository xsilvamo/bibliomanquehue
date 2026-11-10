import {it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {bootstrapDatabase} from './helpers/database';
it('publishes only book and reader IDs for visible active profiles and active books without opening the private table',async()=>{
 const db=new PGlite();
 const ana='00000000-0000-4000-8000-000000000011';
 const ben='00000000-0000-4000-8000-000000000012';
 const hidden='00000000-0000-4000-8000-000000000013';
 try{
  await bootstrapDatabase(db);
  await db.exec("insert into public.invitations(email) values('ana@example.org'),('ben@example.org'),('hidden@example.org')");
  for(const [id,name] of [[ana,'ana'],[ben,'ben'],[hidden,'hidden']]){
   await db.query('insert into auth.users(id,email) values($1,$2)',[id,`${name}@example.org`]);
  }
  await db.query("update public.profiles set first_name='Ana',last_name='Pérez' where id=$1",[ana]);
  await db.query("update public.profiles set first_name='Ben',last_name='Soto' where id=$1",[ben]);
  const books=(await db.query<{id:string}>("insert into public.books(title,author,category,description) values('Libro visible','Autora','Espiritualidad','Texto'),('Libro archivado','Autora','Espiritualidad','Texto') returning id")).rows;
  await db.query('update public.books set archived=true where id=$1',[books[1].id]);
  for(const id of [ana,ben,hidden])for(const b of books)await db.query('insert into public.book_reads(user_id,book_id) values($1,$2)',[id,b.id]);
  await db.query('update public.memberships set suspended=true where user_id=$1',[ben]);
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   await db.query("select set_config('request.jwt.claim.sub',$1,false)",[role==='authenticated'?ana:'']);
   expect((await db.query('select * from public.get_public_book_reads()')).rows).toEqual([{user_id:ana,book_id:books[0].id}]);
   await expect(db.query('insert into public.book_reads(user_id,book_id) values($1,$2)',[ben,books[0].id])).rejects.toThrow();
   if(role==='anon')await expect(db.query('select * from public.book_reads')).rejects.toThrow();
   else expect((await db.query('select * from public.book_reads where user_id=$1',[ben])).rows).toEqual([]);
   await db.exec('reset role');
  }
  // Removing a read removes its public appearance as well.
  await db.query('delete from public.book_reads where user_id=$1',[ana]);
  await db.exec('set role anon');
  expect((await db.query('select * from public.get_public_book_reads()')).rows).toEqual([]);
 }finally{await db.close();}
});
