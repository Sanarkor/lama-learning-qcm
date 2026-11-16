const C='qcmc-v33';
const AUDIO='qcmc-audio-v1';
const F=['./','index.html','app.js','data.js','manifest.webmanifest','voice_match.js?v=33','voice.js?v=33','voice.css?v=33','succ_core.js?v=26','succ.js?v=26','succ.css?v=29','desktop.css?v=33','desktop.js?v=33'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==AUDIO).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  var u=new URL(e.request.url);
  if(u.pathname.indexOf('/audio/')!==-1){
    e.respondWith(caches.open(AUDIO).then(function(c){return c.match(e.request).then(function(hit){return fetch(e.request).then(function(r){if(r&&r.ok)c.put(e.request,r.clone());return r;}).catch(function(){return hit||new Response('',{status:404,statusText:'Not Found'});});});}));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
});
