const CACHE='dotfront-app-v36';
const ASSETS=['./','./index.html','./app.css?v=35','./ads.js?v=27',
  './historical_missions.js?v=27','./campaign_250.js?v=35','./app.js?v=36','./bootstrap.js?v=35',
  './version.json','./manifest.webmanifest','./icons/icon-192.png',
  './icons/icon-512.png','./icons/icon-180.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))
    .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys
    .filter(key=>key.startsWith('dotfront-app-')&&key!==CACHE)
    .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  // Update metadata is always fetched from the network and never saved.
  if(url.pathname.endsWith('/version.json'))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){
      const clone=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,clone)));
    }
    return response;
  }).catch(()=>caches.match(event.request)));
});
