import React,{useState} from 'react';
import {Plus,Pencil} from 'lucide-react';
import {useStore} from '../lib/store';
import {normalize,type Book} from '../lib/domain';
import {BookEditor} from '../components/BookEditor';
import {DataState,Empty} from '../components/ui';
export default function CatalogManager(){
 const {books,reload}=useStore();
 const [editing,setEditing]=useState<Book|null|undefined>(undefined);
 const [query,setQuery]=useState('');
 const visible=books.filter(b=>!b.archived&&normalize(`${b.title} ${b.author}`).includes(normalize(query)));
 return <div className="container page"><div className="page-intro"><span className="eyebrow">GESTIÓN DEL CATÁLOGO</span><h1>Los libros del librero</h1><p>Agrega libros físicos y mantén sus datos y portadas al día.</p></div><DataState><div className="admin-toolbar"><div className="search-field"><input type="search" aria-label="Buscar libros para editar" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar un libro…"/></div><button className="button" onClick={()=>setEditing(null)}><Plus size={17}/>Agregar libro</button></div>
 {editing!==undefined&&<BookEditor key={editing?.id??'new'} book={editing??undefined} catalogOnly onDone={async()=>{await reload();setEditing(undefined);}} onCancel={()=>setEditing(undefined)}/>}
 {visible.length?<div className="table-scroll" role="region" aria-label="Libros del catálogo" tabIndex={0}><table><thead><tr><th>Libro</th><th>Autor</th><th>Acción</th></tr></thead><tbody>{visible.map(book=><tr key={book.id}><td>{book.title}</td><td>{book.author}</td><td><button className="text-link" aria-label={`Editar ${book.title}`} onClick={()=>setEditing(book)}><Pencil size={16}/>Editar</button></td></tr>)}</tbody></table></div>:<Empty title={query?'No encontramos ese libro':'Un librero por registrar'}>{query?'Prueba con otro título o autor.':'Agrega el primer libro físico del catálogo.'}</Empty>}
 </DataState></div>;
}
