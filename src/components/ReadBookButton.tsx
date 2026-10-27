import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {BookOpen,Check,Loader2} from 'lucide-react';
import {backend} from '../lib/backend';
import {profileIsComplete} from '../lib/domain';
import {useStore} from '../lib/store';
import {Notice} from './ui';
export function ReadBookButton({bookId}:{bookId:string}) {
 const {session,member,profile,completed,reload}=useStore();
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 if(!session)return <Link className="button secondary" to="/entrar"><BookOpen size={18}/>Ya lo leí</Link>;
 if(!profileIsComplete(profile))return <Link className="button secondary" to="/mi-espacio">Completar nombre y apellido</Link>;
 const read=completed.some(row=>row.user_id===session.user.id&&row.book_id===bookId);
 return <div className="read-book-control"><button className={`button secondary ${read?'is-read':''}`} aria-pressed={read} disabled={busy||!member||member.suspended} title={read?'Quitar la marca de leído':'Registrar que terminaste este libro'} onClick={async()=>{
  if(busy)return;setBusy(true);setError('');
  try{await backend.rpc('set_book_read',{p_book_id:bookId,p_read:!read});await reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }}>{busy?<Loader2 size={18} className="spin"/>:read?<Check size={18}/>:<BookOpen size={18}/>}Ya lo leí</button>{error&&<Notice error>{error}</Notice>}</div>;
}
