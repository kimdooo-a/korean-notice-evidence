import { Actor } from 'apify';
import { runSources } from './run.mjs';

await Actor.main(async () => {
  const errors = [];
  await runSources(await Actor.getInput(),
    result => Actor.pushData(result, 'notice-processed'),
    result => { errors.push(result); });
  await Actor.setValue('ERRORS', errors);
});
