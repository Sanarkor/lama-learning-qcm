// Ancien service worker de Llama Learning : il se désinstalle et renvoie vers CapyGoat.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); })
    .then(function () { return self.registration.unregister(); })
    .then(function () { return self.clients.matchAll(); })
    .then(function (cs) { cs.forEach(function (c) { c.navigate('https://capygoat.vercel.app/'); }); }));
});
