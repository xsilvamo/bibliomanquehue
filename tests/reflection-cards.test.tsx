// @vitest-environment jsdom
import React,{act} from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import type {Reflection,Book,Profile} from '../src/lib/domain';
const {state}=vi.hoisted(()=>({state:{books:[] as Book[],profiles:[] as Profile[],reading:[],publicReads:[] as {user_id:string;book_id:string}[],session:null,reflections:[] as Reflection[],readCounts:[],loading:false,hasLoaded:true,error:'',reload:async()=>{}}}));
vi.mock('../src/lib/store',()=>({useStore:()=>state}));
import {Home,Reflections,ReaderProfile} from '../src/pages/Public';
import {BookPage} from '../src/pages/Book';
let root:Root;let host:HTMLDivElement;
(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;
const longBody='Una lectura compartida abre caminos. '.repeat(25)+'FINAL DE LA REFLEXIÓN';
const reflection:Reflection={id:'r1',book_id:'b1',author_id:'p1',body:longBody,featured:false,published_at:'2026-11-09T12:00:00Z',created_at:'2026-11-08T12:00:00Z'};
afterEach(async()=>{await act(async()=>root?.unmount());host?.remove();state.reflections=[];state.books=[];state.profiles=[];state.publicReads=[];});
async function page(element:React.ReactElement,entry='/'){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<MemoryRouter initialEntries={[entry]}>{element}</MemoryRouter>));}
function button(label:string){return Array.from(host.querySelectorAll('button')).find(b=>b.textContent===label)!;}
it('limits long home reflections and lets each reader expand and collapse them independently',async()=>{
 state.reflections=[reflection,{...reflection,id:'r2'}];await page(<Home/>);
 const bodies=host.querySelectorAll('.reflection-body');
 expect(bodies[0].textContent?.length).toBeLessThan(300);
 expect(bodies[0].textContent).not.toContain('FINAL DE LA REFLEXIÓN');
 const toggle=button('Mostrar más');
 expect(toggle.getAttribute('aria-expanded')).toBe('false');
 expect(toggle.getAttribute('aria-controls')).toBe(bodies[0].id);
 await act(async()=>toggle.click());
 expect(bodies[0].textContent).toBe(longBody);
 expect(bodies[1].textContent).not.toContain('FINAL DE LA REFLEXIÓN');
 expect(toggle.getAttribute('aria-expanded')).toBe('true');
 await act(async()=>button('Mostrar menos').click());
 expect(bodies[0].textContent).not.toContain('FINAL DE LA REFLEXIÓN');
});
it('keeps short home reflections complete without an unnecessary toggle',async()=>{
 state.reflections=[{...reflection,body:'Una reflexión breve.'}];await page(<Home/>);
 expect(host.querySelector('.reflection-body')?.textContent).toBe('Una reflexión breve.');
 expect(button('Mostrar más')).toBeUndefined();
});
it('previews reflections in the reflections menu and puts their publication date above the body',async()=>{
 state.reflections=[reflection];await page(<Reflections/>);
 const body=host.querySelector('.reflection-body')!;const time=host.querySelector('time')!;
 expect(body.textContent).not.toContain('FINAL DE LA REFLEXIÓN');
 await act(async()=>button('Mostrar más').click());
 expect(body.textContent).toBe(longBody);
 expect(time?.getAttribute('datetime')).toBe('2026-11-09T12:00:00Z');
 expect(time.compareDocumentPosition(body)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(host.querySelector('.reflection-author time')).toBeNull();
});
it('does not invent a publication date or a preview for an empty body',async()=>{
 state.reflections=[{...reflection,body:null,published_at:null}];await page(<Home/>);
 expect(host.querySelector('time')).toBeNull();expect(button('Mostrar más')).toBeUndefined();
});

it.each(['book','profile'])('previews long reflections on the %s page and allows reading the whole text',async(kind)=>{
 state.reflections=[reflection];
 state.books=[{id:'b1',title:'Libro de prueba',author:'Autora',category:'Espiritualidad',description:'Descripción',isbn:'',cover_url:null,featured:false,archived:false,created_at:'2026-11-08T12:00:00Z'}];
 state.profiles=[{id:'p1',alias:'Ana Pérez',first_name:'Ana',last_name:'Pérez',bio:'',created_at:'2026-11-08T12:00:00Z'}];
 // The router supplies the book/profile ID to the real page component.
 await page(<Routes><Route path="/:id" element={kind==='book'?<BookPage/>:<ReaderProfile/>}/></Routes>,kind==='book'?'/b1':'/p1');
 const body=host.querySelector('.reflection-body')!;
 expect(body.textContent).not.toContain('FINAL DE LA REFLEXIÓN');
 await act(async()=>button('Mostrar más').click());
 expect(body.textContent).toBe(longBody);
 await act(async()=>button('Mostrar menos').click());
 expect(body.textContent).not.toContain('FINAL DE LA REFLEXIÓN');
});

it('shows only three reflections on home while the reflections menu retains all of them',async()=>{
 state.reflections=Array.from({length:5},(_,i)=>({...reflection,id:`limit-${i}`,body:`Reflexión número ${i+1}`}));
 await page(<Home/>);
 expect(host.querySelectorAll('.reflection-card')).toHaveLength(3);
 expect(host.textContent).not.toContain('Reflexión número 4');
 expect(host.textContent).not.toContain('Reflexión número 5');
 const allLink=Array.from(host.querySelectorAll('a')).find(a=>a.textContent?.startsWith('Leer las reflexiones'));
 expect(allLink?.getAttribute('href')).toBe('/reflexiones');
 await act(async()=>root.render(<MemoryRouter><Reflections/></MemoryRouter>));
 expect(host.querySelectorAll('.reflection-card')).toHaveLength(5);
});

it('shows only the selected reader’s finished books in the public profile and explains an empty list',async()=>{
 state.books=[{id:'b1',title:'Libro terminado',author:'Autora',category:'Espiritualidad',description:'Texto',isbn:'',cover_url:null,featured:false,archived:false,created_at:'2026-11-08'}];
 state.profiles=[{id:'p1',alias:'Ana Pérez',first_name:'Ana',last_name:'Pérez',bio:'',created_at:'2026-11-08'},{id:'p2',alias:'Ben Soto',first_name:'Ben',last_name:'Soto',bio:'',created_at:'2026-11-08'}];
 state.publicReads=[{user_id:'p1',book_id:'b1'}];
 await page(<Routes><Route path="/:id" element={<ReaderProfile/>}/></Routes>,'/p1');
 const section=Array.from(host.querySelectorAll('section')).find(s=>s.querySelector('h2')?.textContent==='Ya lo leí');
 expect(section).toBeDefined();
 expect(section?.querySelector('.book-card h3')?.textContent).toBe('Libro terminado');
 expect(section?.querySelector('.cover-link')?.getAttribute('href')).toBe('/biblioteca/b1');
 await act(async()=>root.render(<MemoryRouter initialEntries={['/p2']} key="other-reader"><Routes><Route path="/:id" element={<ReaderProfile/>}/></Routes></MemoryRouter>));
 expect(host.querySelectorAll('.book-card')).toHaveLength(0);
 expect(host.textContent).toContain('Este lector todavía no ha marcado libros como leídos.');
});
