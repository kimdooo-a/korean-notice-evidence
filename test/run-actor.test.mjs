import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ChargingManager } from 'apify';
import { runActor } from '../src/run-actor.mjs';

// 고정 SDK의 실제 저장→청구 경로를 메모리 저장소와 API 대역으로 검증한다.
const require = createRequire(import.meta.url);
const { pushDataAndCharge } = await import(pathToFileURL(join(dirname(require.resolve('apify')), 'charging.js')));
const EVENT = 'notice-processed';
const input = { sources: [{ id: 'A', text: '마감 미정' }, { id: 'B', text: '제출서류 PDF' }] };

async function fixture({ records = new Map(), rows = [], charged = 0, failCharge = false, interrupt = false, budget = 0.004 } = {}) {
  let billed = charged;
  const values = {
    maxTotalChargeUsd: budget, isAtHome: true, actorRunId: 'synthetic',
    actorPricingInfo: JSON.stringify({ pricingModel: 'PAY_PER_EVENT', pricingPerEvent: { actorChargeEvents: { [EVENT]: { eventPriceUsd: 0.002, eventTitle: 'Notice processed' } } } }),
    chargedEventCounts: JSON.stringify({ [EVENT]: charged }),
  };
  const manager = new ChargingManager({ get: key => values[key] }, { run: () => ({ charge: async ({ count }) => {
    if (failCharge) throw new Error('Synthetic charge transport failure');
    billed += count;
  } }) });
  await manager.init();
  const actor = {
    getInput: async () => input,
    getValue: async key => structuredClone(records.get(key) ?? null),
    setValue: async (key, value) => { records.set(key, structuredClone(value)); },
    getChargingManager: () => manager,
    openDataset: async () => ({ getInfo: async () => ({ itemCount: rows.length }) }),
    pushData: async (items, eventName) => {
      const result = await pushDataAndCharge({ chargingManager: manager, items, eventName, isDefaultDataset: true, pushFn: async saved => { rows.push(...structuredClone(Array.isArray(saved) ? saved : [saved])); } });
      if (interrupt) throw new Error('Synthetic interruption after first output and charge');
      return result;
    },
  };
  return { actor, records, rows, manager, billed: () => billed };
}

test('실제 SDK: A 저장·청구 후 재시작은 A를 다시 청구하지 않는다', async () => {
  const first = await fixture({ interrupt: true });
  await assert.rejects(() => runActor(first.actor), /interruption/);
  assert.deepEqual(first.rows.map(row => row.id), ['A']);
  assert.equal(first.billed(), 1);
  const retry = await fixture({ records: first.records, rows: first.rows, charged: first.billed() });
  await assert.rejects(() => runActor(retry.actor), /Automatic retry is disabled/);
  assert.deepEqual(retry.rows.map(row => row.id), ['A']);
  assert.equal(retry.billed(), 1);
  assert.equal(retry.records.get('ERRORS').length, 2);
});

test('실제 SDK: 저장 후 청구 실패는 증거를 남기고 재시도를 막는다', async () => {
  const first = await fixture({ failCharge: true });
  await assert.rejects(() => runActor(first.actor), /charge transport failure/);
  assert.deepEqual(first.rows.map(row => row.id), ['A']);
  assert.equal(first.billed(), 0);
  assert.match(first.records.get('ERRORS')[0].error, /charge transport failure/);
  const retry = await fixture({ records: first.records, rows: first.rows });
  await assert.rejects(() => runActor(retry.actor), /Automatic retry is disabled/);
  assert.equal(retry.rows.length, 1);
  assert.equal(retry.billed(), 0);
});

test('마커만 남은 실행, 이전 dataset, 이전 청구를 각각 거절한다', async () => {
  for (const options of [{ records: new Map([['NOTICE_PROCESSING_STARTED', {}]]) }, { rows: [{ id: 'old' }] }, { charged: 1 }]) {
    const f = await fixture(options);
    const count = f.rows.length;
    await assert.rejects(() => runActor(f.actor), /Automatic retry is disabled/);
    assert.equal(f.rows.length, count);
  }
});

test('마커 영속화 실패나 확인 불가능한 dataset에서는 저장·청구하지 않는다', async () => {
  const markerFailure = await fixture();
  const save = markerFailure.actor.setValue;
  markerFailure.actor.setValue = async (key, value) => {
    if (key === 'NOTICE_PROCESSING_STARTED') throw new Error('Synthetic marker storage failure');
    return save(key, value);
  };
  await assert.rejects(() => runActor(markerFailure.actor), /marker storage failure/);
  assert.equal(markerFailure.rows.length, 0);
  assert.equal(markerFailure.billed(), 0);
  assert.equal(markerFailure.records.get('ERRORS').length, 1);
  const unknownDataset = await fixture();
  unknownDataset.actor.openDataset = async () => ({ getInfo: async () => undefined });
  await assert.rejects(() => runActor(unknownDataset.actor), /Unable to verify prior/);
  assert.equal(unknownDataset.rows.length, 0);
  assert.equal(unknownDataset.billed(), 0);
});

test('실제 SDK: 단가 직전 경계는 0건, 정확한 두 이벤트 예산은 A/B만 처리한다', async () => {
  const under = await fixture({ budget: 0.00199999 });
  assert.equal(under.manager.calculateMaxEventChargeCountWithinLimit(EVENT), 1);
  await runActor(under.actor);
  assert.equal(under.rows.length, 0);
  assert.equal(under.billed(), 0);
  const exact = await fixture();
  await runActor(exact.actor);
  assert.deepEqual(exact.rows.map(row => row.id), ['A', 'B']);
  assert.equal(exact.billed(), 2);
  assert.deepEqual(exact.records.get('ERRORS'), []);
});
