// 매일 밤 9시 반(KST) 굿나잇 푸시 → 두 폰 모두 (주말·공휴일에도 발송)
// 21:30 KST = 12:30 UTC
import { sendToAll } from '../shared/hearts.mjs';

export default async () => {
  const sent = await sendToAll('정용 💗 지영', '빠오 오늘도 고생했어 낼을 위해 일찍자자💗');
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '30 12 * * *' };
