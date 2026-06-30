/* 우리 캘린더 — 서비스워커 (푸시 수신용)
   index.html과 같은 폴더(루트)에 두세요. push.js가 자동 등록합니다. */

self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: '우리 캘린더', body: event.data ? event.data.text() : '' }; }

  var title = data.title || '정용 💗 지영';
  var options = {
    body: data.body || '새 소식이 있어요 💗',
    badge: data.badge,
    data: { url: data.url || '/' },
    vibrate: [80, 40, 80],
    tag: data.tag || undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
