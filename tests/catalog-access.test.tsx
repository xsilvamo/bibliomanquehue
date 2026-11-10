// @vitest-environment jsdom
import React,{act} from 'react';
import {it,expect,afterEach,vi} from 'vitest';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
const {state}=vi.hoisted(()=>({state:{session:{user:{id:'helper'}},member:{role:'helper',suspended:false},profile:{alias:'Ana Pérez',first_name:'Ana',last_name:'Pérez'},books:[{id:'book',title:'Libro existente',author:'Autora',category:'Espiritualidad',description:'Texto',isbn:'',cover_url:null,archived:false,featured:false,created_at:'2026-11-10'}],authLoading:false,loading:false,hasLoaded:true,error:'',authError:'',refreshMember:async()=>{},reload:async()=>{}}}));
vi.mock('../src/lib/store',()=>({useStore:()=>state}));
import {Guard} from '../src/pages/Account';
import CatalogManager from '../src/pages/CatalogManager';
import {backend} from '../src/lib/backend';
let root:Root,host:HTMLDivElement;
(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(async()=>{await act(async()=>root?.unmount());host?.remove();vi.restoreAllMocks();state.member.role='helper';state.member.suspended=false;});
async function render(node:React.ReactNode){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<MemoryRouter>{node}</MemoryRouter>));}
it('lets helpers access only the catalog route and blocks readers or suspended helpers',async()=>{
 await render(<Guard catalog><p>Catálogo permitido</p></Guard>);expect(host.textContent).toContain('Catálogo permitido');
 await act(async()=>root.render(<MemoryRouter><Guard admin><p>Admin permitido</p></Guard></MemoryRouter>));expect(host.textContent).not.toContain('Admin permitido');
 state.member.role='reader';await act(async()=>root.render(<MemoryRouter><Guard catalog><p>Catálogo permitido</p></Guard></MemoryRouter>));expect(host.textContent).not.toContain('Catálogo permitido');
 state.member.role='helper';state.member.suspended=true;await act(async()=>root.render(<MemoryRouter><Guard catalog><p>Catálogo permitido</p></Guard></MemoryRouter>));expect(host.textContent).not.toContain('Catálogo permitido');
});
it('offers helpers only adding and editing and saves edited fields through the restricted RPC',async()=>{
 const rpc=vi.spyOn(backend,'rpc').mockResolvedValue(undefined);
 await render(<CatalogManager/>);
 expect(host.textContent).toContain('Libro existente');
 for(const word of ['Importar CSV','Archivar','Borrar','Lectores e invitaciones','Respaldos','Por revisar'])expect(host.textContent).not.toContain(word);
 await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Editar Libro existente"]')!.click());
 const title=host.querySelector<HTMLInputElement>('input[name="title"]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(title,'Libro corregido');title.dispatchEvent(new Event('input',{bubbles:true}));});
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(rpc).toHaveBeenCalledWith('save_catalog_book',{p_book_id:'book',p_book:{title:'Libro corregido',author:'Autora',category:'Espiritualidad',description:'Texto',isbn:'',cover_url:null}});
});
