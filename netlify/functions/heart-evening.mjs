// 17:00 KST = 08:00 UTC — 'evening' 슬롯
import { runSlot } from '../shared/hearts.mjs';

export default async () => runSlot('evening');

export const config = { schedule: '0 8 * * *' };
