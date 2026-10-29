# 검증 상태 — 2026-10-27

## 2026-10-30 추가 — 저장 전 과금 용량 가드

`src/charge-guard.mjs`를 추가해 명시적 유한예산과 단일 positive notice-processed 설정을 요구하고, 저장 전에 이벤트1회 용량을 확인한다. SDK0→Infinity와 첫 이벤트 예외에 의한 단가 미만 예산 저장을 차단한다. 최종 로컬 `npm test`12/12 통과(기존10+가드2), diff check 통과. 초기에는 브라우저 연결이 불가했다. 이후 연결은 복구됐으나 이 가드의 Cloud 배포는 수행하지 않았으며 공개본이 고쳐졌다고 주장하지 않는다.

메인 수익 후속 기록: Galaxy Con `docs/intel/opportunities/2026-10-30-apify-revenue-next.md`. 이번 변경은 세션 종료 시 별도 저장소 소스 이력으로 보존한다. 최신 과금 가드의 공개 Cloud 배포는 미완료다.

- Node v24.19.0, npm 11.17.0. `npm test` 10/10 통과: 한국어/emoji UTF-16 span 일치, 복수날짜, 연도·시각 누락, 잘못된 날짜, HTML, 상한, 입력 검증, 과금상한 중단, 실패 무과금 경로, 내부IP 차단.
- `node src/cli.mjs examples/input.json` 합성 공고 JSONL 확인. 날짜 2개를 보존하며 `finalDeadline:null`, 불확실성 출력.
- Apify SDK 3.7.0 로컬 entrypoint를 `ACTOR_TEST_PAY_PER_EVENT=true`, 토큰 제거, 로컬 storage로 실제 실행: exit 0, dataset 1개, `ERRORS=[]`. 실제 청구 아님. SDK API 선언의 `pushData(item,eventName):Promise<ChargeResult>` 확인.
- 공개 `https://example.com` 실제 GET: HTML, 577자 반환 확인. 최초 실제 요청에서 발견한 Node의 lookup(all=true) callback 형식 문제를 수정하고 같은 요청 성공 확인.
- SDK 설치본 `LICENSE.md` Apache-2.0 원문 확인. 전체 lockfile dependency license manifest 기록. 신규 의존성 187개는 Apify SDK의 transitive tree이며 추출 로직에는 외부 라이브러리가 없다. npm 캐시는 기존 정책대로 `D:/toolbox/cache/npm` 사용.
- Docker CLI 29.7.2 있음. 당시 daemon이 실행 중이 아니어서 로컬 이미지 build는 미실행. 이후 같은 날 Apify cloud build와 합성 실행은 성공했다(아래 후속 확인). 공개·실청구는 미검증이다.

## 후속 확인 — 2026-10-29

- 10월27일 실행 기록: cloud build `4RgvuhPfqiUwoKUge`, version `0.0.1`, 성공 10초/$0.002 표시. run `Qxz4TVuWioUkRBwLh`, 성공 2초, dataset 1건, 실행비용 $0.000 표시. 이 금액은 제품 판매매출이 아니다.
- 10월29일 메인이 Apify Console에서 해당 기존 run의 `Succeeded`, 결과 1건, 2초, $0.000 표시 및 Actor `Private`를 다시 확인했다. 새 cloud run이나 유료 호출은 실행하지 않았다.
- 독립 점검자가 `npm test`를 다시 실행해 10/10 통과했고 합성 CLI의 복수 날짜 보존과 `finalDeadline:null`을 확인했다.
- 실제 판매 공개 전 확인: 수취정보/KYC, Console의 `notice-processed` 가격 설정, 기본 dataset/start 이벤트 중복 제거, 실제 과금상한 및 실패 무과금 검증. 현재 과금상한 단위 테스트는 모의 콜백 검증이며 Console 통합검증이 아니다.

알려진 한계: 한 줄 단위 패턴, 숫자형 날짜 일부 문법만 지원, 직접 첨부 규정 미열람, HTML 렌더링 없음, IPv4 공용호스트만, 공고 해석·최종마감 자동확정 없음. 실제 한국 공고 정확도·유료 수요·수익성은 미측정.

## 수익화 적용 후 검증 — 2026-10-29

- Console의 Monetization Active 확인. 단일 `notice-processed` $0.002, 시작/기본 dataset 과금 제거, 사용자 platform usage 비용 별도 청구 없음.
- cloud run `eJ3BSV26vMa3UyfOa` 성공, build `0.0.1`, 2초. 입력 4건(빈 HTML 실패, 근거 있는 정상, 0후보 정상, 한도 후 정상), 최대비용 $0.004 설정. 실제 dataset `GgMWRawmIajYIJcfY`에는 앞의 정상 2건만 존재하며 모든 quote가 UTF-16 원문 span과 일치했다. 뒤의 정상은 미처리, ERRORS 레코드 172B 존재. 개발자 실행의 표시비용 $0.000은 고객 매출이 아니다.
- 독립 점검: 테스트 10/10 통과, 설치 SDK에 메모리 저장·청구 대역을 연결한 경로 검증 통과. SDK가 첫 단가 미만 예산에서도 1건을 허용하는 동작을 확인했으므로 엄격한 상한 보장으로 설명하지 않는다.
- 공개 게이트에서 출력 스키마 추가와 재빌드가 요구되어 해당 정의를 보완한다. 실제 고객 청구·수취 실적은 아직 없다.
