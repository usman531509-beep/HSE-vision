# RCA module: progress

Last updated 2026-11-26.

Code is in `web/lib/reasoning/rca/` and `web/app/api/reasoning/rca/route.ts`. The contract (`rca/v2`) is in [CONTRACT.md](CONTRACT.md).
Run the tests with `cd web && pnpm test`. Typecheck with `pnpm typecheck`, which runs `next typegen` first.

> **Branch status.** The first version (`rca/v1`) was merged into `main` as **PR #4** on 2026-11-26. The 3-level ladder (`rca/v2`) is on branch `feature/rca-severity-ladder`, cut from `main` at `ab189b5`. It is not committed yet.

## The 3 RCA rules: an escalation ladder

From the meeting notes (page 3): the 3 rules are levels of one ladder, chosen by severity. They are not three separate techniques.

| Level | Severity | What RCA does |
|---|---|---|
| 1 | Small | Log it and note what happened. No cause analysis, no LLM call. |
| 2 | Medium | Fishbone: why did the incident happen? Check each cause category, name the root cause. |
| 3 | Dangerous ("board type") | Full chain: what happened → why → root cause → what further harm it can cause. Includes the fishbone: the ladder is cumulative. |

- **"Circumstances"** in level 3 means the further consequences, so the last step is forward-looking (`further_harm`). It's the link to the Predictive Risk Engine.
- **"Board type"** is the top level, a deeper analysis than fishbone.
- **5 Whys** has no place on the ladder and was removed. It can come back if the trainer wants it.

**Still provisional: where each level starts.** The level starts from the reported severity on the app's scale (Low → 1, Medium → 2, High → 3; none reported → 2). A lost-time injury or fatality (R1), or a sensor-confirmed reading past the severe line (R2), escalates to 3. Nothing lowers a level.

## Status by requirement

| Requirement | Status | Notes |
|---|---|---|
| Severity triage onto the 3 levels | **Partially done** | Built and tested. The thresholds are provisional until the trainer confirms them; every output says `provisional: true`. |
| Level 1: log and note | **Done** | No LLM. Records the note and the sensor check. |
| Level 2: fishbone | **Partially done** | Prompt and validation done. Never run on a real model. |
| Level 3: board chain + fishbone | **Partially done** | All four chain steps and further harm are enforced. Never run on a real model. |
| Sensor verification: gas (in vs out), heat, boiler | **Done** | On mock data. Thresholds are pending confirmation. |
| Sensor verification: unrelated sensors excluded | **Done** | |
| Strict typed, validated JSON output | **Done** | `RcaOutputSchema`, one strict shape per level. |
| Local LLM only | **Done** | Non-local hosts refused. |
| Reuse the existing LLM interface | **Blocked** | None exists. RCA has its own `LlmClient`, which can be swapped later. |
| Run on a real local LLM | **Blocked** | No runtime or model chosen. |
| Mock data: gas, then heat and boiler | **Partially done** | Four synthetic cases, now covering all 3 levels. The public datasets in the meeting notes aren't used. |
| No hardcoded answers | **Done** | Prompts carry facts and the required shape only. |
| Tests: triage, verification, schema, route | **Done** | See Tests. |
| Integration with Decision | **Blocked** | No Decision module on `main`, and the contract isn't agreed. |

## Done

| Step | What | Files |
|---|---|---|
| 0 | This file, proposed contract | `docs/rca/` |
| 1 | `zod` 4, `vitest` 3, `test` script | `web/package.json`, `web/vitest.config.ts` |
| 2 | Input, LLM-analysis and output schemas; tunables in one config | `schema.ts`, `config.ts` |
| 3 | 4 mock cases, JSON loader, adapter for dashboard incidents | `mock/*.json`, `load.ts` |
| 4 | Sensor verification (gas pressure pair, concentration, WBGT via `lib/heat/wbgt.ts`, boiler limits) | `verify.ts` |
| 5 | Triage | `triage.ts` |
| 6 | `LlmClient`, local OpenAI-compatible client, fake client | `llm.ts` |
| 7 | Prompts, JSON extraction, validation, one repair retry | `prompts.ts`, `analyse.ts` |
| 8 | `runRca`, public `index.ts`, `POST /api/reasoning/rca` | `run.ts`, `index.ts`, route |

### 2026-11-26: audit follow-up (in PR #4)

