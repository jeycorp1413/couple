// 12:00 KST = 03:00 UTC — 'noon' 슬롯
import { runSlot } from '../shared/hearts.mjs';

export default async () => runSlot('noon');

export const config = { schedule: '0 3 * * *' };
