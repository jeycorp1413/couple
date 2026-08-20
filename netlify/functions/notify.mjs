// ───────────────────────────────────────────────────────────
//  Netlify 함수 — 앱에서 새 항목이 등록되면 호출됨 → 상대 폰으로 푸시
//  파일 위치: netlify/functions/notify.mjs
//
//  Netlify 환경변수 (딱 1개만 필수):
//    VAPID_PRIVATE  ← 1단계에서 만든 Private Key (비공개! 코드에 안 넣음)
//  (VAPID_PUBLIC / DB주소는 공개값이라 아래에 박아둠)
// ───────────────────────────────────────────────────────────

import webpush from 'web-push';

const DB = 'https://young-94e97-default-rtdb.asia-southeast1.firebasedatabase.app';
const DEFAULT_ROOT = 'couple';
const ROOT_RE = /^[a-zA-Z0-9_-]{1,40}$/;

const VAPID_PUBLIC = 'BF44yAoEEy2I3mvvE4jgAP6E31CImB3vkqTnf6HBS-moctl8QnDvuMMAPZ4URCgSbS1cz8Lb6Ap7deVSyB-9gMw';

webpush.setVapidDetails(
  'mailto:jeycorp1413@gmail.com',
  VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

export default async (req) => {
  if (req.method !== 'POST') return new Response('use POST', { status: 405 });

  let payload = {};
  try { payload = await req.json(); } catch (e) {}
  const root = ROOT_RE.test(payload.root) ? payload.root : DEFAULT_ROOT;
  const title = payload.title || '💗 우리 캘린더';
  const body = payload.body || '새 소식이 있어요 💗';
  const senderKey = payload.senderKey || '';

  // 구독자 목록 읽기
  const res = await fetch(`${DB}/${root}/pushSubscriptions.json`);
  const subsObj = res.ok ? (await res.json()) || {} : {};

  const msg = JSON.stringify({ title, body, url: '/' });
  let sent = 0;

  await Promise.all(
    Object.entries(subsObj).map(async ([key, s]) => {
      if (key === senderKey) return;           // 보낸 사람 본인은 제외
      if (!s || !s.endpoint) return;
      try {
        await webpush.sendNotification(s, msg);
        sent++;
      } catch (err) {
        // 만료된 구독은 정리
        if (err.statusCode === 404 || err.statusCode === 410) {
          await fetch(`${DB}/${root}/pushSubscriptions/${key}.json`, { method: 'DELETE' });
        }
      }
    })
  );

  return new Response(JSON.stringify({ sent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
