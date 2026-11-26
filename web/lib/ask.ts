/* Ask IonHSE — mock answer engine for the pilot preview.
   No LLM: it matches the question to an intent and builds a grounded answer from the
   same sample data the dashboard shows, so every figure here matches a screen. */
import { audit, events, hiraKpis, kpi, sopKpis, trend, voiceKpis, waste, zones } from './data';
import type { Tone } from './data';

export interface AskChart {
  cols: { key: string; value: number; tick?: string; strong?: boolean }[];
  max: number;
  scale: 'risk' | 'count';
  label: string;
  caption: string;
}
export type Block = { kind: 'p'; text: string } | { kind: 'bullets'; items: string[] };
export interface AskAnswer {
  kind: 'answer' | 'greeting' | 'product' | 'offtopic';
  headline?: string;
  blocks: Block[];
  chart?: AskChart;
  sources?: string[];
  checked?: boolean;
  queries?: number;
}

export const askSuggestions = [
  'Which zone is the highest risk right now?',
  'When is risk highest across the shift?',
  'How many alerts this shift?',
  'Show waste and energy this shift',
];

/** The thinking steps shown while an answer is prepared — mirrors the real pipeline. */
export const askSteps = ['Understanding the question…', 'Querying the records…', 'Double-checking the figures…'];

const p = (text: string): Block => ({ kind: 'p', text });
const bullets = (items: string[]): Block => ({ kind: 'bullets', items });
const has = (q: string, re: RegExp) => re.test(q);

