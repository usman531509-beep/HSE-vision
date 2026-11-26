# RCA module: progress

Last updated 2026-11-26.

Branch `feature/rca-module`, in a local worktree at `.worktrees/rca-module`. Code is in `web/lib/reasoning/rca/` and `web/app/api/reasoning/rca/route.ts`. The contract is in [CONTRACT.md](CONTRACT.md).
Run the tests with `cd web && npm test`. Typecheck with `npx next typegen && npm run typecheck`.

> **Branch status.** `feature/rca-module` was fast-forwarded to `main` at `cfdb2b1` (Voice, HIRA, SOP screens) on 2026-11-26, with no rebase and no conflicts. The `zod` and `vitest` lockfile entries were regenerated on top of `main`'s lockfile: same 96 packages, same versions, nothing on `main` changed. The RCA work is not committed yet, and is waiting for approval to commit and open a pull request. (PR #2, merged earlier under this branch name, carried only an unrelated navigation commit and no RCA code.)

## Status by requirement

| Requirement | Status | Notes |
|---|---|---|
| Severity triage (small / dangerous) | **Blocked** | Built and tested, but rules R1–R3 are placeholders. They are **not** the "3 RCA rules", which are unknown. Every output says `provisional: true`. |
| Small incident: 5 Whys | **Partially done** | Prompt, 3–7 step chain and validation are done. Never run on a real model. |
| Dangerous incident: board | **Partially done** | All 5 fields are enforced. Never run on a real model. |
| Fishbone | **Partially done** | All 6 categories are enforced. The category set is pending confirmation, and there's no real model run. |
| Sensor verification: gas (in vs out), heat, boiler | **Done** | On mock data. Thresholds are pending confirmation. |
| Sensor verification: unrelated sensors excluded | **Done** | Two defects fixed 2026-11-26 (below). |
| Strict typed, validated JSON output | **Done** | `RcaOutputSchema`. |
| Local LLM only | **Done** | Non-local hosts refused. |
| Reuse the existing LLM interface | **Blocked** | None exists. RCA has its own `LlmClient`, which can be swapped later. |
| Run on a real local LLM | **Blocked** | No runtime or model chosen. |
| Mock data: gas, then heat and boiler | **Partially done** | Four synthetic cases. The public datasets mentioned in the meeting notes aren't used. |
| No hardcoded answers | **Done** | Prompts carry facts and the required shape only. |
| Unit tests: triage, verification, schema | **Done** | See Tests. |
| API route tests | **Done** | Added 2026-11-26. |
| Work on `feature/rca-module` | **Partially done** | The branch is up to date with `main` (`cfdb2b1`). The RCA code is not committed yet; waiting for approval. |
| Integration with Decision | **Blocked** | No Decision module on `main`, and the contract isn't agreed. |

## Done

| Step | What | Files |
|---|---|---|
| 0 | This file, proposed contract | `docs/rca/` |
| 1 | `zod` 4, `vitest` 3 (v5 needs `@types/node` ≥ 22, but the repo pins 20), `npm test` | `web/package.json`, `web/vitest.config.ts` |
| 2 | Input, LLM-analysis and output schemas; tunables in one config | `schema.ts`, `config.ts` |
| 3 | 4 mock cases, JSON loader, adapter for dashboard incidents | `mock/*.json`, `load.ts` |
| 4 | Sensor verification (gas pressure pair, concentration, WBGT via `lib/heat/wbgt.ts`, boiler limits) | `verify.ts` |
| 5 | Triage with placeholder rules R1–R3 | `triage.ts` |
| 6 | `LlmClient`, local OpenAI-compatible client, fake client | `llm.ts` |
| 7 | Prompts, JSON extraction, validation, one repair retry | `prompts.ts`, `analyse.ts` |
| 8 | `runRca`, public `index.ts`, `POST /api/reasoning/rca` | `run.ts`, `index.ts`, route |

### 2026-11-26: audit follow-up

- **Fixed: unrelated sensors could confirm an incident.**
  - Kind `other` accepted every sensor kind, so a gas alarm "confirmed" a hand-in-press report. Now `other` is never sensor-confirmed.
  - `heat_stress` accepted any `temperature` series, so a boiler's 190 °C process alarm "confirmed" a worker's heat stress. Now it's WBGT only.
