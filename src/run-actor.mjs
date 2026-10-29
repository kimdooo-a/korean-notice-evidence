import { runSources, validateInput } from './run.mjs';
import { createNoticeEmitter } from './charge-guard.mjs';

const STARTED = 'NOTICE_PROCESSING_STARTED';

// 저장과 청구는 원자적이지 않으므로 같은 스토리지에서 자동 재시도하지 않는다.
export async function runActor(actor) {
  let errors;
  try {
    errors = await actor.getValue('ERRORS') ?? [];
    if (!Array.isArray(errors)) {
      errors = undefined;
      throw new Error('Unable to verify existing ERRORS record.');
    }
    const input = await actor.getInput();
    validateInput(input);
    const emit = createNoticeEmitter(actor);
    const marker = await actor.getValue(STARTED);
    const dataset = await actor.openDataset();
    const info = await dataset.getInfo();
    const charged = actor.getChargingManager().getChargedEventCount('notice-processed');
    if (!Number.isSafeInteger(info?.itemCount) || info.itemCount < 0
      || !Number.isSafeInteger(charged) || charged < 0) throw new Error('Unable to verify prior output and charges.');
    if ((marker !== null && marker !== undefined) || info.itemCount !== 0 || charged !== 0) {
      throw new Error('Existing processing, output, or charge state detected. Automatic retry is disabled; inspect this run and use fresh storage for a new run.');
    }
    // 첫 저장보다 먼저 영속화하며 정상 종료 시에도 지우지 않는다.
    await actor.setValue(STARTED, { schemaVersion: '0.1', startedAt: new Date().toISOString() });
    await runSources(input, emit, result => { errors.push(result); });
  } catch (error) {
    errors?.push({ schemaVersion: '0.1', status: 'failed', stage: 'runtime', error: error.message, requiresHumanReview: true });
    throw error;
  } finally {
    if (errors) await actor.setValue('ERRORS', errors);
  }
}
