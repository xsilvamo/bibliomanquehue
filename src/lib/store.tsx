import React, {createContext,useContext,useEffect,useState,useCallback,useRef,type ReactNode} from 'react';
import {backend,type Session} from './backend';
import type {Book,Profile,Member,Reflection,ReadingItem} from './domain';
type Data={books:Book[];profiles:Profile[];reflections:Reflection[];reading:ReadingItem[]};
const empty:Data={books:[],profiles:[],reflections:[],reading:[]};
type Store=Data & {loading:boolean;hasLoaded:boolean;error:string;reload:()=>Promise<void>;session:Session|null;member:Member|null;profile:Profile|undefined;authLoading:boolean;authError:string;refreshMember:()=>Promise<void>};
const Context=createContext<Store|null>(null);
export function Provider({children}:{children:ReactNode}){
 const [data,setData]=useState<Data>(empty);const [loading,setLoading]=useState(true);const [hasLoaded,setHasLoaded]=useState(false);const dataRequest=useRef(0);const memberRequest=useRef(0);const currentIdentity=useRef(backend.session?.user.id);const [error,setError]=useState('');
 const [session,setSession]=useState(backend.session);const [member,setMember]=useState<Member|null>(null);const [authLoading,setAuthLoading]=useState(!!backend.session);const [authError,setAuthError]=useState('');
 const reload=useCallback(async()=>{const request=++dataRequest.current;const identity=backend.session?.user.id;setLoading(true);setError('');try{
  const [books,profiles,reflections,reading]=await Promise.all([backend.read<Book>('books',{order:'created_at.desc'}),backend.read<Profile>('profiles',{order:'alias.asc'}),backend.read<Reflection>('reflections',{body:'not.is.null',order:'published_at.desc'}),backend.read<ReadingItem>('reading_list',{order:'created_at.desc'})]);
  if(request!==dataRequest.current||identity!==backend.session?.user.id)return;
  setHasLoaded(true);setData({books:books.filter(b=>!b.archived),profiles:profiles.filter(p=>p.alias),reflections,reading});
 }catch(e){if(request===dataRequest.current)setError((e as Error).message);}finally{if(request===dataRequest.current)setLoading(false);}},[]);
 const refreshMember=useCallback(async()=>{
  const request=++memberRequest.current;setAuthError('');if(!backend.session){setMember(null);setAuthLoading(false);return;}
  setAuthLoading(true);try{const [row]=await backend.read<Member>('memberships',{user_id:`eq.${backend.session.user.id}`});if(request===memberRequest.current)setMember(row??null);}catch(e){if(request===memberRequest.current)setAuthError((e as Error).message);}finally{if(request===memberRequest.current)setAuthLoading(false);}
 },[]);
 useEffect(()=>backend.subscribe(()=>{if(currentIdentity.current!==backend.session?.user.id){currentIdentity.current=backend.session?.user.id;setData(empty);setHasLoaded(false);setMember(null);}setSession(backend.session);void refreshMember();void reload();}),[refreshMember,reload]);
 useEffect(()=>{void reload();void refreshMember();},[reload,refreshMember]);
 // Refresh authorization when returning to the tab; the server still checks every write.
 useEffect(()=>{const focus=()=>{void refreshMember();};window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[refreshMember]);
 return <Context.Provider value={{...data,loading,hasLoaded,error,reload,session,member,authLoading,authError,refreshMember,profile:data.profiles.find(p=>p.id===session?.user.id)}}>{children}</Context.Provider>;
}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('Provider missing');return value;}
