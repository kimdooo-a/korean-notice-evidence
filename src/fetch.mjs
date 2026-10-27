import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';

export function isPublicIPv4(address) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

export async function fetchPublicText(rawUrl, redirects = 0) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('URL_NOT_ALLOWED');
  if (isIP(url.hostname) && !isPublicIPv4(url.hostname)) throw new Error('NON_PUBLIC_IP');
  const answers = await lookup(url.hostname, { family: 4, all: true });
  if (!answers.length || answers.some(answer => !isPublicIPv4(answer.address))) throw new Error('NON_PUBLIC_IP');
  const chosen = answers[0];
  const response = await new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).get(url, {
      agent: false,
      headers: { 'User-Agent': 'KoreanNoticeEvidence/0.1', Accept: 'text/html, text/plain', 'Accept-Encoding': 'identity' },
      lookup: (_hostname, options, callback) => options?.all
        ? callback(null, [{ address: chosen.address, family: 4 }])
        : callback(null, chosen.address, 4),
    }, resolve);
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new Error('FETCH_TIMEOUT')));
  });
  if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
    response.destroy();
    if (redirects >= 3 || !response.headers.location) throw new Error('REDIRECT_LIMIT');
    return fetchPublicText(new URL(response.headers.location, url).href, redirects + 1);
  }
  if (response.statusCode < 200 || response.statusCode >= 300) { response.destroy(); throw new Error(`HTTP_${response.statusCode}`); }
  const type = response.headers['content-type'] || '';
  if (!/^text\/(?:html|plain)(?:;|$)/i.test(type)) { response.destroy(); throw new Error('UNSUPPORTED_CONTENT_TYPE'); }
  if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { response.destroy(); throw new Error('UNSUPPORTED_COMPRESSION'); }
  const declaredCharset = /charset\s*=\s*["']?([^;\s"']+)/i.exec(type)?.[1] ?? 'utf-8';
  let decoder;
  try { decoder = new TextDecoder(declaredCharset, { fatal: true }); } catch { response.destroy(); throw new Error('UNSUPPORTED_CHARSET'); }
  const chunks = [];
  let total = 0;
  const timer = setTimeout(() => response.destroy(new Error('FETCH_TIMEOUT')), 15_000);
  try {
    for await (const chunk of response) {
      total += chunk.length;
      if (total > 2_000_000) { response.destroy(); throw new Error('BODY_TOO_LARGE'); }
      chunks.push(chunk);
    }
    return { text: decoder.decode(Buffer.concat(chunks)), html: /^text\/html/i.test(type), url: url.href };
  } finally { clearTimeout(timer); }
}
