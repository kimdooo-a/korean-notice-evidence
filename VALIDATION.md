# 검증 상태 — 2026-10-27

- Node v24.19.0, npm 11.17.0. `npm test` 10/10 통과: 한국어/emoji UTF-16 span 일치, 복수날짜, 연도·시각 누락, 잘못된 날짜, HTML, 상한, 입력 검증, 과금상한 중단, 실패 무과금 경로, 내부IP 차단.
- `node src/cli.mjs examples/input.json` 합성 공고 JSONL 확인. 날짜 2개를 보존하며 `finalDeadline:null`, 불확실성 출력.
- Apify SDK 3.7.0 로컬 entrypoint를 `ACTOR_TEST_PAY_PER_EVENT=true`, 토큰 제거, 로컬 storage로 실제 실행: exit 0, dataset 1개, `ERRORS=[]`. 실제 청구 아님. SDK API 선언의 `pushData(item,eventName):Promise<ChargeResult>` 확인.
- 공개 `https://example.com` 실제 GET: HTML, 577자 반환 확인. 최초 실제 요청에서 발견한 Node의 lookup(all=true) callback 형식 문제를 수정하고 같은 요청 성공 확인.
- SDK 설치본 `LICENSE.md` Apache-2.0 원문 확인. 전체 lockfile dependency license manifest 기록. 신규 의존성 187개는 Apify SDK의 transitive tree이며 추출 로직에는 외부 라이브러리가 없다. npm 캐시는 기존 정책대로 `D:/toolbox/cache/npm` 사용.
- Docker CLI 29.7.2 있음. daemon이 실행 중이 아니어서 이미지 build는 미실행. Apify cloud build·공개·실청구는 메인의 계정 연결 이후 검증한다.

알려진 한계: 한 줄 단위 패턴, 숫자형 날짜 일부 문법만 지원, 직접 첨부 규정 미열람, HTML 렌더링 없음, IPv4 공용호스트만, 공고 해석·최종마감 자동확정 없음. 실제 한국 공고 정확도·유료 수요·수익성은 미측정.
