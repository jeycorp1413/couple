// 평일 정오 12시(KST) 맛점 푸시 → 두 폰 모두
// 12:00 KST = 03:00 UTC
import { shouldSkipToday, sendToAll } from '../shared/hearts.mjs';

export default async () => {
  if (shouldSkipToday()) return new Response('skip (weekend/holiday)');
  const sent = await sendToAll('정용 💗 지영', '♥맛점♥');
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '0 3 * * *' };
