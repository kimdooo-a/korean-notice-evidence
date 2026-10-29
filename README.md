# Korean Notice Evidence Extractor

Turn Korean notice text or public HTML URLs into reviewable deadline and submission-requirement **candidates**, with exact supporting text spans. No LLM, external model key, or inferred final deadline.

This is version 0.1. Market demand and paid conversion have not been validated. Code created before November 13, 2026 is preexisting work for any later Apart Research sprint; it is not sprint research or an experimental result.

## Input and local use

Node.js 22 or newer. The extraction CLI uses only Node built-ins. Install the pinned dependencies with `npm ci` before running tests, which also exercise the Apify SDK with in-memory storage and API substitutes:

```sh
npm test
node src/cli.mjs examples/input.json
```

For the Apify runtime, install the pinned SDK using `npm ci`, then use `npm start` with standard Apify INPUT storage. `npm run local -- input.json` prints JSONL without an Apify account. See [example input](examples/input.json).

```json
{"sources":[{"id":"my-notice","text":"접수마감: 2026.11.15 18:00\n제출서류: PDF, 8페이지 이내"}]}
```

Supply exactly one of `text` or `url` per source. Optional `html: true` interprets supplied text as HTML. Maximum 50 sources, 200,000 text characters per source, 2 MB downloaded per URL, 100 matching evidence lines per result. URL mode fetches one public HTML or plain-text page, checks each redirect, pins validated public IPv4 DNS answers, and uses no cookies, credentials, proxies, or browser. IPv6-only hosts are unsupported. Server-declared character sets are decoded with `TextDecoder`; absent charset means UTF-8. Respect the source's access and reuse terms; prefer supplied licensed text when uncertain.

## Output contract

Each processed input becomes one dataset item. `text` is canonicalized line-based text; `textSha256` binds that version. For every `evidence` entry, `text.slice(start, end) === quote`. Offsets are JavaScript UTF-16 code units, end exclusive, referring to returned `text`, not raw HTML bytes. Categories include deadline, eligibility, deliverable, format, submission, AI policy, fees and rights. Date candidates preserve explicit components and report missing year/time/timezone or invalid calendar values. `finalDeadline` always remains `null`; a reviewer resolves competing dates and applicable rules.

An empty candidate list does not establish that a requirement is absent. HTML stripping is a simple text transform, not a full rendered-page parser. Dates must occur on a line containing supported deadline wording. No attachments, PDFs, HWP files, linked rules, OCR, Javascript-only pages, or legal interpretation. Pattern matches can be false positives. Do not use candidates as an automatic eligibility or deadline decision.

## Apify deployment and pricing

The [Actor definition](.actor/actor.json), [input schema](.actor/INPUT_SCHEMA.json), [Dockerfile](Dockerfile), and lockfile are included. Apify cloud build and synthetic runs have been verified. On October 29, a four-source cloud test produced two successful results and stopped at the configured $0.004 event budget. See [verification](VALIDATION.md). This is a developer test, not customer revenue or proof of market demand.

Pricing: **$0.002 per successfully processed notice ($2 / 1,000)**, including notices with zero candidate lines because inspection was performed. Platform usage is included in the listed price. URL failures and empty/unparseable supplied HTML are written to key-value `ERRORS` and incur no custom event. Invalid batch input fails before work.

The active Console configuration uses the single primary event `notice-processed` (“Notice processed”) at USD 0.002. Synthetic `apify-default-dataset-item` and `apify-actor-start` prices are removed. The loop stops on the SDK's spending-limit signal. Developer runs are not proof of a real customer's charge or payout.

Local safety update, not yet deployed: `charge-guard.mjs` requires an explicit finite budget and compares the next total event cost against it using exact decimal arithmetic before each save. It also checks SDK capacity and verifies that the named event count increased by one. This blocks SDK 3.7.0's first-event exception and rounded capacity near a price boundary, including a $0.00199999 budget for a $0.002 event. The deployed version still needs this update; no Console pricing was changed.

The local Apify entrypoint persists `NOTICE_PROCESSING_STARTED` before processing. An existing marker, dataset item, or named event charge disables automatic retry, including after migration or restart. Completed and partially completed runs keep the marker. Inspect previous output, charges, and key-value `ERRORS` before explicitly starting a new run with fresh storage; blindly resubmitting completed inputs can charge them again. `runSources` still supports partial batches and stops at the budget signal.

Dataset storage and event charging are **not atomic** in SDK 3.7.0: output is saved before the charge request. A failed or interrupted charge may leave an output item with an unknown or missing charge. The local code records runtime errors in `ERRORS` when storage is available and blocks replay; it cannot roll back an item or guarantee exactly-once billing. A hard termination may prevent `ERRORS` from being written. This guard assumes one process per run and persistent default storage; it is not a lock for concurrent processes. Cloud restart, migration, and charge-failure behavior still require verification before public deployment.

Official implementation references: [actor.json contract](https://docs.apify.com/actors/development/actor-definition/actor-json), [input schema](https://docs.apify.com/actors/development/actor-definition/input-schema), [PPE behavior](https://docs.apify.com/actors/monetize/pay-per-event), [SDK PPE](https://docs.apify.com/sdk/js/docs/concepts/pay-per-event), [Actor SDK](https://docs.apify.com/sdk/js/reference/class/Actor). See [research and licensing notes](RESEARCH.md) and [verification](VALIDATION.md).

Original package code is available under the [MIT License](LICENSE). The Apify SDK is separately licensed under Apache-2.0; see [third-party notices](THIRD_PARTY_NOTICES.md). No Galaxy Con application core or third-party Actor code was copied.
