import React,{Suspense,lazy,useEffect} from 'react';
import {Routes,Route,useLocation} from 'react-router-dom';
import {Provider} from './lib/store';
import {Layout} from './components/Layout';
import {Spinner} from './components/ui';
import {Home,Catalog,Reflections,Readers,ReaderProfile,About,Contact,Guidelines,NotFound} from './pages/Public';
import {BookPage} from './pages/Book';
import {Account,Guard,Login} from './pages/Account';
const Admin=lazy(()=>import('./pages/Admin'));
function PageTitle(){const {pathname}=useLocation();useEffect(()=>{const names:Record<string,string>={'/':'Libros que nos acercan a Cristo','/biblioteca':'Biblioteca','/reflexiones':'Reflexiones','/lectores':'Lectores','/sobre':'Sobre Manquepe','/contacto':'Contacto','/convivencia':'Convivencia y privacidad','/entrar':'Entrar','/mi-espacio':'Mi espacio','/admin':'Administración'};document.title=`${names[pathname]??'Nuestra comunidad'} · Manquepe`;},[pathname]);return null;}
export function App(){return <Provider><PageTitle/><Layout><Suspense fallback={<Spinner/>}><Routes><Route path="/" element={<Home/>}/><Route path="/biblioteca" element={<Catalog/>}/><Route path="/biblioteca/:id" element={<BookPage/>}/><Route path="/reflexiones" element={<Reflections/>}/><Route path="/lectores" element={<Readers/>}/><Route path="/lectores/:id" element={<ReaderProfile/>}/><Route path="/sobre" element={<About/>}/><Route path="/contacto" element={<Contact/>}/><Route path="/convivencia" element={<Guidelines/>}/><Route path="/entrar" element={<Login/>}/><Route path="/mi-espacio" element={<Guard><Account/></Guard>}/><Route path="/admin" element={<Guard admin><Admin/></Guard>}/><Route path="*" element={<NotFound/>}/></Routes></Suspense></Layout></Provider>;}
