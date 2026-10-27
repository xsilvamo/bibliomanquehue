import React from 'react';
export function AdminNavigation({value,pending,onChange}:{value:string;pending:number;onChange:(value:string)=>void}) {
 const sections=[['moderacion',`Por revisar (${pending})`],['libros','Libros'],['publicadas','Publicadas'],['lectores','Lectores e invitaciones'],['respaldo','Respaldos']];
 return <>
  <label className="admin-section-select"><span>Sección de administración</span><select aria-label="Sección de administración" value={value} onChange={event=>onChange(event.target.value)}>{sections.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  <div className="tabs admin-tabs" role="tablist" aria-label="Administración" onKeyDown={event=>{
   const index=sections.findIndex(([id])=>id===value);
   const next=event.key==='ArrowRight'?(index+1)%sections.length:event.key==='ArrowLeft'?(index+sections.length-1)%sections.length:event.key==='Home'?0:event.key==='End'?sections.length-1:-1;
   if(next<0)return;event.preventDefault();onChange(sections[next][0]);event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }}>{sections.map(([id,label])=><button key={id} role="tab" aria-selected={value===id} aria-controls="admin-panel" id={`admin-${id}`} tabIndex={value===id?0:-1} onClick={()=>onChange(id)}>{label}</button>)}</div>
 </>;
}
