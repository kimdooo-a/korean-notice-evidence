import test from 'node:test';
import assert from 'node:assert/strict';
import { createNoticeEmitter } from '../src/charge-guard.mjs';

function fake(maxTotalChargeUsd, capacity) {
  const pushes = [];
  return { pushes, actor: {
    getChargingManager: () => ({
      getPricingInfo: () => ({ isPayPerEvent: true, maxTotalChargeUsd, perEventPrices: { 'notice-processed': 0.002 } }),
      calculateMaxEventChargeCountWithinLimit: () => capacity,
    }),
    pushData: async (row, event) => { pushes.push({ row, event }); return { chargedCount: 2 }; },
  } };
}

test('유한예산 필수, 단가 미만 예산에서는 저장 전 중단', async () => {
  for (const limit of [Infinity, undefined, NaN, -1]) {
    const f = fake(limit, Infinity);
    assert.throws(() => createNoticeEmitter(f.actor), /finite/);
    assert.equal(f.pushes.length, 0);
  }
  const f = fake(0.001, 0);
  assert.deepEqual(await createNoticeEmitter(f.actor)({ id: 'synthetic' }), { eventChargeLimitReached: true });
  assert.equal(f.pushes.length, 0);
});

test('정확히 한 이벤트 예산이면 전용 이벤트만 사용한다', async () => {
  const f = fake(0.002, 1);
  await createNoticeEmitter(f.actor)({ id: 'synthetic' });
  assert.deepEqual(f.pushes, [{ row: { id: 'synthetic' }, event: 'notice-processed' }]);
});
