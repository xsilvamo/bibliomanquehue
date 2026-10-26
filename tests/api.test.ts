// @vitest-environment jsdom
import { it, expect, afterEach, vi } from 'vitest';
import { Backend } from '../src/lib/backend';
afterEach(()=>{localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();});
it('does not invent records when no backend has been configured',async()=>{
 const backend=new Backend('','');
 expect(await backend.read('books')).toEqual([]);
 await expect(backend.rpc('save_profile',{})).rejects.toThrow(/disponible/);
});
it('surfaces a database rejection rather than reporting a successful save',async()=>{
 const backend=new Backend('https://project.supabase.co','public-key',async()=>new Response(JSON.stringify({message:'Esta cuenta necesita una invitación.'}),{status:403}));
 await expect(backend.rpc('save_profile',{})).rejects.toThrow(/invitación/);
});
it('exchanges an OAuth code using the locally stored PKCE verifier and removes it',async()=>{
 sessionStorage.setItem('manquepe:verifier','secret-verifier');
 let requestBody:Record<string,string>={};
 const backend=new Backend('https://project.supabase.co','public-key',async(_input,init)=>{
  requestBody=JSON.parse(init?.body as string);
  return new Response(JSON.stringify({access_token:'access',refresh_token:'refresh',expires_in:3600,user:{id:'reader'}}),{status:200});
 });
 await backend.exchangeCode('returned-code');
 expect(requestBody).toEqual({auth_code:'returned-code',code_verifier:'secret-verifier'});
 expect(backend.session?.user.id).toBe('reader');
 expect(sessionStorage.getItem('manquepe:verifier')).toBeNull();
});
it('refreshes an expiring session before reading and clears it after an invalid refresh',async()=>{
 localStorage.setItem('manquepe:session',JSON.stringify({access_token:'expired',refresh_token:'old',expires_at:0,user:{id:'reader'}}));
 const backend=new Backend('https://project.supabase.co','public-key',async()=>new Response(JSON.stringify({error_description:'Sesión vencida'}),{status:400}));
 await expect(backend.read('books')).rejects.toThrow(/Sesión/);
 expect(backend.session).toBeNull();
 expect(localStorage.getItem('manquepe:session')).toBeNull();
});
it('keeps a recoverable session when a refresh fails only because of connectivity',async()=>{
 localStorage.setItem('manquepe:session',JSON.stringify({access_token:'expired',refresh_token:'still-valid',expires_at:0,user:{id:'reader'}}));
 const backend=new Backend('https://project.supabase.co','public-key',async()=>{throw new TypeError('Failed to fetch');});
 await expect(backend.read('books')).rejects.toThrow();
 expect(backend.session?.user.id).toBe('reader');
 expect(localStorage.getItem('manquepe:session')).not.toBeNull();
});
