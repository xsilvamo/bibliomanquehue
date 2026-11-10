// @vitest-environment jsdom
import React,{act} from 'react';
import {it,expect,vi} from 'vitest';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {Provider} from '../src/lib/store';
import {ReaderProfile} from '../src/pages/Public';
import {backend} from '../src/lib/backend';
(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;
it('loads public finished books for a visitor through the provider',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 vi.spyOn(backend,'configured','get').mockReturnValue(true);
 vi.spyOn(backend,'read').mockImplementation(async(table)=>{
  if(table==='books')return [{id:'b1',title:'Libro leído públicamente',author:'Autora',category:'Espiritualidad',description:'Texto',isbn:'',cover_url:null,featured:false,archived:false,created_at:'2026-11-10'}] as never;
  if(table==='profiles')return [{id:'p1',alias:'Ana Pérez',first_name:'Ana',last_name:'Pérez',bio:'',created_at:'2026-11-10'}] as never;
  return [];
 });
 vi.spyOn(backend,'rpc').mockImplementation(async(name)=>name==='get_public_book_reads'?[{user_id:'p1',book_id:'b1'}]:[]);
 try{
  await act(async()=>root.render(<MemoryRouter initialEntries={['/lectores/p1']}><Provider><Routes><Route path="/lectores/:id" element={<ReaderProfile/>}/></Routes></Provider></MemoryRouter>));
  expect(host.querySelector('.book-card h3')?.textContent).toBe('Libro leído públicamente');
 }finally{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();}
});
