// @vitest-environment jsdom
import React,{act} from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {createRoot,type Root} from 'react-dom/client';
const {state}=vi.hoisted(()=>({state:{session:{user:{id:'reader'}},member:{role:'reader',suspended:false},profile:{alias:'Ana'},authLoading:false,loading:false,authError:'',refreshMember:async()=>{},reload:async()=>{}}}));
vi.mock('../src/lib/store',()=>({useStore:()=>state}));
import {Guard} from '../src/pages/Account';
let root:Root;let host:HTMLDivElement;
(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(async()=>{await act(async()=>root?.unmount());host?.remove();state.loading=false;state.authLoading=false;});
it.each(['loading','authLoading'] as const)('preserves unsaved forms during background %s',async key=>{
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 const render=()=>root.render(<Guard><textarea defaultValue="" aria-label="Borrador"/></Guard>);
 await act(async()=>render());
 const textarea=host.querySelector('textarea')!;textarea.value='Mi reflexión sin enviar';
 state[key]=true;await act(async()=>render());
 expect(host.querySelector('textarea')).toBe(textarea);
 expect(host.querySelector('textarea')?.value).toBe('Mi reflexión sin enviar');
});
