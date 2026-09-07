// 10:00 KST = 01:00 UTC — 'ten' 슬롯 (동영♥지영: ♥오늘도 화이팅♥, 평일만)
import { runSlot } from '../shared/hearts.mjs';

export default async () => runSlot('ten');

export const config = { schedule: '0 1 * * *' };
