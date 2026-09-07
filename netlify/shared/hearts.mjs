// ───────────────────────────────────────────────────────────
//  공용 로직 — 정시 하트 푸시 (두 폰 모두에게)
//  · 한 저장소를 여러 Netlify 사이트(정용/시윤/동영)가 함께 쓰므로,
//    사이트별 환경변수로 대상·키·문구를 고른다:
//      PUSH_ROOT      Firebase 경로 (couple | siyoon | dongyoung). 없으면 couple(정용 사이트)
//      VAPID_PUBLIC   해당 사이트 공개키 (없으면 정용 사이트 키)
//      VAPID_PRIVATE  해당 사이트 비공개키 (필수)
//  · 예약 함수 파일(heart-*.mjs)은 시각만 정하고 runSlot('슬롯명')을 호출한다.
//    PLANS[ROOT]에 그 슬롯이 없으면 그 사이트에선 조용히 건너뜀.
//  · 평일만(weekdaysOnly) 슬롯은 주말·대한민국 공휴일 제외
// ───────────────────────────────────────────────────────────

import webpush from 'web-push';

const DB = 'https://young-94e97-default-rtdb.asia-southeast1.firebasedatabase.app';
const ROOT = /^[a-zA-Z0-9_-]{1,40}$/.test(process.env.PUSH_ROOT || '') ? process.env.PUSH_ROOT : 'couple';
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || 'BF44yAoEEy2I3mvvE4jgAP6E31CImB3vkqTnf6HBS-moctl8QnDvuMMAPZ4URCgSbS1cz8Lb6Ap7deVSyB-9gMw';

webpush.setVapidDetails('mailto:jeycorp1413@gmail.com', VAPID_PUBLIC, process.env.VAPID_PRIVATE);

// 사이트별 정시 알림 계획. 슬롯명 → 예약 파일: morning=08:00 · ten=10:00 · noon=12:00 · evening=17:00 · night=21:30 (KST)
export const PLANS = {
  couple: {
    title: '정용 💗 지영',
    slots: {
      morning: { body: '♥오늘도 화이팅♥',                   weekdaysOnly: true  },
      noon:    { body: '♥맛점♥',                           weekdaysOnly: true  },
      evening: { body: '♥오늘도 수고했어♥',                 weekdaysOnly: true  },
      night:   { body: '빠오 오늘도 고생했어 낼을 위해 일찍자자💗', weekdaysOnly: false },
    },
  },
  dongyoung: {
    title: '동영 💗 지영',
    slots: {
      ten:     { body: '♥오늘도 화이팅♥',   weekdaysOnly: true  },   // 10:00 평일만
      noon:    { body: '♥맛점♥',           weekdaysOnly: false },   // 12:00 매일
      evening: { body: '♥오늘도 수고했어♥', weekdaysOnly: false },   // 17:00 매일
    },
  },
};

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
  2027: new Set([
    '01-01',                          // 신정
    '02-06', '02-07', '02-08', '02-09', // 설날 연휴 + 대체
    '03-01',                          // 삼일절
    '05-05',                          // 어린이날
    '05-13',                          // 부처님오신날
    '06-06',                          // 현충일
    '08-15', '08-16',                 // 광복절 + 대체
    '09-14', '09-15', '09-16',        // 추석 연휴
    '10-03', '10-04',                 // 개천절 + 대체
    '10-09', '10-11',                 // 한글날 + 대체
    '12-25', '12-27',                 // 성탄절 + 대체
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

// 예약 함수 공통 진입점: 이 사이트(ROOT)의 계획에 해당 슬롯이 있으면 발송
export async function runSlot(slot) {
  const plan = PLANS[ROOT];
  const s = plan && plan.slots[slot];
  if (!s) return new Response(`skip (no "${slot}" slot for ${ROOT})`);
  if (s.weekdaysOnly && shouldSkipToday()) return new Response('skip (weekend/holiday)');
  const sent = await sendToAll(plan.title, s.body);
  return new Response(JSON.stringify({ root: ROOT, slot, sent }), { headers: { 'Content-Type': 'application/json' } });
}
