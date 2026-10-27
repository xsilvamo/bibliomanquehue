// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,it,expect,vi} from 'vitest';
const {state}=vi.hoisted(()=>({state:{session:{user:{id:'reader'}},member:{role:'reader',suspended:false},profile:{id:'reader',alias:'Ana',first_name:null as string|null,last_name:null as string|null,bio:''},completed:[] as {user_id:string;book_id:string;created_at:string}[],reload:async()=>{}}}));
vi.mock('../src/lib/store',()=>({useStore:()=>state}));
import {ProfileEditor} from '../src/pages/Account';
import {ReadBookButton} from '../src/components/ReadBookButton';
import {backend} from '../src/lib/backend';
let root:Root;let host:HTMLDivElement;
(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(async()=>{await act(async()=>root?.unmount());host?.remove();vi.restoreAllMocks();state.completed=[];state.profile.first_name=null;state.profile.last_name=null;state.reload=async()=>{};});
async function render(node:React.ReactNode){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<MemoryRouter>{node}</MemoryRouter>));}
async function input(selector:string,value:string){const el=host.querySelector<HTMLInputElement>(selector)!;expect(el).not.toBeNull();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
it('asks existing readers for explicit first and last names and sends both when saving',async()=>{
 const save=vi.spyOn(backend,'rpc').mockResolvedValue(undefined);
 await render(<ProfileEditor/>);
 expect(host.textContent).toContain('públicos');
 await input('input[autocomplete="given-name"]','Ana María');
 await input('input[autocomplete="family-name"]','Pérez Soto');
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(save).toHaveBeenCalledWith('save_reader_profile',{p_first_name:'Ana María',p_last_name:'Pérez Soto',p_bio:''});
 expect(host.textContent).toContain('Tu perfil quedó guardado.');
});
it('asks for a complete profile rather than registering a reading under a legacy alias',async()=>{
 await render(<ReadBookButton bookId="book"/>);
 expect(host.querySelector('a')?.getAttribute('href')).toBe('/mi-espacio');
 expect(host.textContent).toContain('nombre y apellido');
});
it('marks a finished book once and lets its reader undo the mark',async()=>{
 state.profile.first_name='Ana';state.profile.last_name='Pérez';
 const rpc=vi.spyOn(backend,'rpc').mockImplementation(async(_name,args)=>{state.completed=args.p_read?[{user_id:'reader',book_id:'book',created_at:'2026-10-27'}]:[];return undefined;});
// Simulate the provider publishing the freshly fetched records after the write.
 state.reload=async()=>{root.render(<MemoryRouter><ReadBookButton bookId="book"/></MemoryRouter>);};
 await render(<ReadBookButton bookId="book"/>);
 const button=()=>host.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
 expect(button().getAttribute('aria-pressed')).toBe('false');
 await act(async()=>button().click());
 expect(host.querySelector('[role=alert]')?.textContent).toBeUndefined();
 expect(rpc).toHaveBeenLastCalledWith('set_book_read',{p_book_id:'book',p_read:true});
 expect(state.completed).toHaveLength(1);
 expect(button().getAttribute('aria-pressed')).toBe('true');
 await act(async()=>button().click());
 expect(button().getAttribute('aria-pressed')).toBe('false');
 expect(rpc).toHaveBeenLastCalledWith('set_book_read',{p_book_id:'book',p_read:false});
});
