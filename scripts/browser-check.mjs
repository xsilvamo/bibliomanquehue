// Optional smoke test using an installed Chromium/Chrome, without a downloaded browser.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,extname,join} from 'node:path';
import assert from 'node:assert/strict';
const directory=resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.otf':'font/otf','.csv':'text/csv','.png':'image/png'};
const server=createServer(async(req,res)=>{try{const path=resolve(directory,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(directory+'/')&&path!==directory){res.writeHead(403).end();return;}let body;let file=path;try{body=await readFile(file);}catch{file=join(directory,'index.html');body=await readFile(file);}res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(body);}catch{res.writeHead(500).end();}});
let browser;let socket;let temporary;
try{
 await readFile(join(directory,'index.html'));
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
 const origin=`http://127.0.0.1:${server.address().port}`;
 temporary=await mkdtemp(join(tmpdir(),'manquepe-browser-'));
 const executable=process.env.BROWSER_BIN??'google-chrome';
 browser=spawn(executable,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${temporary}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
 const endpoint=await new Promise((ok,fail)=>{let output='';const timer=setTimeout(()=>fail(new Error('Chrome no inició en 15 segundos.')),15000);browser.once('error',e=>{clearTimeout(timer);fail(e);});browser.once('exit',()=>{clearTimeout(timer);fail(new Error('Chrome terminó antes de habilitar la comprobación.'));});browser.stderr.on('data',chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);ok(match[1]);}});});
 socket=new WebSocket(endpoint);
 await new Promise((ok,fail)=>{socket.addEventListener('open',ok,{once:true});socket.addEventListener('error',fail,{once:true});});
 let id=0;const pending=new Map();const errors=[];
 socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id&&pending.has(data.id)){const task=pending.get(data.id);clearTimeout(task.timer);pending.delete(data.id);data.error?task.fail(new Error(data.error.message)):task.ok(data.result);}if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);});
 const send=(method,params={},sessionId)=>new Promise((ok,fail)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);fail(new Error(`Timeout ${method}`));},15000);pending.set(n,{ok,fail,timer});socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const page=(method,params={})=>send(method,params,sessionId);
 await page('Page.enable');await page('Runtime.enable');
 const evaluate=async(expression)=>(await page('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const until=async(expression)=>{for(let i=0;i<60;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw new Error(`No se cumplió: ${expression}`);};
 await page('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await page('Page.navigate',{url:origin});
 await until("document.querySelector('h1')?.textContent.includes('Una lectura')");
 await until("!document.querySelector('[role=status].loading')");
 await evaluate('document.fonts.ready');
 await writeFile('/tmp/manquepe-escritorio.png',Buffer.from((await page('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
 await evaluate("document.querySelector('a[href=\"/biblioteca\"].button').click()");
 await until("document.querySelector('h1')?.textContent==='Nuestra biblioteca'");
 assert.ok(await evaluate("!!document.querySelector('input[aria-label=\"Buscar por título o autor\"]')"));
 await page('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true,'Desbordamiento horizontal');
 await evaluate("document.querySelector('button[aria-controls=\"main-nav\"]').click()");
 assert.equal(await evaluate("document.querySelector('button[aria-controls=\"main-nav\"]').getAttribute('aria-expanded')"),'true');
 await evaluate("document.querySelector('nav a[href=\"/sobre\"]').click()");
 await until("document.querySelector('h1')?.textContent.includes('Un librero que sigue')");
 assert.equal(await evaluate("document.querySelector('button[aria-controls=\"main-nav\"]').getAttribute('aria-expanded')"),'false');
 await page('Page.navigate',{url:origin+'/entrar'});
 await until("document.querySelector('h1')?.textContent==='Entra a la comunidad'");
 assert.ok(await evaluate("document.body.textContent.includes('Tu alias, descripción, reflexiones aprobadas y lista')"));
 await page('Page.navigate',{url:origin});
 await until("document.querySelector('h1')?.textContent.includes('Una lectura')");
 await evaluate('document.fonts.ready');
 await writeFile('/tmp/manquepe-movil.png',Buffer.from((await page('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
 // Exercise every public layout at narrow phones, landscape and tablet widths.
 const routes=[['/','Una lectura'],['/biblioteca','Nuestra biblioteca'],['/reflexiones','Lo que queda'],['/lectores','Quienes hacen'],['/sobre','Un librero'],['/entrar','Entra a la comunidad'],['/contacto','Hablemos'],['/convivencia','Convivencia y privacidad']];
 for(const width of [320,360,390,430,568,768,1024]){
  await page('Emulation.setDeviceMetricsOverride',{width,height:width===568?320:844,deviceScaleFactor:1,mobile:true});
  for(const [route,title] of routes){
   await page('Page.navigate',{url:origin+route});
   await until(`document.querySelector('h1')?.textContent.includes(${JSON.stringify(title)})`);
   await evaluate('document.fonts.ready.then(()=>true)');
   assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),true,`Desbordamiento en ${route}, ${width}px`);
   if(width<=1000){
    const badInputs=await evaluate("Array.from(document.querySelectorAll('input:not([type=checkbox]),textarea,select')).filter(el=>parseFloat(getComputedStyle(el).fontSize)<16).map(el=>el.getAttribute('aria-label')||el.id||el.tagName)");
    assert.deepEqual(badInputs,[],`Campos demasiado pequeños en ${route}, ${width}px`);
    const badTargets=await evaluate("Array.from(document.querySelectorAll('.button,.icon-button,.menu-toggle,.tabs button')).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<43.5||r.height<43.5)}).map(el=>el.getAttribute('aria-label')||el.textContent.trim())");
    assert.deepEqual(badTargets,[],`Controles táctiles pequeños en ${route}, ${width}px`);
   }
  }
 }
 await page('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await page('Page.navigate',{url:origin+'/biblioteca'});
 await until("document.querySelector('h1')?.textContent==='Nuestra biblioteca'");
 await evaluate("document.querySelector('button[aria-controls=\"main-nav\"]').click()");
 await until("document.body.style.overflow==='hidden'");
 assert.equal(await evaluate("document.activeElement===document.querySelector('#main-nav a')"),true);
 await page('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
 await until("document.querySelector('button[aria-controls=\"main-nav\"]').getAttribute('aria-expanded')==='false'");
 assert.equal(await evaluate("document.activeElement===document.querySelector('button[aria-controls=\"main-nav\"]')"),true);
 assert.deepEqual(errors,[],'Errores JavaScript del navegador');
 console.log('Smoke test correcto. Capturas: /tmp/manquepe-escritorio.png y /tmp/manquepe-movil.png');
}catch(error){console.error('No se completó la comprobación de navegador:',error.message);process.exitCode=1;}
finally{socket?.close();browser?.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));if(temporary)await rm(temporary,{recursive:true,force:true}).catch(()=>{});}
