// 21:30 KST = 12:30 UTC — 'night' 슬롯 (정용♥지영만)
import { runSlot } from '../shared/hearts.mjs';

export default async () => runSlot('night');

export const config = { schedule: '30 12 * * *' };
