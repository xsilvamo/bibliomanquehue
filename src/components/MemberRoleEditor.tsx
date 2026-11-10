import React,{useState} from 'react';
import type {Member} from '../lib/domain';
import {backend} from '../lib/backend';
import {Notice} from './ui';
export function MemberRoleEditor({member,own,label,onChanged}:{member:Member;own:boolean;label:string;onChanged:()=>Promise<void>}){
 const [role,setRole]=useState(member.role);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 return <form onSubmit={async e=>{e.preventDefault();if(own||busy||role===member.role)return;setBusy(true);setError('');try{await backend.rpc('set_member_role',{p_user_id:member.user_id,p_role:role});await onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
 <select aria-label={`Rol de ${label}`} disabled={own||busy} value={role} onChange={e=>{setRole(e.target.value as Member['role']);setError('');}}><option value="reader">Lector</option><option value="helper">Ayudante</option><option value="admin">Administrador</option></select>
 {!own&&<button className="text-link" type="submit" disabled={busy||role===member.role}>{busy?'Guardando…':'Guardar rol'}</button>}{own&&<small>Tu propio rol no se puede cambiar aquí.</small>}{error&&<Notice error>{error}</Notice>}
 </form>;
}
