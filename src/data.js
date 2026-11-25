/* Visual HSE — pilot sample data.
   Copied from the original "Visual HSE.html" screens; nothing here is invented. */
window.HSE = {
  site: { name: 'Plant A · Blow-molding hall', shift: 'Shift B · 14:00–22:00', user: 'Muhammad Bilal', initials: 'MB', org: 'Qubit Dynamics · HSE Copilot' },

  /* ---------- Control room ---------- */
  kpi: {
    shift: { risk: 62, riskNote: '3 zones above 70', alerts: 3, silenced: 41, stops: 1, capa: 7, due: 2 },
    day:   { risk: 48, riskNote: 'Peaks at shift changeover', alerts: 9, silenced: 118, stops: 2, capa: 11, due: 2 },
    week:  { risk: 41, riskNote: 'Down 9 points on last week', alerts: 37, silenced: 604, stops: 4, capa: 19, due: 5 }
  },
  zones: [
    { name: 'Press 3', score: 86, cause: 'Hand entered danger zone · machine live', cams: '2 online', sensors: 'Power, guard switch', permit: 'None', lockout: 'Not applied', action: 'Machine stopped. Supervisor to review footage and retrain operator before restart.' },
    { name: 'Zone 4 · Packing', score: 74, cause: 'PPE missing: gloves, 2 workers', cams: '3 online', sensors: 'Heat, vibration', permit: 'Not needed', lockout: 'n/a', action: 'Alert sent to line lead. Gloves restocked at station 4B.' },
    { name: 'Zone 7 · Conveyor', score: 71, cause: 'Pellet spill near conveyor', cams: '2 online', sensors: 'Belt speed, weight', permit: 'Not needed', lockout: 'n/a', action: 'Cleanup task sent to floor staff. Spill logged as waste.' },
    { name: 'Tank B', score: 58, cause: 'Temperature rising 2°C per hour', cams: '1 online', sensors: 'Temperature, pressure', permit: 'Not needed', lockout: 'n/a', action: 'Check cooling loop within the hour. Risk engine will re-score at 19:00.' },
    { name: 'Dock 1', score: 52, cause: 'Forklift came close to a pedestrian', cams: '2 online', sensors: 'Forklift speed, door', permit: 'Not needed', lockout: 'n/a', action: 'Remind drivers of the walkway. Consider a floor marking.' },
    { name: 'Compressor', score: 47, cause: 'Air leak detected on line 2 header', cams: '1 online', sensors: 'Air flow, power', permit: 'Hot work · open', lockout: 'Applied', action: 'Repair job raised for maintenance. Leak cost added to energy log.' },
    { name: 'Line 2 · Molders', score: 24, cause: 'Permit verified · lockout in place', cams: '4 online', sensors: 'Power, air, heat', permit: 'Valid until 20:00', lockout: 'Applied', action: 'No action. Technician is working under a valid permit.' },
    { name: 'Zone 1 · Intake', score: 18, cause: 'Inspection passed at 14:30', cams: '2 online', sensors: 'Gas, dust', permit: 'Not needed', lockout: 'n/a', action: 'No action.' }
  ],
  events: [
    ['18:42', 'High', 'Press 3', 'Hand in danger zone, machine stopped', 'Vision-AI'],
    ['18:37', 'High', 'Zone 4', 'PPE missing (gloves)', 'Vision-AI'],
    ['18:31', 'Medium', 'Tank B', 'Temperature rising', 'Chemical & sensors'],
    ['18:24', 'Low', 'Line 2', 'Permit verified, alert held back', 'Safety agent'],
    ['18:16', 'High', 'Zone 7', 'Spill near conveyor', 'Vision-AI'],
    ['18:09', 'Medium', 'Dock 1', 'Forklift close to pedestrian', 'Vision-AI'],
    ['17:58', 'Medium', 'Compressor', 'Air leak detected', 'IoT sensors'],
    ['17:45', 'Low', 'Zone 1', 'Inspection passed', 'Inspections'],
    ['17:30', 'Low', 'Shift change', 'Roster synced', 'Connectors']
  ],
  decisions: [
    { time: '18:24', zone: 'Line 2', scene: 'Technician enters the blow-molding area.', outcome: 'Stayed quiet', sev: 'Low',
      checks: [[1, 'Permit to work valid'], [1, 'Lockout applied'], [1, 'On today’s roster']], action: 'No alarm. Entry logged against the permit.' },
    { time: '18:42', zone: 'Press 3', scene: 'Someone reaches into the press while it runs.', outcome: 'Stopped', sev: 'High',
      checks: [[0, 'No permit'], [0, 'Machine live, no lockout'], [1, 'On today’s roster']], action: 'Machine stopped in 0.6 s. Supervisor alerted.' },
    { time: '18:16', zone: 'Zone 7', scene: 'Spilled pellets near the conveyor.', outcome: 'Task sent', sev: 'Medium',
      checks: [[1, 'Spill confirmed by 2 cameras'], [1, 'Floor staff on shift'], [1, 'Waste log open']], action: 'Cleanup task assigned. Camera confirms before closing.' }
  ],
  trend: [['14:00', 28], ['15:00', 34], ['16:00', 41], ['17:00', 55], ['18:00', 72], ['19:00', 62], ['20:00', 47], ['21:00', 38]],
  waste: [['Pellets spilled', '6.4', 'kg', '3 spills, all cleaned'], ['Idle machine time', '2 h 10', 'min', 'Mostly Press 3 stop'], ['Air leaks found', '2', '', '1 repaired'], ['Scrap', '1.8', '%', 'Of output this shift']],
  audit: [['ISO 45001 · worker safety', 92, 'Press 3 risk assessment update'], ['ISO 14001 · environment', 86, 'October waste register sign-off']],

  /* ---------- Live floor ---------- */
  floorStats: [['17', 'of 18 cameras online'], ['64', 'sensors reporting'], ['23', 'people on the floor']],
  cams: [
    { id: 'CAM 03', name: 'Press 3', zone: 'Press hall', sev: 'High', status: 'Danger zone · machine stopped', summary: 'Hand detected inside the press guard while the machine was live. No permit, no lockout. Machine stopped in 0.6 s.',
      boxes: [{ label: 'Person · hand in zone', sev: 'High', l: 30, t: 26, w: 16, h: 44 }, { label: 'Press 3 · live', sev: 'Medium', l: 8, t: 30, w: 34, h: 46 }] },
    { id: 'CAM 05', name: 'Packing 4B', zone: 'Zone 4', sev: 'High', status: 'Safety gear missing', summary: 'Two workers at station 4B without gloves. Line lead alerted.',
      boxes: [{ label: 'No gloves', sev: 'High', l: 22, t: 24, w: 12, h: 48 }, { label: 'No gloves', sev: 'High', l: 52, t: 28, w: 12, h: 46 }] },
    { id: 'CAM 07', name: 'Conveyor', zone: 'Zone 7', sev: 'High', status: 'Spill detected', summary: 'Pellet spill next to the conveyor, about 1.2 m². Cleanup task sent.',
      boxes: [{ label: 'Spill · pellets', sev: 'High', l: 48, t: 62, w: 26, h: 16 }] },
    { id: 'CAM 09', name: 'Dock 1', zone: 'Dock 1', sev: 'Medium', status: 'Forklift close to person', summary: 'Forklift passed 0.8 m from a pedestrian outside the walkway.',
      boxes: [{ label: 'Forklift', sev: 'Medium', l: 50, t: 34, w: 24, h: 36 }, { label: 'Person · 0.8 m', sev: 'Medium', l: 30, t: 30, w: 10, h: 42 }] },
    { id: 'CAM 11', name: 'Line 2 · Molder 2', zone: 'Line 2', sev: 'Low', status: 'Permit verified', summary: 'Technician inside the guard under a valid permit, lockout applied. No alert.',
      boxes: [{ label: 'Technician · permit OK', sev: 'Low', l: 26, t: 24, w: 12, h: 48 }] },
    { id: 'CAM 12', name: 'Tank B', zone: 'Tank farm', sev: 'Medium', status: 'Watching temperature', summary: 'No people near Tank B. Temperature is being tracked by sensors.', boxes: [] },
    { id: 'CAM 14', name: 'Intake', zone: 'Zone 1', sev: 'Low', status: 'All clear', summary: 'Normal activity. Inspection passed at 14:30.',
      boxes: [{ label: 'Person · gear OK', sev: 'Low', l: 40, t: 28, w: 10, h: 44 }] },
    { id: 'CAM 16', name: 'Compressor room', zone: 'Utilities', sev: 'Off', status: 'Offline since 17:12', summary: 'Camera offline. Maintenance ticket raised; sensors still reporting.', boxes: [] }
  ],
  /* name, col, row, colSpan, rowSpan, sev, people */
  plan: [
    ['Zone 1 · Intake', 1, 1, 1, 1, 'Low', 3], ['Line 2 · Molders', 2, 1, 2, 1, 'Low', 5], ['Tank B', 4, 1, 1, 1, 'Medium', 0],
    ['Press 3', 1, 2, 2, 1, 'High', 2], ['Zone 4 · Packing', 3, 2, 1, 1, 'High', 6], ['Compressor', 4, 2, 1, 1, 'Medium', 1],
    ['Zone 7 · Conveyor', 1, 3, 2, 1, 'High', 2], ['Dock 1', 3, 3, 2, 1, 'Medium', 4]
  ],
  sensors: [
    { label: 'Power draw', value: '412', unit: 'kW', state: 'Normal', sev: 'Low', where: 'Whole hall · 6% above plan', v: [380, 390, 402, 398, 410, 405, 415, 420, 408, 400, 410, 412] },
    { label: 'Compressed air', value: '6.4', unit: 'bar', state: 'Leak', sev: 'Medium', where: 'Line 2 header · pressure falling', v: [7.0, 7.0, 6.9, 6.9, 6.8, 6.8, 6.7, 6.6, 6.6, 6.5, 6.5, 6.4] },
    { label: 'Tank B temperature', value: '74', unit: '°C', state: 'Rising', sev: 'Medium', where: 'Limit 85 °C · +2 °C per hour', v: [64, 65, 66, 67, 68, 69, 70, 71, 72, 72, 73, 74] },
    { label: 'Flammable gas', value: '2', unit: '% LEL', state: 'Normal', sev: 'Low', where: 'Tank farm · alarm at 10%', v: [2, 2, 3, 2, 2, 2, 3, 2, 2, 2, 2, 2] },
    { label: 'Vibration, Press 2', value: '4.1', unit: 'mm/s', state: 'Watch', sev: 'Medium', where: 'Bearing wear likely · trend up', v: [2.8, 2.9, 3.0, 3.1, 3.3, 3.4, 3.5, 3.7, 3.8, 3.9, 4.0, 4.1] },
    { label: 'Lockout switches', value: '3', unit: 'of 3', state: 'Engaged', sev: 'Low', where: 'Molder 2, Compressor, Chiller', v: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] }
  ],
  machineState: { Running: 'Low', Stopped: 'High', 'Locked out': 'Off', Idle: 'Medium' },
  machines: [
    ['Press 1', 'Press hall', 'Running', '38 kW', '61 °C', 'Guard closed'],
    ['Press 2', 'Press hall', 'Running', '41 kW', '66 °C', 'Guard closed'],
    ['Press 3', 'Press hall', 'Stopped', '0 kW', '58 °C', 'Guard opened · no lockout'],
    ['Molder 1', 'Line 2', 'Running', '55 kW', '212 °C', 'Guard closed'],
    ['Molder 2', 'Line 2', 'Locked out', '0 kW', '96 °C', 'Locked out · permit PTW-1182'],
    ['Molder 3', 'Line 2', 'Idle', '9 kW', '180 °C', 'Guard closed · idle 42 min'],
    ['Conveyor', 'Zone 7', 'Running', '7 kW', '—', 'Spill nearby'],
    ['Compressor', 'Utilities', 'Running', '74 kW', '48 °C', 'Leak on header']
  ],

  /* ---------- Incidents ---------- */
  incidentKpis: [['Open incidents', '2', '', '1 high severity'], ['Near-misses this month', '14', '', 'Reported early, before harm'], ['Average time to close', '2.4', 'days', 'Paperwork drafted by agents'], ['Lost-time injuries', '0', '', 'This month']],
  incidentStages: ['Report', 'Investigate', 'Comply', 'Document'],
  incidentStageText: { 1: 'Reported', 2: 'Investigating', 3: 'Mapping to standards', 4: 'Closed' },
  incidents: [
    { id: 'INC-0412', date: '25 Nov', time: '18:42', type: 'Incident', sev: 'High', zone: 'Press 3', stage: 2, title: 'Hand entered Press 3 while live',
      what: 'An operator reached past the guard to clear a jammed part. The camera saw the hand in the danger zone and the machine was stopped in 0.6 s. No injury.',
      source: 'Vision-AI, CAM 03',
      causes: ['Jams on Press 3 rose from 2 to 9 a week since the mould change on 12 Nov.', 'Operator not trained on lockout; certificate expired 3 Nov.', 'Guard has no interlock, so it opens while the press runs.'],
      clauses: [['ISO 45001 · 8.1.2', 'Eliminate hazards and reduce risk', 'Gap'], ['ISO 45001 · 7.2', 'Competence of workers', 'Gap'], ['OSHA 1910.147', 'Control of hazardous energy (lockout)', 'Evidence on file']],
      draft: 'Report drafted with 3 actions: retrain operators, fit a guard interlock, review the mould.' },
    { id: 'NM-0219', date: '25 Nov', time: '18:09', type: 'Near-miss', sev: 'Medium', zone: 'Dock 1', stage: 1, title: 'Forklift 0.8 m from pedestrian',
      what: 'A forklift reversing out of bay 2 passed close to a worker who was walking outside the marked walkway.',
      source: 'Vision-AI, CAM 09',
      causes: ['Walkway paint has worn away near bay 2.', 'Third close pass at this spot in two weeks.', 'Reversing alarm working; driver speed normal.'],
      clauses: [['ISO 45001 · 8.1.2', 'Eliminate hazards and reduce risk', 'Gap'], ['OSHA 1910.178', 'Powered industrial trucks', 'Evidence on file']],
      draft: 'Draft suggests repainting the walkway and adding a mirror at bay 2.' },
    { id: 'INC-0409', date: '25 Nov', time: '18:16', type: 'Incident', sev: 'Medium', zone: 'Zone 7', stage: 3, title: 'Pellet spill by the conveyor',
      what: 'About 1.2 m² of pellets on the floor next to the conveyor transfer point. Slip risk and possible drain loss.',
      source: 'Vision-AI, CAM 07',
      causes: ['Transfer chute misaligned after cleaning.', 'Same chute spilled on 19 Nov.'],
      clauses: [['ISO 14001 · 8.1', 'Operational control of waste', 'Evidence on file'], ['ISO 45001 · 8.1.2', 'Slip hazard controlled', 'Evidence on file']],
      draft: 'Cleanup done and camera-confirmed. Report ready to file.' },
    { id: 'NM-0216', date: '22 Nov', time: '10:20', type: 'Near-miss', sev: 'Low', zone: 'Line 2', stage: 4, title: 'Lockout missing on Molder 1 at start of repair',
      what: 'Technician asked for a permit by voice before lockout. The agent held the permit until the lockout switch was engaged.',
      source: 'Voice report, Urdu',
      causes: ['Permit step done out of order.', 'System caught it before entry.'],
      clauses: [['OSHA 1910.147', 'Control of hazardous energy (lockout)', 'Evidence on file']],
      draft: 'Closed and filed. Approved by the safety head on 22 Nov.' },
    { id: 'INC-0401', date: '18 Nov', time: '15:05', type: 'Incident', sev: 'Low', zone: 'Zone 4', stage: 4, title: 'Minor burn from hot preform',
      what: 'A packer touched a hot preform without gloves. First aid given, back to work the same shift.',
      source: 'Form, line lead',
      causes: ['Glove dispenser at 4B was empty.', 'Preforms reach packing hotter than usual.'],
      clauses: [['ISO 45001 · 10.2', 'Incident and corrective action', 'Evidence on file']],
      draft: 'Closed and filed. Approved by the safety head on 19 Nov.' }
  ],

  /* ---------- Permits & lockout ---------- */
  permitRequests: [
    { id: 'PTW-1190', type: 'Lockout · repair', when: '18:51', who: 'Imran K. (voice)', work: 'Replace the guard hinge on Press 3 after today’s stop.',
      checks: [['ok', 'Lockout trained'], ['ok', 'On roster'], ['wait', 'Power isolation not yet seen by camera']] },
    { id: 'PTW-1191', type: 'Hot work', when: '18:47', who: 'Maintenance team', work: 'Weld a bracket on the compressor header to fix the air leak.',
      checks: [['ok', 'Hot-work trained'], ['no', 'Gas test missing'], ['ok', 'Fire watch named']] }
  ],
  permits: [
    { id: 'PTW-1182', type: 'Lockout · repair', work: 'Nozzle change on Molder 2', where: 'Line 2', holder: 'Usman R.', status: 'Work in progress', sev: 'Low', until: '20:00', left: '1 h 08 m', pct: 45,
      checks: [['ok', 'Power off, seen by CAM 11'], ['ok', 'Lock and tag on switch 2B'], ['ok', 'Air line bled']] },
    { id: 'PTW-1185', type: 'Hot work', work: 'Cut and replace a rail on the chiller frame', where: 'Utilities', holder: 'Bilal S.', status: 'Expiring soon', sev: 'Medium', until: '19:15', left: '23 m', pct: 88,
      checks: [['ok', 'Gas test 0% LEL at 17:30'], ['ok', 'Fire watch on site'], ['wait', 'Re-test gas before 19:00']] },
    { id: 'PTW-1187', type: 'Confined space', work: 'Inspect inside Tank C', where: 'Tank farm', holder: 'Ali H. + 1', status: 'Work in progress', sev: 'Low', until: '21:00', left: '2 h 08 m', pct: 30,
      checks: [['ok', 'Oxygen 20.8%'], ['ok', 'Standby person outside'], ['ok', 'Inlet valves locked']] }
  ],
  lockState: { 'Locked · verified': 'Low', 'Not locked': 'High', 'Release pending': 'Medium' },
  locks: [
    ['Molder 2', 'Electric, compressed air', 'Usman R.', '17:52', 'CAM 11 + switch', 'Locked · verified'],
    ['Compressor', 'Electric, air pressure', 'Maintenance', '16:40', 'Switch sensor', 'Locked · verified'],
    ['Chiller', 'Electric, coolant', 'Bilal S.', '15:30', 'Switch sensor', 'Release pending'],
    ['Press 3', 'Electric, hydraulic', '—', '—', 'CAM 03', 'Not locked'],
    ['Tank C inlet', 'Process line, steam', 'Ali H.', '18:10', 'Valve sensors', 'Locked · verified']
  ],

  /* ---------- Inspections ---------- */
  inspectionKpis: [['Due this week', '9', '', '2 done, 1 overdue'], ['Completed on time', '94', '%', 'Last 30 days'], ['Open findings', '6', '', '1 high risk'], ['Audit pack', 'Ready', '', 'Updated 18:30 today']],
  checklist: [
    ['Fixed guards in place on Press 1 and 2', 'OSHA 1910.212'],
    ['Emergency stops tested and working', 'ISO 45001 · 8.2'],
    ['Press 3 guard interlock fitted', 'OSHA 1910.212'],
    ['Lockout points labelled at every press', 'OSHA 1910.147'],
    ['Floor markings and walkways visible', 'ISO 45001 · 8.1.2'],
    ['Gloves and eye protection stocked at stations', 'ISO 45001 · 8.1.2'],
    ['Fire extinguisher within 15 m, in date', 'Local fire code']
  ],
  checklistPhotos: { 0: 'Press 1 guard', 2: 'Press 3 guard, no interlock' },
  schedState: { Done: 'Low', 'In progress': 'Medium', Overdue: 'High', Planned: 'Info' },
  schedule: [
    ['Today 14:30', 'Intake area daily walk', 'Zone 1', 'Line lead', 'Done'],
    ['Today 18:20', 'Weekly machine guarding', 'Press hall', 'Sana M.', 'In progress'],
    ['Yesterday', 'Forklift pre-use check', 'Dock 1', 'Driver, bay 2', 'Overdue'],
    ['Tomorrow', 'Chemical store and eyewash', 'Tank farm', 'HSE officer', 'Planned'],
    ['28 Nov', 'Fire equipment monthly', 'Whole site', 'Facilities', 'Planned'],
    ['2 Dec', 'ISO 14001 internal audit', 'Waste & drains', 'Auditor', 'Planned']
  ],
  findings: [
    ['Press 3 guard has no interlock', 'Machine guarding', '25 Nov', 'High', 'Fit interlock · Maintenance'],
    ['Walkway paint worn at bay 2', 'Dock walk', '21 Nov', 'Medium', 'Repaint · Facilities'],
    ['Eyewash bottle out of date', 'Chemical store', '18 Nov', 'Medium', 'Replace · HSE officer'],
    ['Glove dispenser empty at 4B', 'Packing walk', '18 Nov', 'Low', 'Restock · Line lead']
  ],

  /* ---------- Follow-up actions ---------- */
  actionCols: ['Open', 'In progress', 'Awaiting check', 'Done'],
  actionNext: ['Start work', 'Mark as fixed', 'Confirm and close', ''],
  actionOwners: ['Everyone', 'Maintenance', 'Facilities', 'HSE officer', 'Floor team'],
  actionOverdue: { '20 Nov': 1, '22 Nov': 1, '15 Nov': 1 },
  actions: [
    ['CA-118', 'Retrain Press 3 operators on lockout', 'INC-0412', 'Shift supervisor', 'Today', 'High', 0],
    ['CA-119', 'Fit a guard interlock on Press 3', 'INC-0412', 'Maintenance', '28 Nov', 'High', 1],
    ['CA-120', 'Restock gloves at station 4B', 'Vision-AI, Zone 4', 'Line lead', 'Today', 'Medium', 0],
    ['CA-114', 'Repair air leak on line 2 header', 'IoT sensors', 'Maintenance', '26 Nov', 'Medium', 1],
    ['CA-109', 'Repaint walkway at Dock 1 bay 2', 'NM-0219', 'Facilities', '22 Nov', 'Medium', 0],
    ['CA-121', 'Clean pellet spill, Zone 7', 'INC-0409', 'Floor team', 'Today', 'Medium', 2],
    ['CA-116', 'Realign conveyor transfer chute', 'INC-0409', 'Maintenance', '27 Nov', 'Low', 0],
    ['CA-111', 'Replace eyewash bottle in chemical store', 'Inspection', 'HSE officer', '20 Nov', 'Medium', 3],
    ['CA-105', 'Add mirror at Dock 1 bay 2', 'NM-0207', 'Facilities', '15 Nov', 'Low', 3],
    ['CA-117', 'Update Press 3 risk assessment', 'Compliance agent', 'HSE officer', '29 Nov', 'High', 1]
  ],

  /* ---------- Compliance ---------- */
  clauseState: { Met: 'Low', Partial: 'Medium', Gap: 'High' },
  standards: {
    'ISO 45001': { name: 'ISO 45001 · worker safety', pct: 92, covered: '24 of 26', scope: 'Clauses 4 to 10', next: '12 Jan', nextNote: 'Surveillance audit, external',
      clauses: [['4.1', 'Context of the organisation', '3 documents', 'Met'], ['5.4', 'Worker consultation and participation', 'Safety committee minutes', 'Met'],
        ['6.1.2', 'Hazard identification and risk assessment', '41 assessments', 'Partial'], ['7.2', 'Competence', 'Training records, 96 workers', 'Partial'],
        ['8.1.2', 'Eliminating hazards and reducing risk', '18 actions, 2 open', 'Partial'], ['8.2', 'Emergency preparedness', 'Drill log, Oct', 'Met'],
        ['9.1', 'Monitoring and measurement', 'Live dashboard, daily', 'Met'], ['10.2', 'Incident and corrective action', '5 incidents, all reported', 'Met']],
      gaps: [['Press 3 risk assessment out of date', '6.1.2', 'CA-117 · HSE officer'], ['Two operators with expired lockout training', '7.2', 'CA-118 · Shift supervisor'], ['Press 3 guard without interlock', '8.1.2', 'CA-119 · Maintenance']] },
    'ISO 14001': { name: 'ISO 14001 · environment', pct: 86, covered: '19 of 22', scope: 'Clauses 4 to 10', next: '2 Dec', nextNote: 'Internal audit, waste and drains',
      clauses: [['6.1.2', 'Environmental aspects', 'Aspects register', 'Met'], ['6.1.3', 'Compliance obligations', 'Permit register', 'Met'],
        ['8.1', 'Operational control', 'Spill and waste logs, daily', 'Partial'], ['8.2', 'Emergency preparedness', 'Spill kit checks', 'Met'],
        ['9.1.1', 'Monitoring energy and waste', 'Sensor data, live', 'Met'], ['9.1.2', 'Evaluation of compliance', 'October sign-off', 'Gap']],
      gaps: [['October waste register not signed off', '9.1.2', 'Sign-off · HSE manager'], ['Drain cover check missing near conveyor', '8.1', 'CA-116 · Maintenance']] },
    'OSHA 1910': { name: 'OSHA 1910 · general industry', pct: 89, covered: '11 of 12', scope: 'Sections in scope for this site', next: '—', nextNote: 'No inspection scheduled',
      clauses: [['1910.132', 'Personal protective equipment', 'Camera checks, live', 'Partial'], ['1910.147', 'Control of hazardous energy', 'Permits with verified lockout', 'Partial'],
        ['1910.178', 'Powered industrial trucks', 'Driver licences, pre-use checks', 'Partial'], ['1910.212', 'Machine guarding', 'Weekly inspection', 'Gap'],
        ['1910.157', 'Portable fire extinguishers', 'Monthly checks', 'Met']],
      gaps: [['Press 3 guard without interlock', '1910.212', 'CA-119 · Maintenance'], ['Molder 3 has no lockout procedure', '1910.147', 'SOP draft · HSE officer']] }
  },
  askCompliance: { q: 'Are we covered for lockout on Line 2?', a: 'Yes for Molder 1 and 2: lockout steps are in SOP-LT-04 v3 and every repair this month had a permit with a camera-verified isolation. Molder 3 has no written lockout procedure yet.', refs: ['OSHA 1910.147(c)(4)', 'SOP-LT-04 v3', 'PTW-1182'] },

  /* ---------- Training ---------- */
  courses: ['Lockout', 'Hot work', 'Confined space', 'Forklift', 'First aid', 'Chemicals'],
  people: [
    ['Imran K.', 'Press operator', 'xnnnvn'], ['Ahmed T.', 'Press operator', 'xnnnen'], ['Usman R.', 'Maintenance tech', 'vvvnvv'],
    ['Bilal S.', 'Welder', 'vvennv'], ['Ali H.', 'Maintenance tech', 'vnvnvv'], ['Sana M.', 'HSE officer', 'vvvnvv'],
    ['Farhan Q.', 'Forklift driver', 'nnnevn'], ['Hina J.', 'Line lead', 'vnnnvv'], ['Kamran D.', 'Packer', 'nnnnxn'], ['Zara N.', 'Process tech', 'vnvnve']
  ],
  trainingKpis: [['People on Shift B', '23', '', '10 shown in the matrix'], ['Fully competent', '87', '%', 'For the jobs on today’s roster'], ['Expired or missing', '3', '', 'Permits blocked for these tasks'], ['Expiring in 30 days', '4', '', 'Reminders already sent']],
  attention: [
    ['Imran K.', 'Lockout', 'Expired 3 Nov. Linked to INC-0412 on Press 3.', 'Expired', 'High'],
    ['Ahmed T.', 'Lockout', 'Expired 10 Nov. Press permits blocked until renewed.', 'Expired', 'High'],
    ['Kamran D.', 'First aid', 'Never completed. Required for packers since Oct.', 'Missing', 'High'],
    ['Bilal S.', 'Confined space', 'Expires 9 Dec.', 'Expiring', 'Medium'],
    ['Farhan Q.', 'Forklift', 'Licence expires 14 Dec.', 'Expiring', 'Medium'],
    ['Zara N.', 'Chemicals', 'Expires 20 Dec.', 'Expiring', 'Medium']
  ],
  reminders: [['30 days before expiry', 'Worker'], ['7 days before expiry', 'Worker + supervisor'], ['On expiry', 'Permits blocked']],

  /* ---------- Reports ---------- */
  weeks: [['6 Oct', 5, 2], ['13 Oct', 4, 3], ['20 Oct', 4, 3], ['27 Oct', 3, 4], ['3 Nov', 3, 5], ['10 Nov', 2, 6], ['17 Nov', 2, 7], ['24 Nov', 1, 6]],
  briefing: [
    'Yesterday: no injuries, 3 near-misses, 1 spill cleaned within 20 minutes.',
    'Highest risk today: Press 3 during the 18:00 changeover. Two operators’ lockout training has expired.',
    'Due today: glove restock at 4B, operator retraining, hot-work gas re-test on the chiller.',
    'Energy: one air leak on the line 2 header; repair job raised.'
  ],
  reportState: { Approved: 'Low', 'Needs approval': 'Medium', Scheduled: 'Info' },
  reports: [
    ['Incident report · INC-0412 Press 3', 'Drafted by Reporting agent · 25 Nov', 'Needs approval'],
    ['Weekly safety digest · week 47', 'Auto-generated · 24 Nov', 'Approved'],
    ['November management report', 'Risk, outcomes, waste · due 1 Dec', 'Scheduled'],
    ['ISO 45001 audit pack', 'All evidence, cited · updated today', 'Approved'],
    ['Waste and energy · October', 'Spills, idle time, air leaks', 'Approved'],
    ['Near-miss trends · Q4 to date', 'By zone and shift', 'Approved']
  ],
  routines: [
    ['Morning safety briefing', 'Every day at 06:30'],
    ['Risk alert to supervisor', 'When a zone goes above 70'],
    ['Permit and training reminders', '30 and 7 days before expiry'],
    ['Weekly digest to leadership', 'Mondays at 08:00'],
    ['Monthly management report', 'First working day of the month']
  ]
};
