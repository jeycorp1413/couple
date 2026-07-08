// 평일 오전 8시(KST) 응원 푸시 → 두 폰 모두
// 08:00 KST = 23:00 UTC
import { shouldSkipToday, sendToAll } from '../shared/hearts.mjs';

export default async () => {
  if (shouldSkipToday()) return new Response('skip (weekend/holiday)');
  const sent = await sendToAll('정용 💗 지영', '♥오늘도 화이팅♥');
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '0 23 * * *' };
