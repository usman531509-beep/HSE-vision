# RCA module contract (proposed, `rca/v1`)

RCA is the root-cause step of the **Reasoning** stage: Perception → **Reasoning (RCA)** → Decision. The zod schemas in `web/lib/reasoning/rca/schema.ts` are the source of truth; this page explains them. Both contracts are **proposals** until the Perception, IoT and Decision owners accept them.

## How to call it

```ts
import { runRca, LocalLlmClient, llmConfigFromEnv } from '@/lib/reasoning/rca';
const output = await runRca(input, { llm: new LocalLlmClient(llmConfigFromEnv()) });
```

Or over HTTP on the Next.js server: `POST /api/reasoning/rca` with an `RcaInput` body, or `{ "mock": "gas-leak-confirmed" }` to run a bundled case.

| Status | Meaning |
|---|---|
| 200 | `RcaOutput` JSON |
| 400 | Input failed validation; the message lists each bad field |
| 422 | The LLM's answer failed validation twice (`issues` lists why) |
| 503 | Local LLM not configured or unreachable |

The LLM runs on-prem only. Set `RCA_LLM_MODEL` (required), `RCA_LLM_BASE_URL` (default `http://127.0.0.1:11434/v1`, Ollama) and `RCA_LLM_TIMEOUT_MS` (default 120000). Any OpenAI-compatible server works (Ollama, vLLM, llama.cpp, LM Studio). Hosts that aren't loopback, private-network or internal names are refused.

## Input: `RcaInput` (from Perception and IoT)

```jsonc
{
  "incident": {
    "id": "GAS-001",
    "kind": "gas_leak",                 // gas_leak | heat_stress | boiler | other
    "occurred_at": "2026-11-25T18:24:00+05:00",   // ISO 8601 with offset
    "location": { "zone": "Boiler house", "asset": "Gas supply header GL-1" },
    "title": "…", "description": "…",
    "source": "Leak sensor GL-02",
    "reported_severity": "Medium",      // optional: High | Medium | Low (the app's scale)
    "injury": "none",                   // none | first_aid | medical | lost_time | fatality (default none)
    "people_exposed": 4                 // optional
  },
  "sensors": [                          // optional; only sensors in incident.location.zone are used
    {
      "sensor_id": "GP-IN-01",
      "kind": "gas_pressure_in",        // gas_pressure_in | gas_pressure_out | gas_concentration | wbgt | temperature | pressure | water_level
      "unit": "bar", "zone": "Boiler house",
      "line": "GL-1",                   // pairs gas inlet/outlet meters
      "limits": { "alarm_high": 10 },   // optional alarm_high / alarm_low
      "readings": [{ "t": "2026-11-25T18:00:00+05:00", "v": 4.0 }]
    }
  ]
}
```

The existing dashboard incidents in `lib/data.ts` can be converted with `fromAppIncident()`. They become kind `other` with no sensor data, so they come out `insufficient_data`.

### Which sensors can confirm which incident

A sensor counts as evidence only if it measures the reported hazard. An alarm on some other quantity in the same zone does not confirm the incident.

| Incident kind | Sensor kinds that can confirm it |
|---|---|
| `gas_leak` | `gas_pressure_in` + `gas_pressure_out` (paired), `gas_concentration` |
| `heat_stress` | `wbgt` only. Plain `temperature` may be process temperature, such as a boiler. **Pending:** a way for IoT to mark air temperature |
| `boiler` | `pressure`, `temperature`, `water_level` |
| `other` | none: always `insufficient_data` |

**Gas meter pairing:** an inlet and an outlet meter are compared only if they have the same `line`. Unlabelled meters are paired only when they're the zone's only inlet and only outlet. **IoT should always send `line`.**

## Output: `RcaOutput` (to Decision)

| Field | Type | Set by |
|---|---|---|
| `schema_version` | `"rca/v1"` | code |
| `incident_id` | string | code |
| `generated_at` | ISO timestamp | code |
| `model` | string, the LLM that wrote the analysis | code |
| `severity` | `small` \| `dangerous` | code (triage rules) |
| `triage` | `{ rules_fired: string[], provisional: boolean }` | code |
| `verified` | `{ value, status: confirmed \| not_confirmed \| insufficient_data, summary, evidence[] }` | code (sensors) |
| `method` | `5_whys` (small) \| `board` (dangerous) | code |
| `why_chain` | string[3–7], small only | LLM |
| `board` | `{ incident_occurred, why_it_happened, root_cause, circumstances[], secondary_risks[] }`, dangerous only | LLM; `root_cause` and `secondary_risks` copied from the top level by code |
| `fishbone` | `{ Man, Machine, Method, Material, Measurement, Environment }: string[]` | LLM |
| `root_cause` | string | LLM |
| `confidence` | 0–1, capped at 0.5 when not sensor-confirmed | LLM, capped by code |
| `secondary_risks` | `{ risk, likelihood: low \| medium \| high }[]` | LLM |
| `next_checks` | string[], at least 1 | LLM |

Each `evidence` item is `{ sensor_id, metric, observed, threshold, unit, from, to, breaches, severe, note }`. `observed` is the worst value seen. `breaches` means the threshold was crossed for at least 3 readings in a row.

Guarantees for Decision: every output passes `RcaOutputSchema`. `verified.value` is true exactly when `status` is `confirmed`. A `dangerous` output always has a `board` and never a `why_chain`, and a `small` one the reverse.
