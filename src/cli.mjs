import { readFile } from 'node:fs/promises';
import { runSources } from './run.mjs';

const input = JSON.parse(await readFile(process.argv[2] ?? new URL('../examples/input.json', import.meta.url), 'utf8'));
await runSources(input, result => console.log(JSON.stringify(result)), result => console.log(JSON.stringify(result)));
