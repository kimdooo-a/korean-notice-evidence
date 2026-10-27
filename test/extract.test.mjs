import test from 'node:test';
import assert from 'node:assert/strict';
import { extractNotice } from '../src/extract.mjs';
import { isPublicIPv4, fetchPublicText } from '../src/fetch.mjs';
import { validateInput, runSources } from '../src/run.mjs';

test('모든 증거와 날짜의 오프셋은 반환된 원문을 정확하게 가리킨다', () => {
  const result = extractNotice('📌 안내\r\n 접수기간: 2026.11.01 ~ 2026.11.15 18:00\r\n제출서류: PDF 1개');
  for (const e of result.evidence) {
    assert.equal(result.text.slice(e.start, e.end), e.quote);
    for (const d of e.dateCandidates) assert.equal(result.text.slice(d.start, d.end), d.raw);
  }
  assert.equal(result.finalDeadline, null);
  assert.equal(result.evidence[0].dateCandidates.length, 2);
  assert(result.uncertainty.some(value => value.includes('Multiple dates')));
});

test('연도·시간·시간대를 추정하지 않고 누락을 드러낸다', () => {
  const date = extractNotice('마감: 11월 15일').evidence[0].dateCandidates[0];
  assert.deepEqual(date.components, { year: null, month: 11, day: 15, hour: null, minute: null });
  assert(date.uncertainty.includes('year_not_explicit'));
  assert(date.uncertainty.includes('timezone_not_resolved'));
});

test('잘못된 윤일과 시간은 후보로 보존하되 오류를 표시한다', () => {
  const dates = extractNotice('마감: 2026.02.29 25:80').evidence[0].dateCandidates;
  assert(dates[0].uncertainty.includes('invalid_calendar_or_time'));
});

test('별도 행의 날짜나 서술형 마감을 확정하지 않는다', () => {
  const result = extractNotice('접수 마감\n2026.11.15\n발표: 2026.12.01');
  assert.equal(result.evidence[0].dateCandidates.length, 0);
  assert(result.uncertainty.some(value => value.includes('same line')));
  assert.equal(extractNotice('오늘 공고 없음').evidence.length, 0);
});

test('HTML 스크립트를 제외하고 정규화된 원문에 증거를 묶는다', () => {
  const result = extractNotice('<script>마감 2026.1.1</script><p>제출서류: PDF &amp; HWP</p><p>마감: 2026.11.15</p>', { html: true });
  assert(!result.text.includes('2026.1.1'));
  assert(result.text.includes('PDF & HWP'));
  assert.equal(result.evidence.length, 2);
});

test('증거 상한은 조용히 누락하지 않고 알린다', () => {
  const result = extractNotice(Array.from({ length: 103 }, (_, i) => `제출서류 ${i}: PDF`).join('\n'));
  assert.equal(result.evidence.length, 100);
  assert(result.uncertainty.some(value => value.includes('truncated')));
});

test('중복 입력 방식과 과도한 배치를 거절한다', () => {
  assert.throws(() => validateInput({ sources: [{ text: 'a', url: 'https://example.com' }] }));
  assert.throws(() => validateInput({ sources: Array(51).fill({ text: 'a' }) }));
  assert.throws(() => validateInput({ sources: [{ text: '' }] }));
});

test('과금 상한 신호를 받으면 다음 항목을 처리하지 않는다', async () => {
  let count = 0;
  await runSources({ sources: [{ text: '마감 미정' }, { text: '제출서류 PDF' }] }, () => {
    count += 1;
    return { eventChargeLimitReached: true };
  }, () => assert.fail('예상하지 못한 오류'));
  assert.equal(count, 1);
});

test('실패 항목은 과금 콜백으로 보내지 않는다', async () => {
  let failures = 0;
  await runSources({ sources: [{ text: '<script>nothing</script>', html: true }] }, () => assert.fail('실패는 과금하면 안 됨'), () => { failures += 1; });
  assert.equal(failures, 1);
});

test('내부·메타데이터·문서용 IPv4와 IPv6 접근을 차단한다', async () => {
  for (const address of ['0.0.0.0', '10.1.2.3', '127.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.0.1', '100.64.0.1', '198.18.0.1', '203.0.113.1', '::1']) assert.equal(isPublicIPv4(address), false);
  assert.equal(isPublicIPv4('8.8.8.8'), true);
  await assert.rejects(() => fetchPublicText('http://127.0.0.1/private'), /NON_PUBLIC/);
  await assert.rejects(() => fetchPublicText('file:///etc/passwd'), /URL_NOT_ALLOWED/);
  await assert.rejects(() => fetchPublicText('https://user:pass@example.com'), /URL_NOT_ALLOWED/);
});