- **Fixed: gas meters could be paired across pipes.**
  - Two unlabelled inlets were both paired with one outlet (`undefined === undefined`).
  - A lone `L1` inlet was paired with a lone `L2` outlet.
  - Now meters pair only on the same `line`, or when they're the zone's single unlabelled inlet and outlet.
- **Improved:** an LLM timeout or cancelled request now says so, instead of reporting "unreachable".
- **Tests: 92 → 144, plus 1 todo.**
  - Regression tests for both defects. I checked they fail on the old code (6 failures) and pass on the fix.
  - API route tests: 200 for all 4 mocks and for a direct input; 400 for non-JSON, invalid input, a path-like name and an unknown mock; 503 for no model, a non-local host, LLM down and a non-chat reply; 422 when the LLM answer is invalid twice; 500 with no detail leaked.
  - LLM timeout, cancel, bad URL; schema method-consistency rules; loader and adapter edge cases; prompt content; end-to-end run on a dashboard incident; repair retry for dangerous incidents.
  - Renamed the misleading test "ignores an LLM that…" to "rejects an LLM answer that…".
- **CONTRACT.md:** added the sensor-to-incident mapping and the gas `line` pairing rule.

## Tests

144 pass, plus 1 todo. Line coverage of `lib/reasoning/rca` and the route is 100 % and branch coverage 98.4 %, measured with `@vitest/coverage-v8`, which is not saved as a dependency. Typecheck and production build are clean.

| File | Tests | Covers |
|---|---|---|
| `verify.test.ts` | 33 + 1 todo | Gas pairing, blips, timing, heat, boiler, low limits, zone and kind filtering, regressions |
| `llm.test.ts` | 28 | Local-host check, config, request format, errors, timeout, cancel |
| `schema.test.ts` | 21 | Output consistency rules, input validation |
| `run.test.ts` | 19 | Pipeline end to end with a fake LLM, repair, confidence cap, cancel |
| `route.test.ts` | 15 | Every HTTP status the route returns |
| `triage.test.ts` | 12 | Each placeholder rule, mock cases |
| `load.test.ts` | 12 | Mock files, bad files, adapter |
| `prompts.test.ts` | 4 | Method per severity, categories, no internal flags sent |

**Still untested:**
- Output from a real model: reasoning quality and whether it follows the JSON format. Every pipeline test uses a fake LLM.
- Time gaps between readings. Readings count as "in a row" by order, not by time (1 todo; the maximum gap is pending).
- Real sensor data and real Perception/Decision modules, which don't exist yet.

## In progress

- Nothing.

## Left

1. Commit and open the RCA pull request. The branch is already up to date with `main`; waiting for approval.
2. Replace the placeholder triage once the 3 rules and the threshold are known.
3. Run the 4 mock cases on the chosen local model and tune the prompts.
4. Agree the contracts (below) and adapt the code to them.
5. Optional: use the public sensor datasets from the meeting notes.

## Pending confirmation (team decisions)

1. **The "3 RCA rules":** unknown. Not defined in the meeting notes, the repo, or the IONHSE folder.
2. **Small/dangerous threshold:** unknown; the "Y"/"4" mark in the notes is unreadable.
3. **Fishbone categories:** using the 6M default.
4. **Thresholds** in `config.ts`:
   - gas normal line loss 0.05 bar, leak tolerance 0.1 bar, severe at 3× tolerance
   - 3 readings in a row to confirm
   - severe at 10 % past an alarm limit
   - confidence cap 0.5 when not verified
5. **Maximum time gap** between readings that still counts as "in a row".
6. **Air vs process temperature:** heat stress uses WBGT only until IoT can mark air temperature.
7. **Decision contract:** `rca/v1` is proposed, not agreed. Should RCA use HIRA's 5×5 likelihood × severity scale and the hierarchy of controls (`lib/data.ts`, added in `cfdb2b1`)?
8. **Perception/IoT input format:** proposed by RCA, not agreed. Voice reporting is a likely future input source. IoT should always send `line` for gas meters.
9. **Local LLM runtime and model:** none chosen. A shared LLM wrapper doesn't exist.
