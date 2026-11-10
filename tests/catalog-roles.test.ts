import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {bootstrapDatabase} from './helpers/database';
const db=new PGlite();
const admin='00000000-0000-4000-8000-000000000021',helper='00000000-0000-4000-8000-000000000022',reader='00000000-0000-4000-8000-000000000023';
async function as(id:string|null,sql:string,args:unknown[]=[]){await db.exec(`set role ${id?'authenticated':'anon'}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);try{return (await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
const payload={title:'Libro del ayudante',author:'Autora',category:'Espiritualidad',description:'Descripción',isbn:'',cover_url:'https://example.org/cover.png'};
beforeAll(async()=>{await bootstrapDatabase(db);for(const [id,name] of [[admin,'admin'],[helper,'helper'],[reader,'reader']]){await db.query('insert into public.invitations(email) values($1)',[`${name}@example.org`]);await db.query('insert into auth.users(id,email) values($1,$2)',[id,`${name}@example.org`]);}await db.query("update public.memberships set role='admin' where user_id=$1",[admin]);});
afterAll(()=>db.close());
it('defaults invited accounts to reader and lets only active admins assign the three roles',async()=>{
 expect((await as(reader,'select role from public.memberships'))[0].role).toBe('reader');
 await expect(as(reader,'select public.set_member_role($1,$2)',[reader,'admin'])).rejects.toThrow();
 await expect(as(null,'select public.set_member_role($1,$2)',[reader,'admin'])).rejects.toThrow();
 for(const role of ['helper','admin','reader','helper']){await as(admin,'select public.set_member_role($1,$2)',[helper,role]);expect((await as(helper,'select role from public.memberships where user_id=$1',[helper]))[0].role).toBe(role);}
 for(const role of ['owner','',null])await expect(as(admin,'select public.set_member_role($1,$2)',[helper,role])).rejects.toThrow();
 await expect(as(admin,'select public.set_member_role($1,$2)',[admin,'reader'])).rejects.toThrow(/propio/i);
 await expect(as(admin,'select public.set_member_role($1,$2)',['00000000-0000-4000-8000-000000000099','reader'])).rejects.toThrow(/encontr/i);
 await expect(as(helper,"update public.memberships set role='admin' where user_id=$1",[helper])).rejects.toThrow();
});
it('allows helpers to add and edit catalog fields but never archive, feature, delete, or import books',async()=>{
 await as(admin,'select public.set_member_role($1,$2)',[helper,'helper']);
 await as(helper,'select public.save_catalog_book($1::jsonb,null)',[JSON.stringify({...payload,archived:true,featured:true})]);
 const [book]=await as(null,'select * from public.books where title=$1',[payload.title]);
 expect(book.archived).toBe(false);expect(book.featured).toBe(false);
 await as(helper,'select public.save_catalog_book($1::jsonb,$2)',[JSON.stringify({...payload,title:'Editado',id:reader,archived:true,featured:true}),book.id]);
 expect((await as(null,'select title from public.books where id=$1',[book.id]))[0].title).toBe('Editado');
 await expect(as(helper,'update public.books set archived=true where id=$1',[book.id])).resolves.toEqual([]);
 expect((await as(null,'select archived from public.books where id=$1',[book.id]))[0].archived).toBe(false);
 await expect(as(helper,'select public.delete_book($1,$2)',[book.id,'Editado'])).rejects.toThrow();
 await expect(as(helper,'select public.import_books($1::jsonb)',[JSON.stringify([payload])])).rejects.toThrow();
 await expect(as(reader,'select public.save_catalog_book($1::jsonb,null)',[JSON.stringify(payload)])).rejects.toThrow();
 await expect(as(null,'select public.save_catalog_book($1::jsonb,null)',[JSON.stringify(payload)])).rejects.toThrow();
 await as(admin,'update public.books set archived=true where id=$1',[book.id]);
 await expect(as(helper,'select public.save_catalog_book($1::jsonb,$2)',[JSON.stringify(payload),book.id])).rejects.toThrow(/catálogo/i);
 await expect(as(helper,'select public.save_catalog_book($1::jsonb,null)',[JSON.stringify({...payload,title:''})])).rejects.toThrow();
});
it('allows uploading new covers but reserves replacement, deletion and other buckets for administrators',async()=>{
 await as(helper,"insert into storage.objects(bucket_id,name) values('covers','helper.png')");
 expect(await as(helper,"update storage.objects set name='changed.png' where name='helper.png' returning name")).toEqual([]);
 expect(await as(helper,"delete from storage.objects where name='helper.png' returning name")).toEqual([]);
 await expect(as(helper,"insert into storage.objects(bucket_id,name) values('private','bad.png')")).rejects.toThrow();
});
it('keeps helpers away from administrative data and operations and blocks suspended or demoted helpers',async()=>{
 expect(await as(helper,'select * from public.invitations')).toEqual([]);
 expect(await as(helper,'select * from public.reflection_submissions')).toEqual([]);
 expect(await as(helper,'select * from public.memberships where user_id<>$1',[helper])).toEqual([]);
 for(const [sql,args] of [['select public.manage_invitation($1,true)',['new@example.org']],['select public.set_member_suspended($1,true)',[reader]],['select public.set_member_role($1,$2)',[reader,'admin']],['select public.moderate_submission($1,true,$2)',[reader,'']]] as [string,unknown[]][]){await expect(as(helper,sql,args)).rejects.toThrow();}
 await as(admin,'select public.set_member_suspended($1,true)',[helper]);
 await expect(as(helper,'select public.save_catalog_book($1::jsonb,null)',[JSON.stringify(payload)])).rejects.toThrow();
 await expect(as(helper,"insert into storage.objects(bucket_id,name) values('covers','suspended.png')")).rejects.toThrow();
 await as(admin,'select public.set_member_suspended($1,false)',[helper]);
 await as(admin,'select public.set_member_role($1,$2)',[helper,'reader']);
 await expect(as(helper,'select public.save_catalog_book($1::jsonb,null)',[JSON.stringify(payload)])).rejects.toThrow();
});
