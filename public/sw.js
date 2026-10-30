const CACHE='sai-public-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/app-icon.svg'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sai-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
// Never cache authenticated HTML, API responses, user records or sign-in routes.
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate'&&event.request.method==='GET'){event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));}});
