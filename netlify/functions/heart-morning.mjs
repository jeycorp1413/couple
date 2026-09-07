// 08:00 KST = 23:00 UTC — 사이트별 계획(PLANS)에 'morning' 슬롯이 있는 사이트만 발송
import { runSlot } from '../shared/hearts.mjs';

export default async () => runSlot('morning');

export const config = { schedule: '0 23 * * *' };
