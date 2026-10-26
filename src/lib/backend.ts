// Supabase REST boundaries: Auth (PKCE), PostgREST and Storage. No service key belongs here.
export type Session = {access_token:string;refresh_token:string;expires_at:number;user:{id:string}};
const SESSION='manquepe:session';
const VERIFIER='manquepe:verifier';
class HttpError extends Error {constructor(message:string,readonly status:number){super(message);}}
export class Backend {
  session:Session|null=null;
  readonly configured:boolean;
  private listeners=new Set<()=>void>();
  private refreshing:Promise<void>|null=null;
  private exchanging:Promise<void>|null=null;
  constructor(private url:string,private key:string,private fetcher:typeof fetch=globalThis.fetch.bind(globalThis)) {
    this.url=url.replace(/\/$/,'');this.configured=!!(url && key);
    this.restore();
    if(typeof window!=='undefined')window.addEventListener('storage',e=>{if(e.key===SESSION){this.restore();this.emit();}});
  }
  private restore(){try{const saved=JSON.parse(localStorage.getItem(SESSION)??'null');this.session=saved?.access_token&&saved?.refresh_token&&saved?.user?.id?saved:null;}catch{this.session=null;}}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
  private emit(){for(const fn of this.listeners)fn();}
  private save(data:Session|null){this.session=data;if(data)localStorage.setItem(SESSION,JSON.stringify(data));else localStorage.removeItem(SESSION);this.emit();}
  private async parse(response:Response){
    const data=await response.json().catch(()=>null);
    if(!response.ok){
      const message=data?.message||data?.error_description||data?.msg||data?.error||'No pudimos completar la operación. Inténtalo de nuevo.';
      if(data?.code==='23505')throw new Error('Este alias o registro ya existe. Elige otro.');
      throw new HttpError(typeof message==='string'?message:'No pudimos completar la operación.',response.status);
    }
    return data;
  }
  private async token(grant:string,body:Record<string,string>){
    let response:Response;
    try{response=await this.fetcher(`${this.url}/auth/v1/token?grant_type=${grant}`,{method:'POST',headers:{apikey:this.key,'Content-Type':'application/json'},body:JSON.stringify(body)});}catch{throw new Error('No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.');}
    const data=await this.parse(response);
    if(!data?.access_token || !data?.refresh_token || !data?.user?.id)throw new Error('La respuesta de acceso no es válida. Vuelve a entrar.');
    this.save({access_token:data.access_token,refresh_token:data.refresh_token,user:{id:data.user.id},expires_at:data.expires_at??Math.floor(Date.now()/1000)+(data.expires_in??3600)});
  }
  async access(){
    if(this.session && this.session.expires_at<Date.now()/1000+60){
      if(!this.refreshing){const refresh=this.session.refresh_token;this.refreshing=this.token('refresh_token',{refresh_token:refresh}).catch(e=>{if(e instanceof HttpError&&[400,401,403].includes(e.status))this.save(null);throw e;}).finally(()=>{this.refreshing=null;});}
      await this.refreshing;
    }
    return this.session?.access_token??this.key;
  }
  async signIn(){
    if(!this.configured)throw new Error('El acceso estará disponible pronto.');
    const bytes=crypto.getRandomValues(new Uint8Array(48));
    const verifier=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    sessionStorage.setItem(VERIFIER,verifier);
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
    const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const params=new URLSearchParams({provider:'google',redirect_to:`${location.origin}/entrar`,code_challenge:challenge,code_challenge_method:'s256',prompt:'select_account'});
    location.assign(`${this.url}/auth/v1/authorize?${params}`);
  }
  async exchangeCode(code:string){
    if(this.exchanging)return this.exchanging;
    const verifier=sessionStorage.getItem(VERIFIER);
    if(!verifier)throw new Error('Este acceso venció. Vuelve a entrar con Google desde este navegador.');
    this.exchanging=this.token('pkce',{auth_code:code,code_verifier:verifier}).finally(()=>{sessionStorage.removeItem(VERIFIER);this.exchanging=null;});
    return this.exchanging;
  }
  async signOut(){
    const token=this.session?.access_token;this.save(null);
    if(token)await this.fetcher(`${this.url}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:this.key,Authorization:`Bearer ${token}`}}).catch(()=>undefined);
  }
  async request<T>(path:string,init:RequestInit={}):Promise<T>{
    if(!this.configured)throw new Error('El acceso estará disponible pronto.');
    const token=await this.access();
    const headers=new Headers(init.headers);headers.set('apikey',this.key);headers.set('Authorization',`Bearer ${token}`);
    if(init.body && typeof init.body==='string')headers.set('Content-Type','application/json');
    let response:Response;
    try{response=await this.fetcher(`${this.url}${path}`,{...init,headers});}catch{throw new Error('No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.');}
    if(response.status===401 && this.session)this.save(null);
    return this.parse(response) as Promise<T>;
  }
  async read<T>(table:string,query:Record<string,string>={}):Promise<T[]>{
    if(!this.configured)return [];
    const all:T[]=[];
    for(let offset=0;;offset+=1000){
      const params=new URLSearchParams({select:'*',...query,limit:'1000',offset:String(offset)});
      const rows=await this.request<T[]>(`/rest/v1/${table}?${params}`);all.push(...rows);if(rows.length<1000)return all;
    }
  }
  rpc<T=void>(name:string,args:Record<string,unknown>):Promise<T>{return this.request<T>(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(args)});}
  async write<T>(table:string,body:unknown,id?:string):Promise<T[]>{
    return this.request<T[]>(`/rest/v1/${table}${id?`?id=eq.${encodeURIComponent(id)}`:''}`,{method:id?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
  }
  async uploadCover(file:File):Promise<string>{
    if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>2097152)throw new Error('Usa una portada JPG, PNG o WebP de hasta 2 MB.');
    const ext=file.type==='image/jpeg'?'jpg':file.type.split('/')[1];const path=`${crypto.randomUUID()}.${ext}`;
    await this.request(`/storage/v1/object/covers/${path}`,{method:'POST',headers:{'Content-Type':file.type},body:file});
    return `${this.url}/storage/v1/object/public/covers/${path}`;
  }
}
export const backend=new Backend(import.meta.env.VITE_SUPABASE_URL??'',import.meta.env.VITE_SUPABASE_ANON_KEY??'');
export const contactEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(import.meta.env.VITE_CONTACT_EMAIL??'')?import.meta.env.VITE_CONTACT_EMAIL:'';
