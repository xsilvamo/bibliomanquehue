// @vitest-environment jsdom
import React,{act} from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
const {state}=vi.hoisted(()=>({state:{books:[{id:'a',title:'Destacado anterior',author:'Autora',category:'Espiritualidad',description:'Texto',cover_url:null,featured:true,archived:false},{id:'b',title:'Más leído',author:'Autora',category:'Espiritualidad',description:'Texto',cover_url:null,featured:false,archived:false}],readCounts:[{book_id:'a',read_count:1},{book_id:'b',read_count:5}],reflections:[],profiles:[],reading:[],session:null,loading:false,hasLoaded:true,error:'',reload:async()=>{}}}));
vi.mock('../src/lib/store',()=>({useStore:()=>state}));
import {Home} from '../src/pages/Public';
let root:Root;let host:HTMLDivElement;
(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(async()=>{await act(async()=>root?.unmount());host?.remove();state.readCounts=[{book_id:'a',read_count:1},{book_id:'b',read_count:5}];});
async function page(){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<MemoryRouter><Home/></MemoryRouter>));}
it('shows confirmed-reader order rather than admin featured status',async()=>{
 await page();
 expect(Array.from(host.querySelectorAll('.book-card h3')).map(el=>el.textContent)).toEqual(['Más leído','Destacado anterior']);
 expect(host.textContent).toContain('Los más leídos');
 expect(host.textContent).toContain('5 lectores');
});
it('does not invent a most-read ranking when no reader has confirmed a book',async()=>{
 state.readCounts=[];await page();
 expect(host.querySelectorAll('.book-card')).toHaveLength(0);
 expect(host.textContent).toContain('Aún no hay lecturas registradas');
});