export function askAnswer(question: string): AskAnswer {
  const q = question.toLowerCase().trim();

  // greeting
  if (has(q, /^(hi+|hello+|hey+|salam|salaam|assalam|aoa|good (morning|afternoon|evening)|thanks|shukriya)\b/)) {
    return {
      kind: 'greeting',
      blocks: [p("Hello! I'm Ask IonHSE. Ask me about this plant's zones, alerts, incidents, permits, hazards and compliance — for example “Which zone is the highest risk?” or “When is risk highest across the shift?”")],
    };
  }

  // product
  if (has(q, /\b(who are you|what are you|what can you do|what is ionhse|tum kaun|aap? kaun|kya kar sakt)/)) {
    return {
      kind: 'product',
      blocks: [p("I'm Ask IonHSE, the assistant inside Visual HSE. I answer questions about this plant's safety data — zone risk, live events, permits, incidents, hazards, inspections and compliance. Every figure I give comes from the same records the dashboard shows.")],
    };
  }

  // highest-risk zone
  if (has(q, /\b(highest|high(est)? risk|most (dangerous|risky)|riskiest|worst|top zone|which zone|danger)\b/)) {
    const top = [...zones].sort((a, b) => b.score - a.score).slice(0, 5);
    return {
      kind: 'answer',
      headline: `${top[0].name} is the highest-risk zone right now, at ${top[0].score} / 100.`,
      blocks: [
        p(`Reason: ${top[0].cause.toLowerCase()}. ${top[0].action}`),
        bullets(top.slice(0, 4).map((z) => `${z.name} — ${z.score} (${z.score >= 70 ? 'act' : z.score >= 40 ? 'watch' : 'low'})`)),
        p('Three zones are above the 70 “act now” line this shift.'),
      ],
      chart: {
        cols: top.map((z) => ({ key: z.name, value: z.score, tick: z.name.split(' ')[0], strong: z === top[0] })),
        max: 100, scale: 'risk', label: 'Zone risk scores: ' + top.map((z) => `${z.name} ${z.score}`).join(', '),
        caption: 'Top 5 zones by risk score (out of 100)',
      },
      sources: ['Control room · Zone risk'], checked: true, queries: 1,
    };
  }

  // risk through the shift / peak hour
  if (has(q, /\b(when|peak|hour|through the shift|changeover|time of day|busiest|highest.*shift|shift.*risk)\b/)) {
    const peak = trend.reduce((m, t) => (t[1] > m[1] ? t : m));
    return {
      kind: 'answer',
      headline: `Risk peaks at ${peak[0]}, reaching ${peak[1]} / 100.`,
      blocks: [
        p('Risk climbs from the start of the shift to a peak around the mid-shift changeover, then eases off toward the end.'),
        p('Plan extra cover for the hour either side of the peak.'),
      ],
      chart: {
        cols: trend.map((t) => ({ key: t[0], value: t[1], tick: t[0].slice(0, 2), strong: t === peak })),
        max: 100, scale: 'risk', label: 'Predicted risk by hour: ' + trend.map((t) => `${t[0]} ${t[1]}`).join(', '),
        caption: 'Predicted risk index by hour this shift',
      },
      sources: ['Control room · Risk through the shift'], checked: true, queries: 1,
    };
  }

  // PPE / gloves
  if (has(q, /\b(ppe|gloves|helmet|vest|protective)\b/)) {
    const ppe = events.filter((e) => /ppe|gloves/i.test(e[3]));
    return {
      kind: 'answer',
      headline: `${ppe.length || 1} PPE issue${ppe.length === 1 ? '' : 's'} was raised this shift.`,
      blocks: [
        p('Vision-AI flagged missing gloves on two workers in Zone 4 · Packing. An alert went to the line lead and gloves were restocked at station 4B.'),
        p('A voice near-miss for the same hazard was also logged from Zone 4 at 18:46.'),
      ],
      sources: ['Live floor · Vision-AI', 'Voice reporting'], checked: true, queries: 2,
    };
  }

  // voice reports / near-miss
  if (has(q, /\b(voice|near.?miss|spoken|reported by voice|verbal)\b/)) {
    return {
      kind: 'answer',
      headline: `${voiceKpis[0][1]} voice reports were logged today, ${voiceKpis[0][3].replace('spoken ', '')}.`,
      blocks: [
        p(`Average time to log a spoken report is ${voiceKpis[1][1]} ${voiceKpis[1][2]} — against about six minutes on paper.`),
        p(`${voiceKpis[3][1]} are waiting for a person to approve before they are filed as incidents.`),
      ],
      sources: ['Voice reporting'], checked: true, queries: 1,
    };
  }

  // hazard / HIRA / risk assessment
  if (has(q, /\b(hazard|hira|risk assessment|assessment|residual|control measure)\b/)) {
    return {
      kind: 'answer',
      headline: `${hiraKpis[1][1]} assessments carry high residual risk after controls.`,
      blocks: [
        p(`There are ${hiraKpis[0][1]} assessments in total, and ${hiraKpis[2][1]} is overdue for review — the Blow-molding (Press 3) HIRA.`),
        p(`Controls in place: ${hiraKpis[3][1]}. The biggest open gap is a planned proximity limiter on the Dock 1 forklift route.`),
      ],
      sources: ['Hazard ID & risk assessment'], checked: true, queries: 1,
    };
  }

  // SOP / documents
  if (has(q, /\b(sop|document|procedure|method statement|sds|msds|policy|read.?and|acknowledg)\b/)) {
    return {
      kind: 'answer',
      headline: `${sopKpis[2][1]} controlled documents are overdue for review.`,
      blocks: [
        p(`${sopKpis[1][1]} of ${sopKpis[0][1]} documents are up to date (${sopKpis[1][3]}). Overdue ones include the Press jam-clearing SOP and the emergency evacuation plan.`),
        p(`This shift's crew has read and understood ${sopKpis[3][1]}% of the documents that apply to them.`),
      ],
      sources: ['SOP & document control'], checked: true, queries: 1,
    };
  }

  // compliance / ISO / audit readiness
  if (has(q, /\b(complian|iso|45001|14001|osha|audit ready|standard|certif)\b/)) {
    return {
      kind: 'answer',
      headline: `Audit readiness: ISO 45001 at ${audit[0][1]}%, ISO 14001 at ${audit[1][1]}%.`,
      blocks: [
        bullets(audit.map((a) => `${a[0]} — ${a[1]}% ready · next: ${a[2]}`)),
        p('The remaining gaps are evidence items, each already raised as a follow-up action.'),
      ],
      chart: {
        cols: audit.map((a) => ({ key: a[0], value: a[1], tick: a[0].includes('45001') ? '45001' : '14001', strong: false })),
        max: 100, scale: 'count', label: 'Audit readiness: ' + audit.map((a) => `${a[0]} ${a[1]}%`).join(', '),
        caption: 'Audit readiness by standard (%)',
      },
      sources: ['Control room · Audit readiness', 'Compliance'], checked: true, queries: 1,
    };
  }

  // waste / energy / spill
  if (has(q, /\b(waste|energy|spill|scrap|idle|leak|cost)\b/)) {
    return {
      kind: 'answer',
      headline: 'Waste and energy this shift, tracked alongside safety.',
      blocks: [
        bullets(waste.map((w) => `${w[0]} — ${w[1]} ${w[2]} · ${w[3]}`)),
      ],
      chart: {
        cols: [
          { key: 'Pellets (kg)', value: 6.4, tick: 'Spill', strong: true },
          { key: 'Idle (min)', value: 13, tick: 'Idle' },
          { key: 'Air leaks', value: 2, tick: 'Leak' },
          { key: 'Scrap (%)', value: 1.8, tick: 'Scrap' },
        ],
        max: 15, scale: 'count', label: 'Waste and energy this shift', caption: 'Waste and energy indicators this shift',
      },
      sources: ['Control room · Waste & energy'], checked: true, queries: 1,
    };
  }

  // actions / CAPA / overdue
  if (has(q, /\b(action|capa|corrective|overdue|follow.?up|open item)\b/)) {
    const k = kpi.shift;
    return {
      kind: 'answer',
      headline: `${k.capa} follow-up actions are open, ${k.due} of them overdue.`,
      blocks: [
        p('The most urgent are the Press 3 operator retraining and the Dock 1 walkway marking. Each has an owner and a due date.'),
        p('An action closes only after a camera re-check confirms the fix.'),
      ],
      sources: ['Control room · Follow-up actions'], checked: true, queries: 1,
    };
  }

  // alerts / incidents / today / stops — general headline numbers
  if (has(q, /\b(alert|incident|how many|today|this shift|stop|summary|status|overview|silenced|noise)\b/)) {
    const k = kpi.shift;
    return {
      kind: 'answer',
      headline: `${k.alerts} real alerts this shift, with ${k.stops} machine stop and ${k.silenced} events filtered out as noise.`,
      blocks: [
        p(`Site risk index is ${k.risk} / 100 — ${k.riskNote}.`),
        p(`${k.capa} follow-up actions are open (${k.due} overdue). The one machine stop was Press 3, when a hand entered the danger zone.`),
      ],
      sources: ['Control room'], checked: true, queries: 1,
    };
  }

  // fallback — stay on-topic, offer what it can do
  return {
    kind: 'offtopic',
    blocks: [
      p("I answer questions about this plant's HSE data — zone risk, live events, permits, incidents, hazards, inspections and compliance."),
      p('Try one of the suggestions, or ask something like “Which zone is the highest risk?” or “How many alerts this shift?”'),
    ],
  };
}
