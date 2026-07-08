// 평일 오후 5시(KST) 수고 푸시 → 두 폰 모두
// 17:00 KST = 08:00 UTC
import { shouldSkipToday, sendToAll } from '../shared/hearts.mjs';

export default async () => {
  if (shouldSkipToday()) return new Response('skip (weekend/holiday)');
  const sent = await sendToAll('정용 💗 지영', '♥오늘도 수고했어♥');
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '0 8 * * *' };
