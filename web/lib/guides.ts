/** User guide content. One guide per module, plus getting started and reference sections. */
export interface Guide {
  id: string;
  title: string;
  href?: string;
  summary: string;
  tasks: { title: string; steps: string[] }[];
  tips?: string[];
}

export const GUIDES: Guide[] = [
  {
    id: 'getting-started', title: 'Getting started',
    summary: 'Visual HSE watches the floor through cameras and sensors, checks what it sees against permits, lockout and the shift roster, and only then raises an alert. A person approves every report before it is filed.',
    tasks: [
      { title: 'Find your way around', steps: [
        'Use the sidebar on the left to open a module. On a small screen, tap the menu button at the top left.',
        'Badges next to a module count open items. Red needs attention now, lime means items are waiting.',
        'The card at the bottom of the sidebar shows the site, the shift and whether the feed is live.',
      ] },
      { title: 'Take a guided tour', steps: [
        'Open any page and select Guide at the top right.',
        'Each step highlights one module and explains it. Use Next and Back, or the arrow keys.',
        'Press Esc or select Skip tour to stop. You can replay it at any time.',
      ] },
      { title: 'Ask a question', steps: [
        'Select the search button at the top right.',
        'Type a question in plain words, for example “Why did Press 3 stop?”.',
        'Answers come with the sources they were built from.',
      ] },
    ],
  },
  {
    id: 'control', title: 'Control room', href: '/',
    summary: 'The start page. It shows how safe the site is right now, which zones need you first, and what the system has already done.',
    tasks: [
      { title: 'See what needs attention first', steps: [
        'Read the four headline numbers at the top: site risk, real alerts, machine stops and open actions.',
        'Check the five ranked zone cards. Number 1 is the highest risk.',
        'Select a zone to see why it scored high, the permit and lockout state, and the action taken.',
      ] },
      { title: 'Change the time range', steps: ['Choose This shift, 24 hours or 7 days above the zone cards.', 'The numbers, charts and event list update to match.'] },
      { title: 'Filter live events', steps: ['Go to Live events.', 'Choose All, High, Medium or Low.', 'Select an event to open its camera or incident.'] },
      { title: 'Report an incident by hand', steps: ['Select Report incident at the top of the page.', 'Fill in what happened and where. Camera and sensor events are logged for you.'] },
    ],
    tips: ['Real alerts are the ones left after the system checks permits, lockout and the roster. The “quiet” number is what it filtered out.'],
  },
  {
    id: 'live', title: 'Live floor', href: '/live',
    summary: 'What every camera and sensor sees right now, zone by zone.',
    tasks: [
      { title: 'Watch a camera', steps: ['Pick a camera from the list next to the view.', 'Boxes on the picture show what was detected. Red breaks a rule, amber is a warning, green is fine.', 'The summary under the picture explains what the camera saw.'] },
      { title: 'Check sensors and machines', steps: ['Sensors show the last 12 readings as a small trend.', 'Machines lists every machine as running, stopped, idle or locked out.'] },
    ],
  },
  {
    id: 'spatial', title: 'Spatial view', href: '/spatial',
    summary: 'A live 3D model of the hall. People and vehicles the cameras see are placed on the floor and checked against danger zones, walkways and safety-gear rules.',
    tasks: [
      { title: 'Move around the model', steps: ['Drag to orbit, right-drag to pan and scroll to zoom.', 'Select Reset view to go back to the full hall.', 'Use Pause to freeze the simulation.'] },
      { title: 'Watch through a camera', steps: [
        'Select a camera in the model, or choose one from the buttons under the feed.',
        'The feed shows the view from that camera with every detection boxed and labelled.',
        'Select Fly to camera to move the 3D view behind it.',
      ] },
      { title: 'Follow up a spatial event', steps: ['Scroll to Spatial events.', 'Each event lists the cameras that saw it.', 'Select Watch to switch the feed to that camera.'] },
      { title: 'Show or hide layers', steps: ['Use Camera cones, Danger zones and Labels at the top of the page.'] },
    ],
    tips: [
      'Rings under workers turn red when a rule is broken and amber for a warning.',
      'Red hatched floor is a danger zone. Green hatched floor is a pedestrian walkway.',
      'The forklift slows down by itself when a person is in front of it.',
    ],
  },
  {
    id: 'camera', title: 'Camera analysis', href: '/camera',
    summary: 'Checks recorded site video for people, safety gear and restricted-area entry. Every finding becomes an event that a person confirms or dismisses.',
    tasks: [
      { title: 'Review an event', steps: [
        'Pick a camera at the top of the page.',
        'Select an event in Events in this video. The video jumps to that moment.',
        'Look at the evidence frame and the person highlighted in the video.',
        'Select Confirm, or False alarm if the picture does not show the problem.',
      ] },
      { title: 'Draw a restricted area', steps: [
        'Select Camera setup.',
        'Click the picture to place at least three corners around the area.',
        'Name the area and select Save area. Camera analysis now checks it.',
      ] },
      { title: 'Delete a camera', steps: [
        'Open Camera setup and pick the camera.',
        'Delete its videos in Videos and its areas in Restricted areas.',
        'Select Delete camera at the bottom of Camera details and confirm.',
      ] },
      { title: 'Choose the safety gear to check', steps: ['Open Camera setup and pick the camera.', 'Tick the gear everyone must wear.', 'Select Save camera.'] },
      { title: 'Analyse a new video', steps: ['Select Upload video and choose an MP4, MOV or WebM file up to 2 minutes long.', 'How the analysis runs shows each step while it processes.', 'When it finishes, people are boxed and restricted-area entries are listed.'] },
    ],
    tips: [
      'person-1, person-2 and so on are tracking numbers for one video only. They are not names.',
      'A person counts as inside an area when their feet are inside it.',
      'Missing gear is shown as possible until a person confirms it. Gear can be hidden by the camera angle.',
      'People are detected by an AI model. Safety-gear checks on uploads start once the PPE model is connected.',
    ],
  },
  {
    id: 'heat', title: 'Heat risk', href: '/heat',
    summary: 'HeatShield joins live WBGT sensors, the 48-hour weather forecast and the site incident history into one risk score per area and shift, then suggests changes to planned work before the heat peaks.',
    tasks: [
      { title: 'Plan tomorrow around the heat', steps: [
        'Select Tomorrow at the top of the page.',
        'Read the Heat briefing. Each job at risk has a suggested change and the reason.',
        'Approve or decline each suggestion. Approved moves update the permit schedule.',
      ] },
      { title: 'Understand a score', steps: [
        'Select a cell in the Heat-risk map.',
        'The panel beside it shows the heat, planned-work and past-incident parts and how much each adds.',
        'During the current shift a live sensor reading replaces the forecast when it is hotter.',
      ] },
      { title: 'Watch the engine react to a sensor', steps: [
        'Scroll to WBGT sensors.',
        'Select Simulate a hot spot under one sensor.',
        'Within a few seconds the reading rises, the alarm appears and the map re-scores today.',
      ] },
    ],
    tips: [
      'WBGT (wet-bulb globe temperature) is the standard measure of heat stress. It includes humidity, sun and air movement.',
      'Work-rest bands follow ACGIH limits for moderate work by acclimatised workers.',
      'The sensor feed in this preview comes from a simulated gateway that follows the forecast.',
    ],
  },
  {
    id: 'voice', title: 'Voice reporting', href: '/voice',
    summary: 'Report a hazard or near-miss by speaking, in Urdu or English. The copilot transcribes it and drafts a report.',
    tasks: [
      { title: 'Record a report', steps: ['Choose Urdu or English.', 'Press the mic and speak what you saw.', 'Press again to stop. The words appear as you speak.'] },
      { title: 'Approve the draft', steps: ['Check the fields the copilot pulled out — type, location, hazard and severity.', 'Select Approve and file, or Edit first. Nothing is filed until a person approves it.'] },
    ],
    tips: ['Filed reports move to Incidents.'],
  },
  {
    id: 'incidents', title: 'Incidents & near-misses', href: '/incidents',
    summary: 'Every incident from first report to a filed investigation.',
    tasks: [
      { title: 'Review an investigation', steps: ['Pick an incident from This month.', 'Read the likely causes and the standard clauses involved.', 'Check the drafted report.'] },
      { title: 'Approve and file', steps: ['Read the draft and correct anything that is wrong.', 'Select Approve and file. Nothing is filed until a person approves it.'] },
    ],
  },
  {
    id: 'hira', title: 'Hazard ID & risk assessment', href: '/hira',
    summary: 'A structured HIRA for each task: the hazard, the risk score, the controls, and the risk that is left after them.',
    tasks: [
      { title: 'Read an assessment', steps: ['Pick a task from the list, ranked by the risk left after controls.', 'On the matrix, “Was” is the risk before controls and “Now” is what is left.', 'Read the controls, from elimination down to PPE.'] },
      { title: 'Review a HIRA', steps: ['Open an assessment marked Overdue or Due.', 'Select Review now to re-score it with the latest controls.'] },
    ],
    tips: ['Controls here feed the checks in Permits & lockout.'],
  },
  {
    id: 'permits', title: 'Permits & lockout', href: '/permits',
    summary: 'Hot work, confined space and lockout. The system reads these before raising any alarm.',
    tasks: [
      { title: 'Approve or decline a permit', steps: ['Open Waiting for approval.', 'Check the ticks. Training and the roster are checked for you.', 'Select Approve or Decline.'] },
      { title: 'Check a lockout', steps: ['Open the Lockout board.', 'Red rows are machines that need a lockout and do not have one.'] },
    ],
    tips: ['A permit that expires within an hour is listed in the summary at the top.'],
  },
  {
    id: 'inspections', title: 'Inspections & audits', href: '/inspections',
    summary: 'Mobile checklists with photo evidence. Every failed item becomes a tracked action.',
    tasks: [
      { title: 'Complete a checklist', steps: ['Open the checklist in progress.', 'Mark each item Pass, Fail or N/A.', 'Add a photo where you can.', 'Select Submit inspection.'] },
      { title: 'Download an audit pack', steps: ['Select Download audit pack at the top of the page.'] },
    ],
  },
  {
    id: 'actions', title: 'Follow-up actions', href: '/actions',
    summary: 'Corrective and preventive actions with an owner and a due date. Cameras confirm the fix before an action closes.',
    tasks: [
      { title: 'Move an action forward', steps: ['Find the card on the board.', 'Select the button at the bottom of the card to move it to the next stage.'] },
      { title: 'See one person’s actions', steps: ['Choose an owner at the top of the page.'] },
    ],
    tips: ['Overdue dates are shown in red.'],
  },
  {
    id: 'compliance', title: 'Compliance', href: '/compliance',
    summary: 'Site activity mapped to each standard, and the evidence still missing before an audit.',
    tasks: [
      { title: 'Check a standard', steps: ['Choose a standard at the top, such as ISO 45001.', 'Read the clause-by-clause table.', 'Turn on gaps only to see what is missing.'] },
      { title: 'Close a gap', steps: ['Open Missing evidence.', 'Each gap links to a follow-up action. Complete the action to close it.'] },
    ],
  },
  {
    id: 'sop', title: 'SOP & document control', href: '/sop',
    summary: 'One controlled library for SOPs, method statements, policies and safety data sheets, each with a version and a read trail.',
    tasks: [
      { title: 'Find a document', steps: ['Filter the library by category.', 'Select a document to see its version, owner and approval chain.'] },
      { title: 'Acknowledge a document', steps: ['Open the document.', 'Select Acknowledge to record that you have read and understood it.'] },
    ],
    tips: ['Documents overdue for review are shown in red.'],
  },
  {
    id: 'training', title: 'Training', href: '/training',
    summary: 'Who is trained for what, and who needs a refresher.',
    tasks: [
      { title: 'Read the competency matrix', steps: ['Each row is a person, each column a skill.', 'The key above the matrix explains each mark.'] },
      { title: 'Chase expiring training', steps: ['Open Needs attention.', 'Reminders are sent automatically in Urdu or English, by text or voice.'] },
    ],
  },
  {
    id: 'reports', title: 'Reports', href: '/reports',
    summary: 'The morning briefing and reports that write themselves.',
    tasks: [
      { title: 'Download a report', steps: ['Open Report library.', 'Select PDF or Excel next to the report.'] },
      { title: 'Turn a routine on or off', steps: ['Open Routines.', 'Use the switch next to the routine.'] },
    ],
  },
  {
    id: 'levels', title: 'Risk levels and colours',
    summary: 'The same colours mean the same thing everywhere in the app.',
    tasks: [
      { title: 'Levels', steps: [
        'Act (red): score 70 or more. Something needs doing now.',
        'Watch (amber): score 40 to 69. Keep an eye on it.',
        'Low (green): under 40. Normal.',
        'Off (grey): offline or not in use.',
      ] },
    ],
    tips: ['Colour is never used alone. Every level also has a word next to it.'],
  },
];
