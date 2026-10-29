import test from 'node:test';
import assert from 'node:assert/strict';
import { createNoticeEmitter } from '../src/charge-guard.mjs';

function fake(maxTotalChargeUsd, capacity, { price = 0.002, charged = 0 } = {}) {
  const pushes = [];
  let count = charged;
  return { pushes, actor: {
    getChargingManager: () => ({
      getPricingInfo: () => ({ isPayPerEvent: true, maxTotalChargeUsd, perEventPrices: { 'notice-processed': price } }),
      getChargedEventCount: () => count,
      calculateMaxEventChargeCountWithinLimit: () => capacity,
    }),
    pushData: async (row, event) => { pushes.push({ row, event }); count += 1; return { chargedCount: 2 }; },
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

test('SDK가 올림한 단가 직전 예산도 저장 전에 차단한다', async () => {
  for (const budget of [0, 0.00199999, 0.00399999]) {
    const f = fake(budget, 1, { charged: budget > 0.002 ? 1 : 0 });
    assert.deepEqual(await createNoticeEmitter(f.actor)({ id: 'synthetic' }), { eventChargeLimitReached: true });
    assert.equal(f.pushes.length, 0);
  }
});

test('소수 누적 오차 없이 정확한 총예산 경계까지 허용한다', async () => {
  for (const [price, budget, charged] of [[0.1, 0.3, 2], [0.002, 0.02, 9], [1e-7, 3e-7, 2]]) {
    const f = fake(budget, 1, { price, charged });
    await createNoticeEmitter(f.actor)({ id: 'last' });
    assert.equal(f.pushes.length, 1);
    const full = fake(budget, 1, { price, charged: charged + 1 });
    assert.deepEqual(await createNoticeEmitter(full.actor)({ id: 'over' }), { eventChargeLimitReached: true });
    assert.equal(full.pushes.length, 0);
  }
});

test('저장 후 단일 이벤트 청구를 확인하지 못하면 실행 오류다', async () => {
  const f = fake(0.002, 1);
  f.actor.pushData = async () => ({ chargedCount: 0 });
  await assert.rejects(() => createNoticeEmitter(f.actor)({ id: 'synthetic' }), /could not be confirmed/);
});

test('정확히 한 이벤트 예산이면 전용 이벤트만 사용한다', async () => {
  const f = fake(0.002, 1);
  await createNoticeEmitter(f.actor)({ id: 'synthetic' });
  assert.deepEqual(f.pushes, [{ row: { id: 'synthetic' }, event: 'notice-processed' }]);
});
