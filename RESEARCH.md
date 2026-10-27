# 조사·출처·권리 — 2026-10-27

허브 `02-reusable-code/README.md`, `llms.txt`, `docs/solutions/2026-04-13-source-card-license-drift.md`를 확인했다. 공고 증거 span 전용 부품은 해당 인덱스에서 확인하지 못했다. Galaxy Con core와 외부 Actor 코드를 복사하지 않고 Node 내장 기능으로 독립 구현했다.

## Store 수요와 경쟁

다음은 2026-10-27 공식 Store 페이지에서 읽은 표시값이며 매출·고객 구매 의도 증거가 아니다. Store 통계는 동적으로 바뀔 수 있다.

| 공식 페이지 | 표시 현황 | 의미 |
|---|---|---|
| [Website Content Crawler](https://apify.com/apify/website-content-crawler) | 누적 172K, 월활성 14K, pay per usage | 웹→텍스트 인접 수요는 크지만 한국 공고 증거추출 수요를 직접 입증하지 않음 |
| [Document Structured Data Extractor](https://apify.com/warant/document-structured-data-extractor) | 누적 2, 월활성 1, 시작 $10/1000문서 | 결정론·provenance 경쟁 존재, 신생 Actor의 작은 표본 |
| [Structured Data Extractor & Validator](https://apify.com/autoloom/structured-data-extractor) | 누적 2, 월활성 1, 시작 $1.50/1000 | 일반 구조화는 경쟁이 많으며 이 제품은 schema.org 전용 |
| [Atomo Studio](https://apify.com/atomo-studio) | public Actor 1, 누적 사용자 2 | 한국 공공데이터 영어화 인접 경쟁 |
| [KONEPS 변경 감지](https://apify.com/honjahoesa/koneps-bid-change-detector) | 공식 API·키 필요, 현재 무료라고 안내 | 범용 공고 수집으로 진입하면 기존 공급과 충돌 |

선정 가설: 이미 수집한 한국 공고를 넣는 고객에게 원문 근거·추정하지 않은 복수 후보를 제공한다. 수집기나 LLM JSON 추출기 전체와 경쟁하지 않고 후처리 단위로 시험한다. Store 검색만으로 직접 경쟁 부재·시장 공백을 확정하지 않았다. 가격은 $2/1000건 제안이며 검증 전이다. 공개 후 14일간 실제 외부 사용자·반복 실행·유료전환·오류율을 보고 유지 여부를 판단한다. 봇/본인 실행을 수요에 포함하지 않는다.

## 라이선스·출처 카드 (허브 등록 인계)

외부 도입: [Apify JS SDK v3.7.0](https://github.com/apify/apify-sdk-js/tree/v3.7.0), npm 메타데이터 Apache-2.0 확인. 실제 설치본 LICENSE와 종속 라이선스는 VALIDATION에 기록한다. SDK는 dependency로만 쓰고 소스를 이 패키지에 복사하지 않는다. Docker 기본 이미지 `apify/actor-node:22`는 공식 플랫폼 실행환경이며 컨테이너 재배포 시 이미지 종속 notices도 별도 확인한다. 공식 문서는 API 계약 참고이며 전문을 복제하지 않았다. 입력 예시는 전부 합성이다. 출처 사이트의 공고·첨부를 패키지에 저장하지 않았다.

쓰기 범위가 이 패키지로 제한되어 허브 `09-source-vault/` 카드는 직접 만들지 않았다. 메인이 SDK 카드(버전·Apache-2.0·원본 LICENSE·사용방식 dependency)를 등록한 뒤 공개하면 된다. 기존 사유 코드에서 추출한 것이 아니므로 프로젝트 core 라이선스 미확인을 상업 재사용 허락으로 해석하지 않았다. 메인의 공개 저장소 게시 지시에 따라 독립 작성한 본 패키지 코드는 MIT로 공개한다. SDK·종속 라이선스는 변경하지 않는다.
