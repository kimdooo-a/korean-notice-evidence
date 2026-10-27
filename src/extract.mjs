import { createHash } from 'node:crypto';

const patterns = {
  deadline: /마감|접수\s*기간|제출\s*기한|접수\s*기한|응모\s*기간|신청\s*기간|deadline|closes?/i,
  eligibility: /지원\s*자격|참가\s*자격|응모\s*자격|참가\s*대상|신청\s*대상|eligib/i,
  deliverable: /제출\s*(?:서류|자료|파일|양식)|출품\s*(?:규격|형식)|공식\s*양식|필수\s*(?:제출|서류)|PDF|HWPX?|DOCX|MP4/i,
  format: /분량|해상도|이내|이상|이하|페이지|매\s*이내|MB|GB|dpi|초|분\s*(?:이내|이하)/i,
  submission: /제출\s*방법|접수\s*방법|이메일|온라인\s*접수|우편\s*접수|방문\s*접수|업로드/i,
  aiPolicy: /(?:생성형\s*)?AI\s*(?:사용|활용|도구|금지|허용)|인공지능|generative\s*AI/i,
  fee: /참가비|접수비|응모료|entry\s*fee/i,
  rights: /저작권|저작재산권|이용\s*허락|권리\s*양도|copyright/i,
};

export function canonicalText(input, html = false) {
  let text = input.replace(/\r\n?/g, '\n');
  if (html) {
    text = text.replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<!--[^]*?-->/g, '')
      .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article|table)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#(x[0-9a-f]+|\d+);/gi, (whole, n) => {
        const point = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
        return point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : whole;
      })
      .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[n]);
  }
  return text.split('\n').map(line => line.replace(/[\t \u00a0]+/g, ' ').trim()).filter(Boolean).join('\n');
}

function datesIn(line, base) {
  const dates = [];
  const expression = /(?:(\d{4})\s*(?:년\s*|[./-]\s*))?(\d{1,2})\s*(?:월\s*|[./-]\s*)(\d{1,2})(?:\s*일|\.)?(?:\s*\([월화수목금토일]\))?(?:\s*(\d{1,2})\s*(?::|시\s*)(\d{2})?(?:분)?)?/g;
  for (const m of line.matchAll(expression)) {
    const [, year, month, day, hour, minute] = m;
    const issues = [];
    const y = year ? +year : null;
    const mo = +month;
    const d = +day;
    const maxDay = new Date(Date.UTC(y ?? 2000, mo, 0)).getUTCDate();
    if (mo < 1 || mo > 12 || d < 1 || d > maxDay || (hour !== undefined && +hour > 23) || (minute !== undefined && +minute > 59)) {
      issues.push('invalid_calendar_or_time');
    }
    if (!year) issues.push('year_not_explicit');
    if (hour === undefined) issues.push('time_not_explicit');
    if (hour !== undefined && minute === undefined) issues.push('minute_not_explicit');
    issues.push('timezone_not_resolved');
    dates.push({ raw: m[0], start: base + m.index, end: base + m.index + m[0].length,
      components: { year: y, month: mo, day: d, hour: hour === undefined ? null : +hour, minute: minute === undefined ? null : +minute },
      uncertainty: issues });
  }
  return dates;
}

export function extractNotice(input, { id = null, url = null, html = false } = {}) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('EMPTY_TEXT');
  if (input.length > 200_000) throw new Error('TEXT_TOO_LONG');
  const text = canonicalText(input, html);
  if (!text) throw new Error('EMPTY_TEXT');
  const evidence = [];
  let offset = 0;
  let matchedLines = 0;
  for (const line of text.split('\n')) {
    const categories = Object.entries(patterns).filter(([, pattern]) => pattern.test(line)).map(([category]) => category);
    if (categories.length) {
      matchedLines += 1;
      if (evidence.length < 100) evidence.push({ categories, quote: line, start: offset, end: offset + line.length,
        dateCandidates: categories.includes('deadline') ? datesIn(line, offset) : [],
        interpretation: 'explicit_text_candidate_only' });
    }
    offset += line.length + 1;
  }
  const deadlineCandidates = evidence.filter(e => e.categories.includes('deadline'));
  const uncertainty = ['Candidates are pattern matches, not verified rules or a final deadline.', 'Attachments and linked pages are not read.'];
  if (!deadlineCandidates.length) uncertainty.push('No supported deadline wording found; this does not mean no deadline exists.');
  if (deadlineCandidates.some(e => !e.dateCandidates.length)) uncertainty.push('Deadline wording exists without a supported numeric date on the same line.');
  if (deadlineCandidates.flatMap(e => e.dateCandidates).length > 1) uncertainty.push('Multiple dates found; opening dates, extensions and category deadlines are not resolved.');
  if (matchedLines > 100) uncertainty.push('Evidence truncated at 100 matching lines.');
  if (html) uncertainty.push('HTML is simplified, not browser-rendered; hidden text and layout may affect interpretation.');
  return { schemaVersion: '0.1', id, url, status: 'processed', method: 'deterministic-patterns',
    text, textSha256: createHash('sha256').update(text).digest('hex'), offsetUnit: 'UTF-16 code units; end exclusive; offsets refer to text',
    evidence, finalDeadline: null, uncertainty, requiresHumanReview: true };
}
