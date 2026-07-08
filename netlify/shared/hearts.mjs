// ───────────────────────────────────────────────────────────
//  공용 로직 — 정시 하트 푸시 (두 폰 모두에게)
//  · 평일(월~금)에만, 주말·대한민국 공휴일은 제외
//  · Firebase에 저장된 모든 구독(pushSubscriptions)에 발송
//  · VAPID 키는 기존 notify.mjs와 동일 (Netlify 환경변수 VAPID_PRIVATE 재사용)
// ───────────────────────────────────────────────────────────

import webpush from 'web-push';

const DB = 'https://young-94e97-default-rtdb.asia-southeast1.firebasedatabase.app';
const ROOT = 'couple';
const VAPID_PUBLIC = 'BF44yAoEEy2I3mvvE4jgAP6E31CImB3vkqTnf6HBS-moctl8QnDvuMMAPZ4URCgSbS1cz8Lb6Ap7deVSyB-9gMw';

webpush.setVapidDetails('mailto:jeycorp1413@gmail.com', VAPID_PUBLIC, process.env.VAPID_PRIVATE);

// 대한민국 공휴일(대체공휴일 포함). 연도별로 관리 — 매년 말 갱신 필요.
const HOLIDAYS = {
  2026: new Set([
    '01-01',                          // 신정
    '02-16', '02-17', '02-18',        // 설날 연휴
    '03-01', '03-02',                 // 삼일절 + 대체
    '05-05',                          // 어린이날
    '05-24', '05-25',                 // 부처님오신날 + 대체
    '06-06',                          // 현충일
    '08-15', '08-17',                 // 광복절 + 대체
    '09-24', '09-25', '09-26', '09-28', // 추석 연휴 + 대체
    '10-03', '10-05',                 // 개천절 + 대체
    '10-09',                          // 한글날
    '12-25',                          // 성탄절
  ]),
};

// 현재 시각을 KST(UTC+9) 기준으로 환산해 연/월/일/요일 반환
function kstParts() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return {
    year: kst.getUTCFullYear(),
    mmdd: String(kst.getUTCMonth() + 1).padStart(2, '0') + '-' + String(kst.getUTCDate()).padStart(2, '0'),
    dow: kst.getUTCDay(), // 0=일, 6=토
  };
}

// 오늘(KST)이 주말이거나 공휴일이면 true → 발송 건너뜀
export function shouldSkipToday() {
  const { year, mmdd, dow } = kstParts();
  if (dow === 0 || dow === 6) return true;            // 주말
  const set = HOLIDAYS[year];
  if (set && set.has(mmdd)) return true;              // 공휴일
  return false;
}

// 구독 중인 모든 기기(두 폰)로 푸시 발송
export async function sendToAll(title, body) {
  const res = await fetch(`${DB}/${ROOT}/pushSubscriptions.json`);
  const subsObj = res.ok ? (await res.json()) || {} : {};
  const msg = JSON.stringify({ title, body, url: '/' });
  let sent = 0;

  await Promise.all(
    Object.entries(subsObj).map(async ([key, s]) => {
      if (!s || !s.endpoint) return;
      try {
        await webpush.sendNotification(s, msg);
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await fetch(`${DB}/${ROOT}/pushSubscriptions/${key}.json`, { method: 'DELETE' });
        }
      }
    })
  );
  return sent;
}
