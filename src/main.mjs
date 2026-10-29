import { Actor } from 'apify';
import { runActor } from './run-actor.mjs';

await Actor.main(async () => {
  await runActor(Actor);
});
