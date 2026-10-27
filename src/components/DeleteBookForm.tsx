import React,{useState} from 'react';
import {Trash2,Loader2} from 'lucide-react';
import type {Book} from '../lib/domain';
import {Notice} from './ui';
export function DeleteBookForm({book,onDelete,onCancel}:{book:Pick<Book,'id'|'title'>;onDelete:(args:{p_book_id:string;p_confirm_title:string})=>Promise<boolean>;onCancel:()=>void}) {
 const [title,setTitle]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 return <form className="form-card delete-book-panel" aria-label={`Eliminar ${book.title}`} onSubmit={async event=>{
  event.preventDefault();if(busy)return;
  if(title.trim()!==book.title.trim()){setError('Escribe el título exacto para confirmar.');return;}
  setBusy(true);setError('');
  try{if(await onDelete({p_book_id:book.id,p_confirm_title:title.trim()}))onCancel();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }}>
  <h2>Eliminar «{book.title}»</h2>
  <p>Se borrarán definitivamente este libro, sus reflexiones y versiones, y sus registros en listas de lectura y libros leídos. Esta acción no se puede deshacer.</p>
  <p className="form-help">Si solo quieres ocultarlo, puedes archivarlo para conservar su información. Las imágenes de portada no se borran automáticamente porque podrían usarse en otra ficha.</p>
  <label htmlFor="delete-book-title">Para confirmar, escribe: <strong>{book.title}</strong></label>
  <input id="delete-book-title" value={title} onChange={event=>setTitle(event.target.value)} autoComplete="off" required autoFocus disabled={busy}/>
  {error&&<Notice error>{error}</Notice>}
  <div className="form-actions"><button type="submit" className="button danger-button" disabled={busy||title.trim()!==book.title.trim()}>{busy?<Loader2 className="spin" size={17}/>:<Trash2 size={17}/>}Eliminar definitivamente</button><button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Cancelar</button></div>
 </form>;
}