- **Fixed:** unrelated sensors could confirm an incident. Kind `other` is never sensor-confirmed, and heat stress uses WBGT only.
- **Fixed:** gas meters could be paired across pipes. Meters now pair only on the same `line`, or as the zone's single unlabelled inlet and outlet.
- **Improved:** LLM timeouts and cancellations report as such.
- API route tests added; tests went from 92 to 144.

### 2026-11-26: 3-level ladder (`rca/v2`)

- Severity has 3 levels (`small`, `medium`, `dangerous`) with `level` 1–3. Triage starts from the reported severity, and R1 and R2 escalate to dangerous. `triage.basis` records the starting point.
- Level 1 logs without calling the LLM (`method: log`, `model: null`, `note`).
- Level 2 returns a fishbone analysis (`method: fishbone`).
- Level 3 returns the board chain (`what_happened → why_it_happened → root_cause → further_harm`) plus the fishbone (`method: board`).
- Removed: 5 Whys (`why_chain`), `secondary_risks` and board `circumstances`, all replaced by `further_harm`.
- Mock cases now cover every level: gas false alarm → 1, heat stress → 2, confirmed gas leak and boiler over-pressure → 3.
- No dependency changes; the team's `pnpm-lock.yaml` already pins `zod` and `vitest`.

## Tests

150 pass, plus 1 todo. Line coverage of `lib/reasoning/rca` and the route is 100 % and branch coverage 98.4 %. Typecheck and production build are clean.

| File | Tests | Covers |
|---|---|---|
| `verify.test.ts` | 33 + 1 todo | Gas pairing, blips, timing, heat, boiler, low limits, zone and kind filtering, regressions |
| `llm.test.ts` | 28 | Local-host check, config, request format, errors, timeout, cancel |
| `run.test.ts` | 22 | Each level end to end with a fake LLM; level 1 never calls the LLM; board order; repair; confidence cap; cancel |
| `schema.test.ts` | 19 | One shape per level, level/method consistency, board consistency, no 5 Whys, input validation |
| `triage.test.ts` | 16 | Starting level per reported severity, default, each escalation rule, never lowering, mock cases |
| `route.test.ts` | 15 | Every HTTP status; level 1 makes no LLM request |
| `load.test.ts` | 12 | Mock files, bad files, adapter |
| `prompts.test.ts` | 5 | Fishbone vs board prompt, no 5 Whys or circumstances, no internal flags sent |

**Still untested:**
- Output from a real model: reasoning quality and whether it follows the JSON format. Every pipeline test uses a fake LLM.
- Time gaps between readings. Readings count as "in a row" by order, not by time (1 todo; the maximum gap is pending).
- Real sensor data and real Perception/Decision modules, which don't exist yet.

## In progress

- Nothing.

## Left

1. Commit the ladder and open its pull request.
2. Confirm the level thresholds with the trainer and update `config.ts`.
3. Run the 4 mock cases on the chosen local model and tune the prompts.
4. Agree the contracts (below) and adapt the code to them.
5. Optional: use the public sensor datasets from the meeting notes.

## Pending confirmation (team decisions)

1. **Level thresholds:** where small, medium and dangerous start. Currently reported Low/Medium/High plus the escalation rules R1 and R2.
2. **5 Whys:** removed. Confirm the trainer doesn't want it anywhere on the ladder.
3. **Fishbone categories:** using the 6M default.
4. **Sensor thresholds** in `config.ts`:
   - gas normal line loss 0.05 bar, leak tolerance 0.1 bar, severe at 3× tolerance
   - 3 readings in a row to confirm
   - severe at 10 % past an alarm limit
   - confidence cap 0.5 when not verified
5. **Maximum time gap** between readings that still counts as "in a row".
6. **Air vs process temperature:** heat stress uses WBGT only until IoT can mark air temperature.
7. **Heat bands:** RCA uses HeatShield's WBGT bands (`lib/heat/wbgt.ts`). The HeatShield update (PR pending) shows the same bands; recheck if it changes them.
8. **Decision contract:** `rca/v2` is proposed, not agreed. Should RCA use HIRA's 5×5 likelihood × severity scale and the hierarchy of controls?
9. **Perception/IoT input format:** proposed by RCA, not agreed. IoT should always send `line` for gas meters.
10. **Local LLM runtime and model:** none chosen. A shared LLM wrapper doesn't exist.
