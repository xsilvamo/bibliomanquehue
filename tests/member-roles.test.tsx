// @vitest-environment jsdom
import React,{act} from 'react';
import {it,expect,afterEach,vi} from 'vitest';
import {createRoot,type Root} from 'react-dom/client';
import {MemberRoleEditor} from '../src/components/MemberRoleEditor';
import {backend} from '../src/lib/backend';
let root:Root,host:HTMLDivElement;
(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(async()=>{await act(async()=>root?.unmount());host?.remove();vi.restoreAllMocks();});
async function render(node:React.ReactNode){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(node));}
it('changes another member’s role only on explicit save',async()=>{
 const rpc=vi.spyOn(backend,'rpc').mockResolvedValue(undefined);const changed=vi.fn(async()=>{});
 await render(<MemberRoleEditor member={{user_id:'reader',role:'reader',suspended:false}} own={false} label="Ana Pérez" onChanged={changed}/>);
 const select=host.querySelector('select')!;
 expect(Array.from(select.options).map(o=>o.textContent)).toEqual(['Lector','Ayudante','Administrador']);
 await act(async()=>{select.value='helper';select.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(rpc).not.toHaveBeenCalled();
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(rpc).toHaveBeenCalledWith('set_member_role',{p_user_id:'reader',p_role:'helper'});expect(changed).toHaveBeenCalledOnce();
});
it('blocks changing one’s own role and shows server errors without claiming success',async()=>{
 await render(<MemberRoleEditor member={{user_id:'admin',role:'admin',suspended:false}} own label="Yo" onChanged={async()=>{}}/>);
 expect(host.querySelector('select')!.disabled).toBe(true);
 const changed=vi.fn(async()=>{});vi.spyOn(backend,'rpc').mockRejectedValue(new Error('Acceso reservado'));
 await act(async()=>root.render(<MemberRoleEditor key="other" member={{user_id:'reader',role:'reader',suspended:false}} own={false} label="Ana" onChanged={changed}/>));
 const select=host.querySelector('select')!;
 await act(async()=>{select.value='admin';select.dispatchEvent(new Event('change',{bubbles:true}));});
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(host.querySelector('[role="alert"]')?.textContent).toContain('Acceso reservado');expect(changed).not.toHaveBeenCalled();
});
