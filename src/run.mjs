import { extractNotice } from './extract.mjs';
import { fetchPublicText } from './fetch.mjs';

export function validateInput(input) {
  if (!input || !Array.isArray(input.sources) || input.sources.length < 1 || input.sources.length > 50) throw new Error('sources must contain 1–50 objects');
  return input.sources.map((source, index) => {
    if (!source || typeof source !== 'object') throw new Error(`sources[${index}] must be an object`);
    if ((typeof source.text === 'string') === (typeof source.url === 'string')) throw new Error(`sources[${index}] requires exactly one of text or url`);
    if (source.id !== undefined && (typeof source.id !== 'string' || source.id.length > 200)) throw new Error('id must be a string up to 200 characters');
    if (source.text !== undefined && (!source.text.trim() || source.text.length > 200_000)) throw new Error('text must contain 1–200000 characters');
    if (source.url !== undefined && (source.url.length > 2048 || !/^https?:\/\//i.test(source.url))) throw new Error('url must be an HTTP(S) URL up to 2048 characters');
    if (source.html !== undefined && typeof source.html !== 'boolean') throw new Error('html must be boolean');
    return { ...source };
  });
}

export async function processSource(source) {
  try {
    const fetched = source.url ? await fetchPublicText(source.url) : source;
    return extractNotice(fetched.text, { id: source.id ?? null, url: fetched.url ?? null, html: fetched.html ?? false });
  } catch (error) {
    return { schemaVersion: '0.1', id: source.id ?? null, url: source.url ?? null, status: 'failed', error: error.message, requiresHumanReview: true };
  }
}

export async function runSources(input, emit, emitError) {
  for (const source of validateInput(input)) {
    const result = await processSource(source);
    const charge = result.status === 'processed' ? await emit(result) : await emitError(result);
    if (charge?.eventChargeLimitReached) break;
  }
}
