// خالص — يحفظ ملفات التطبيق في الجوال ليعمل بدون إنترنت.
// عند تعديل أي ملف، غيّر رقم النسخة هنا (khales-v2، v3...) ليصل التحديث للمستخدمين.
const CACHE = 'khales-v7';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'content.js', 'learn.js', 'hakba.js', 'firebase-config.js', 'manifest.webmanifest',
  'fonts/readex-pro-arabic-wght-normal.woff2', 'fonts/readex-pro-latin-wght-normal.woff2',
  'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png', 'favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  // أول تثبيت يتفعّل مباشرة؛ التحديثات تنتظر حتى يضغط المستخدم «حدّث الآن»
  if (!self.registration.active) self.skipWaiting();
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// من الجوال أولًا (سريع وبدون نت)، وفي الخلفية يجلب نسخة أحدث إن وُجد إنترنت.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(cache =>
    cache.match(e.request, { ignoreSearch: true }).then(hit => {
      const net = fetch(e.request).then(res => { if (res && res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => hit || cache.match('index.html'));
      return hit || net;
    })));
});
