// @vitest-environment jsdom
import React,{act} from 'react';
import {it,expect,afterEach,vi} from 'vitest';
import {createRoot,type Root} from 'react-dom/client';
import {AdminNavigation} from '../src/components/AdminNavigation';
import {DeleteBookForm} from '../src/components/DeleteBookForm';
let root:Root;let host:HTMLDivElement;
(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(async()=>{await act(async()=>root?.unmount());host?.remove();});
async function render(node:React.ReactNode){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(node));}
it('allows selecting an admin section without needing compressed tab labels',async()=>{
 let selected='';
 await render(<AdminNavigation value="moderacion" pending={12} onChange={value=>{selected=value;}}/>);
 const select=host.querySelector<HTMLSelectElement>('select[aria-label="Sección de administración"]')!;
 expect(select).not.toBeNull();expect(select.selectedOptions[0].textContent).toBe('Por revisar (12)');
 await act(async()=>{select.value='lectores';select.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(selected).toBe('lectores');
 expect(Array.from(select.options).map(o=>o.textContent)).toContain('Lectores e invitaciones');
});
it('requires the exact book title and an explicit submit before deleting',async()=>{
 const onDelete=vi.fn(async()=>true);
 await render(<DeleteBookForm book={{id:'book',title:'Mi libro'}} onDelete={onDelete} onCancel={()=>{}}/>);
 expect(host.textContent).toContain('reflexiones');
 const submit=host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
 expect(submit.disabled).toBe(true);
 const input=host.querySelector('input')!;
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
 await act(async()=>{setter.call(input,'Otro libro');input.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(submit.disabled).toBe(true);
 await act(async()=>{setter.call(input,'Mi libro');input.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(onDelete).not.toHaveBeenCalled();
 expect(submit.disabled).toBe(false);
 await act(async()=>submit.click());
 expect(onDelete).toHaveBeenCalledWith({p_book_id:'book',p_confirm_title:'Mi libro'});
});
it('keeps the deletion confirmation visible when the server rejects it',async()=>{
 await render(<DeleteBookForm book={{id:'book',title:'Mi libro'}} onDelete={async()=>false} onCancel={()=>{}}/>);
 const input=host.querySelector('input')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Mi libro');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await act(async()=>host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
 expect(host.querySelector('form')).not.toBeNull();
 expect(input.value).toBe('Mi libro');
});
