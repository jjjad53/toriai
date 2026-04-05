// ⚠️ 重要: 何かファイルを変更してpushする際は必ずCACHE_NAMEの末尾を変えること
const CACHE_NAME = 'toriai-20260405a';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => {
      const urls = ['./', './index.html', './style.css', './main.js', './calc.js', './storage.js', './weight.js', './final-overrides.js', './update-notifier.js'];
      return Promise.allSettled(urls.map(url => c.add(url)));
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => new Response('', {status: 503})))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
