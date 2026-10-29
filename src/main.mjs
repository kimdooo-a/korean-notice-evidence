import { Actor } from 'apify';
import { runSources } from './run.mjs';
import { createNoticeEmitter } from './charge-guard.mjs';

await Actor.main(async () => {
  const errors = [];
  const emit = createNoticeEmitter(Actor);
  await runSources(await Actor.getInput(),
    emit,
    result => { errors.push(result); });
  await Actor.setValue('ERRORS', errors);
});
