/*
 * Spatial view engine: a Three.js model of the Plant A hall with workers, a forklift and CCTV.
 * Rendering approach (batched procedural equipment, hemisphere + soft-shadow sun, ACES tone mapping,
 * CSS2D labels, orbit + tweened fly-to) follows D:\3d_spatiography. No satellite or map layers.
 *
 * Coordinates are metres: x east (-32..32), z south (-20..20), y up. The hall is split into the same
 * 4 x 3 zone grid as the Live floor plan (lib/data.ts `plan`).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export type Level = 'High' | 'Medium' | 'Low';
export interface Detection { id: string; label: string; sev: Level; conf: number }
export interface SimEvent { key: string; time: string; sev: Level; where: string; what: string; cams: string[] }
export interface CamInfo { id: string; name: string; offline?: boolean }
export interface SimTick {
  time: string;
  people: number;
  helmets: number;
  gloveIssues: number;
  pressStopped: boolean;
  forkliftSpeed: number;
  nearMisses: number;
  stops: number;
  camCounts: Record<string, { people: number; alerts: number }>;
  detections: Detection[];
}
export interface SimOptions { cones: boolean; zones: boolean; labels: boolean; paused: boolean }

/* ---------------- palette ---------------- */
const C = {
  bg: 0xe9ecea, floor: 0xd3d6d0, floorDark: 0xc4c8c1, wall: 0xe7e9e5, wallTrim: 0xb9beb9,
  line: 0xe3b53b, walk: 0x58a88f, danger: 0xc8343d, vehicle: 0xc98412,
  steel: 0x8d949b, steelDark: 0x4b5158, guard: 0xe0b23a, teal: 0x5f8f88, machine: 0xdfe2de, ink: 0x1d2124,
  skin: 0xc99a78, pants: 0x2d3a4f, glove: 0x2f62b0, vest: 0xd8f04a, vestOrange: 0xf08a24, shirt: 0x6f7c8b,
  helmetY: 0xf2c230, helmetW: 0xf3f3ee, card: 0xc49a6c, tank: 0xe8e9e4, pellet: 0xf4f1e6, cam: 0x26292c,
};
const HEX: Record<Level, string> = { High: '#ff5a4e', Medium: '#f6b43e', Low: '#3ccf7c' };

const mats = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, rough = 0.8, metal = 0): THREE.MeshStandardMaterial {
  const k = `${color}-${rough}-${metal}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return mats.get(k)!;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 24);

function box(parent: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) {
  const o = new THREE.Mesh(BOX, m);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.y = ry;
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}
function cyl(parent: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, r: number, h: number, horizontal = false) {
  const o = new THREE.Mesh(CYL, m);
  o.position.set(x, y, z); o.scale.set(r, h, r);
  if (horizontal) o.rotation.z = Math.PI / 2;
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}
function flat(parent: THREE.Object3D, m: THREE.Material, x: number, z: number, w: number, d: number, y = 0.012) {
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); o.receiveShadow = true;
  parent.add(o);
  return o;
}
function hatch(color: number, bg: string) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#' + color.toString(16).padStart(6, '0'); g.lineWidth = 10;
  for (let i = -64; i < 128; i += 26) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- layout ---------------- */
const HALL = { x0: -32, x1: 32, z0: -20, z1: 20 };
const CW = 16, RH = 40 / 3;
const ZONES: [string, number, number, number, number][] = [
  ['Zone 1 · Intake', 1, 1, 1, 1], ['Line 2 · Molders', 2, 1, 2, 1], ['Tank B', 4, 1, 1, 1],
  ['Press 3', 1, 2, 2, 1], ['Zone 4 · Packing', 3, 2, 1, 1], ['Compressor', 4, 2, 1, 1],
  ['Zone 7 · Conveyor', 1, 3, 2, 1], ['Dock 1', 3, 3, 2, 1],
];
const zoneRect = (c: number, r: number, cs: number, rs: number) => ({
  x0: HALL.x0 + (c - 1) * CW, x1: HALL.x0 + (c - 1 + cs) * CW, z0: HALL.z0 + (r - 1) * RH, z1: HALL.z0 + (r - 1 + rs) * RH,
});
function zoneAt(x: number, z: number) {
  for (const [name, c, r, cs, rs] of ZONES) {
    const q = zoneRect(c, r, cs, rs);
    if (x >= q.x0 && x < q.x1 && z >= q.z0 && z < q.z1) return name;
  }
  return 'Hall';
}

/** Press 3 danger zone (in front of the press) and the dock's vehicle-only area. */
const PRESS_ZONE = { x0: -10.2, x1: -5.8, z0: 0.3, z1: 2.6 };
const WALKWAY = { x0: 0.6, x1: 3.4, z0: 7.2, z1: 19.6 };
const inRect = (r: { x0: number; x1: number; z0: number; z1: number }, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

export const CCTV: (CamInfo & { pos: [number, number, number]; look: [number, number, number] })[] = [
  { id: 'CAM 03', name: 'Press 3', pos: [-1.2, 5.2, 6.4], look: [-8, 0.7, 0.6] },
  { id: 'CAM 05', name: 'Packing 4B', pos: [15.4, 5.0, 6.2], look: [7.5, 0.6, 0] },
  { id: 'CAM 07', name: 'Conveyor', pos: [-0.8, 5.2, 19.4], look: [-14, 0.4, 13.6] },
  { id: 'CAM 09', name: 'Dock 1', pos: [31.4, 5.6, 7.2], look: [15, 0.3, 14] },
  { id: 'CAM 11', name: 'Line 2 · Molder 2', pos: [3.2, 5.0, -7.2], look: [-3, 0.9, -14] },
  { id: 'CAM 12', name: 'Tank B', pos: [31.4, 5.2, -7.2], look: [24, 1.4, -14] },
  { id: 'CAM 14', name: 'Intake', pos: [-16.6, 5.2, -7.2], look: [-25, 0.8, -14.5] },
  { id: 'CAM 16', name: 'Compressor room', pos: [16.6, 5.2, -6.2], look: [24, 0.8, 1], offline: true },
];

/* ---------------- people ---------------- */
interface Step { to: [number, number]; wait: number; act?: 'work' | 'reach' | 'idle'; face?: [number, number] }
interface WorkerSpec { id: string; helmet: boolean; gloves: boolean; vest: number; helmetColor?: number; steps: Step[]; role: string }

const WORKERS: WorkerSpec[] = [
  { id: 'W-01', role: 'Inspector', helmet: true, gloves: true, vest: C.vest, steps: [
    { to: [-28.5, -11], wait: 4, act: 'work', face: [-28.5, -15] }, { to: [-24, -11], wait: 4, act: 'work', face: [-24, -15] },
    { to: [-19.5, -11], wait: 3, act: 'work', face: [-19.5, -15] }, { to: [-22, -8.6], wait: 2, act: 'idle' }] },
  { id: 'W-02', role: 'Technician · PTW-1182', helmet: true, gloves: true, vest: C.vestOrange, helmetColor: C.helmetW, steps: [
    { to: [-3, -12.6], wait: 999, act: 'work', face: [-3, -15] }] },
  { id: 'W-03', role: 'Line operator', helmet: true, gloves: true, vest: C.vest, steps: [
    { to: [-11, -11.6], wait: 5, act: 'work', face: [-11, -15] }, { to: [5, -11.6], wait: 5, act: 'work', face: [5, -15] },
    { to: [13, -11.6], wait: 5, act: 'work', face: [13, -15] }] },
  { id: 'W-04', role: 'Press operator', helmet: true, gloves: true, vest: C.vest, steps: [
    { to: [-8, 3.5], wait: 9, act: 'work', face: [-8, -1] }, { to: [-8, 1.7], wait: 2.6, act: 'reach', face: [-8, -1] }] },
  { id: 'W-05', role: 'Press operator', helmet: true, gloves: true, vest: C.vest, steps: [
    { to: [-26, 3.3], wait: 999, act: 'work', face: [-26, -1] }] },
  { id: 'W-06', role: 'Packer', helmet: true, gloves: false, vest: C.vest, steps: [
    { to: [4, 1.5], wait: 999, act: 'work', face: [4, 0] }] },
  { id: 'W-07', role: 'Packer', helmet: true, gloves: false, vest: C.vest, steps: [
    { to: [6.2, -1.5], wait: 999, act: 'work', face: [6.2, 0] }] },
  { id: 'W-08', role: 'Packer', helmet: true, gloves: true, vest: C.vest, steps: [
    { to: [10, 1.5], wait: 999, act: 'work', face: [10, 0] }] },
  { id: 'W-09', role: 'Packer', helmet: true, gloves: true, vest: C.vest, steps: [
    { to: [12, -1.5], wait: 4, act: 'work', face: [12, 0] }, { to: [14.6, 3.6], wait: 2, act: 'work', face: [15.4, 4.4] }] },
  { id: 'W-10', role: 'Maintenance', helmet: true, gloves: true, vest: C.vestOrange, helmetColor: C.helmetW, steps: [
    { to: [20.5, 3.2], wait: 6, act: 'work', face: [20.5, 0] }, { to: [27, 3.2], wait: 6, act: 'work', face: [27, 0] }] },
  { id: 'W-11', role: 'Line operator', helmet: true, gloves: true, vest: C.vest, steps: [
    { to: [-28, 11.4], wait: 4, act: 'work', face: [-28, 13] }, { to: [-6, 11.4], wait: 4, act: 'work', face: [-6, 13] }] },
  { id: 'W-12', role: 'Floor staff', helmet: false, gloves: true, vest: C.vest, steps: [
    { to: [-21, 15.4], wait: 3, act: 'idle' }, { to: [-10, 15.4], wait: 5, act: 'work', face: [-10, 13] }, { to: [-25, 15.4], wait: 4, act: 'work', face: [-25, 13] }] },
  { id: 'W-13', role: 'Pedestrian', helmet: true, gloves: true, vest: C.vest, steps: [
    { to: [2, 8.2], wait: 2, act: 'idle' }, { to: [2, 18.6], wait: 3, act: 'idle' }, { to: [12, 13.4], wait: 1.2, act: 'idle' }, { to: [2, 8.2], wait: 1, act: 'idle' }] },
  { id: 'W-14', role: 'Dock checker', helmet: true, gloves: true, vest: C.vestOrange, steps: [
    { to: [28.6, 9.6], wait: 5, act: 'work', face: [31, 9.6] }, { to: [28.6, 18], wait: 5, act: 'work', face: [31, 18] }] },
];

interface Worker {
  spec: WorkerSpec; g: THREE.Group; legL: THREE.Object3D; legR: THREE.Object3D; armL: THREE.Object3D; armR: THREE.Object3D;
  ring: THREE.Mesh; tag: CSS2DObject; tagText: HTMLSpanElement; tagDot: HTMLSpanElement;
  step: number; wait: number; phase: number; moving: boolean; act: Step['act'];
  status: { sev: Level | null; text: string };
}

function buildWorker(spec: WorkerSpec): Omit<Worker, 'spec' | 'tag' | 'tagText' | 'tagDot' | 'ring' | 'step' | 'wait' | 'phase' | 'moving' | 'act' | 'status'> {
  const g = new THREE.Group();
  const pants = mat(C.pants), skin = mat(C.skin, 0.7), vest = mat(spec.vest, 0.55), shirt = mat(C.shirt);
  const hand = spec.gloves ? mat(C.glove, 0.6) : skin;
  const mkLimb = (x: number, y: number, len: number, w: number, m: THREE.Material, handMat?: THREE.Material) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); g.add(pivot);
    box(pivot, m, 0, -len / 2, 0, w, len, w);
    if (handMat) box(pivot, handMat, 0, -len - 0.05, 0, w * 0.95, 0.11, w * 0.95);
    return pivot;
  };
  const legL = mkLimb(-0.1, 0.9, 0.86, 0.15, pants), legR = mkLimb(0.1, 0.9, 0.86, 0.15, pants);
  box(g, shirt, 0, 1.2, 0, 0.42, 0.62, 0.24);
  box(g, vest, 0, 1.22, 0, 0.45, 0.5, 0.27);
  box(g, mat(0xd7dade, 0.3, 0.4), 0, 1.1, 0, 0.46, 0.05, 0.28);
  const armL = mkLimb(-0.29, 1.47, 0.58, 0.11, shirt, hand), armR = mkLimb(0.29, 1.47, 0.58, 0.11, shirt, hand);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skin); head.position.y = 1.66; head.castShadow = true; g.add(head);
  if (spec.helmet) {
    const hm = mat(spec.helmetColor ?? C.helmetY, 0.35);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm);
    dome.position.y = 1.7; dome.castShadow = true; g.add(dome);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20), hm); brim.position.set(0, 1.705, 0.02); g.add(brim);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), mat(0x2a211c)); hair.position.y = 1.67; g.add(hair);
  }
  return { g, legL, legR, armL, armR };
}

function buildForklift() {
  const g = new THREE.Group();
  const body = mat(0xe0a92e, 0.5, 0.1), dark = mat(C.steelDark, 0.6, 0.4), black = mat(0x1b1d1f, 0.9);
  box(g, body, 0, 0.75, -0.2, 1.15, 0.9, 1.9);
  box(g, dark, 0, 0.9, -1.15, 1.2, 1.1, 0.35); // counterweight
  box(g, black, 0, 1.25, -0.3, 0.6, 0.12, 0.6); // seat
  for (const [x, z] of [[-0.55, 0.3], [0.55, 0.3], [-0.55, -0.85], [0.55, -0.85]]) box(g, dark, x, 1.7, z, 0.07, 1.9, 0.07);
  box(g, dark, 0, 2.65, -0.27, 1.2, 0.06, 1.3); // overhead guard
  for (const [x, z] of [[-0.6, 0.45], [0.6, 0.45], [-0.6, -0.8], [0.6, -0.8]]) cyl(g, black, x, 0.3, z, 0.3, 0.26, true);
  box(g, dark, -0.4, 1.4, 0.9, 0.09, 2.6, 0.12); box(g, dark, 0.4, 1.4, 0.9, 0.09, 2.6, 0.12); // mast
  box(g, dark, 0, 0.45, 1.0, 0.9, 0.5, 0.06); // carriage
  box(g, dark, -0.28, 0.12, 1.55, 0.12, 0.05, 1.1); box(g, dark, 0.28, 0.12, 1.55, 0.12, 0.05, 1.1); // forks
  // pallet + load
  box(g, mat(0xb08a5a), 0, 0.2, 1.55, 1.0, 0.12, 1.1);
  box(g, mat(C.card, 0.9), 0, 0.62, 1.55, 0.95, 0.7, 1.0);
  // driver
  box(g, mat(C.vest, 0.55), 0, 1.6, -0.3, 0.42, 0.55, 0.26);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mat(C.skin, 0.7)); head.position.set(0, 2.0, -0.28); g.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.helmetY, 0.35)); hat.position.set(0, 2.04, -0.28); g.add(hat);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff9a2e }));
  beacon.position.set(0, 2.75, -0.6); g.add(beacon);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  return { g, beacon };
}

/* ---------------- tag element ---------------- */
function tagEl(text: string, kind: 'person' | 'zone' | 'cam') {
  const el = document.createElement('div');
  const dot = document.createElement('span');
  const label = document.createElement('span');
  label.textContent = text;
  if (kind === 'zone') {
    el.className = 'pointer-events-none select-none whitespace-nowrap rounded-[4px] bg-white/85 px-1.5 py-0.5 text-[11px] font-medium text-[#141414] shadow-sm';
    el.append(label);
  } else if (kind === 'cam') {
    el.className = 'pointer-events-none select-none whitespace-nowrap rounded-[4px] bg-[#141414] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#e4f47a]';
    el.append(label);
  } else {
    el.className = 'pointer-events-none flex select-none items-center gap-1 whitespace-nowrap rounded-[4px] bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-[#141414] shadow-sm ring-1 ring-black/5';
    dot.className = 'inline-block size-1.5 rounded-[1px]';
    el.append(dot, label);
  }
  return { el, dot, label };
}

/* ---------------- engine ---------------- */
export function createSim(
  host: HTMLElement,
  feedHost: HTMLElement,
  overlay: HTMLCanvasElement,
  cb: { onTick: (t: SimTick) => void; onEvent: (e: SimEvent) => void; onPickCam: (id: string) => void },
) {
  const disposers: (() => void)[] = [];
  const runId = Math.random().toString(36).slice(2, 8);

  /* renderers */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.domElement.className = 'block size-full';
  host.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  labels.domElement.className = 'pointer-events-none absolute inset-0';
  host.appendChild(labels.domElement);

  const feed = new THREE.WebGLRenderer({ antialias: true });
  feed.setPixelRatio(1);
  feed.shadowMap.enabled = true; feed.shadowMap.type = THREE.PCFSoftShadowMap;
  feed.toneMapping = THREE.ACESFilmicToneMapping; feed.toneMappingExposure = 0.92;
  feed.domElement.className = 'block size-full';
  feedHost.prepend(feed.domElement);

  /* scene */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.Fog(C.bg, 90, 180);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  camera.layers.enable(1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 6; controls.maxDistance = 140;
  const HOME = { pos: new THREE.Vector3(14, 46, 58), target: new THREE.Vector3(-1, 0, 1) };
  camera.position.copy(HOME.pos); controls.target.copy(HOME.target);

  scene.add(new THREE.HemisphereLight(0xf2f6fb, 0x9a917f, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
  sun.position.set(26, 60, 34); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 32, bottom: -32, near: 10, far: 140 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun);

  const world = new THREE.Group(); scene.add(world);
  const occluders: THREE.Object3D[] = [];
  const solid = (o: THREE.Object3D) => { occluders.push(o); return o; };

  /* floor, walls, columns */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat(0xcfd2cc, 1));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; scene.add(ground);
  flat(world, mat(C.floor, 0.95), 0, 0, 64, 40, 0);
  const lineM = mat(C.line, 0.7);
  for (const [, c, r, cs, rs] of ZONES) {
    const q = zoneRect(c, r, cs, rs), w = q.x1 - q.x0, d = q.z1 - q.z0, cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2;
    flat(world, lineM, cx, q.z0 + 0.06, w - 0.3, 0.1); flat(world, lineM, cx, q.z1 - 0.06, w - 0.3, 0.1);
    flat(world, lineM, q.x0 + 0.06, cz, 0.1, d - 0.3); flat(world, lineM, q.x1 - 0.06, cz, 0.1, d - 0.3);
  }
  // Press 3 danger zone and the dock walkway / vehicle area: painted on the floor
  const dz = flat(world, new THREE.MeshStandardMaterial({ map: hatch(C.danger, '#efd3cf'), roughness: 0.9 }), (PRESS_ZONE.x0 + PRESS_ZONE.x1) / 2, (PRESS_ZONE.z0 + PRESS_ZONE.z1) / 2, PRESS_ZONE.x1 - PRESS_ZONE.x0, PRESS_ZONE.z1 - PRESS_ZONE.z0, 0.016);
  (dz.material as THREE.MeshStandardMaterial).map!.repeat.set(3, 1.6);
  const walkTex = hatch(C.walk, '#dbe8e1'); walkTex.repeat.set(1.5, 7);
  flat(world, new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.9 }), (WALKWAY.x0 + WALKWAY.x1) / 2, (WALKWAY.z0 + WALKWAY.z1) / 2, WALKWAY.x1 - WALKWAY.x0, WALKWAY.z1 - WALKWAY.z0, 0.016);
  const vehM = mat(C.vehicle, 0.7);
  flat(world, vehM, 15.5, 8.6, 22, 0.14, 0.016); flat(world, vehM, 15.5, 18.4, 22, 0.14, 0.016);
  flat(world, vehM, 4.5, 13.5, 0.14, 9.8, 0.016); flat(world, vehM, 26.5, 13.5, 0.14, 9.8, 0.016);

  // overlays only the main view sees (layer 1): danger zone glow and camera cones
  const zoneGlowMat = new THREE.MeshBasicMaterial({ color: C.danger, transparent: true, opacity: 0, depthWrite: false });
  const zoneGlow = new THREE.Mesh(new THREE.BoxGeometry(PRESS_ZONE.x1 - PRESS_ZONE.x0, 2.2, PRESS_ZONE.z1 - PRESS_ZONE.z0), zoneGlowMat);
  zoneGlow.position.set((PRESS_ZONE.x0 + PRESS_ZONE.x1) / 2, 1.1, (PRESS_ZONE.z0 + PRESS_ZONE.z1) / 2);
  zoneGlow.layers.set(1); scene.add(zoneGlow);
  const zoneEdge = new THREE.LineSegments(new THREE.EdgesGeometry(zoneGlow.geometry), new THREE.LineBasicMaterial({ color: C.danger, transparent: true, opacity: 0.55 }));
  zoneEdge.position.copy(zoneGlow.position); zoneEdge.layers.set(1); scene.add(zoneEdge);

  const wallM = mat(C.wall, 0.9), trimM = mat(C.wallTrim, 0.8);
  solid(box(world, wallM, 0, 3.5, -20.15, 64.6, 7, 0.3));
  solid(box(world, wallM, -32.15, 3.5, 0, 0.3, 7, 40.6));
  box(world, trimM, 0, 0.3, 20.15, 64.6, 0.6, 0.3);
  box(world, trimM, 32.15, 0.3, 0, 0.3, 0.6, 40.6);
  box(world, trimM, 0, 0.35, -19.95, 64, 0.7, 0.1);
  // dock doors on the south side
  for (const x of [9, 17, 25]) {
    box(world, mat(C.ink, 0.8), x, 2.2, 20.15, 3.6, 4.4, 0.32);
    box(world, mat(C.guard, 0.6), x - 1.95, 2.2, 20.05, 0.3, 4.4, 0.4); box(world, mat(C.guard, 0.6), x + 1.95, 2.2, 20.05, 0.3, 4.4, 0.4);
    box(world, mat(C.guard, 0.6), x, 4.55, 20.05, 4.2, 0.3, 0.4);
  }
  const colM = mat(0x9aa1a6, 0.6, 0.3);
  for (const x of [-16, 0, 16]) for (const z of [-20 + RH, -20 + 2 * RH]) solid(box(world, colM, x, 3.5, z, 0.4, 7, 0.4));
  // light roof trusses (no roof, so the hall stays readable from above)
  for (const x of [-24, -8, 8, 24]) box(world, mat(0xb5bbbf, 0.6, 0.3), x, 7.1, 0, 0.18, 0.25, 40);

  /* zone 1: intake silos */
  const silver = mat(0xc9ccd0, 0.35, 0.6), steel = mat(C.steel, 0.55, 0.5), steelDark = mat(C.steelDark, 0.6, 0.4), guard = mat(C.guard, 0.55, 0.2);
  for (const x of [-28.5, -24, -19.5]) {
    solid(cyl(world, silver, x, 4.2, -15.5, 1.5, 4.6));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.6, 24), silver); cone.rotation.x = Math.PI; cone.position.set(x, 1.1, -15.5); cone.castShadow = true; world.add(cone);
    for (const [dx, dz2] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) box(world, steelDark, x + dx, 1.6, -15.5 + dz2, 0.12, 3.2, 0.12);
    box(world, guard, x, 7.0, -15.5, 3.3, 0.1, 3.3);
  }
  cyl(world, steel, -24, 6.0, -13.6, 0.18, 9.6, true);

  /* zone 2: four blow-molding machines; Molder 2 (x = -3) open with a lockout tag */
  const machine = mat(C.machine, 0.5, 0.15), teal = mat(C.teal, 0.5, 0.2);
  for (const [i, x] of [-11, -3, 5, 13].entries()) {
    const g = new THREE.Group(); g.position.set(x, 0, -15.2); world.add(g);
    solid(box(g, machine, 0, 1.1, 0, 5.2, 2.2, 2.6));
    solid(box(g, teal, -1.2, 2.5, 0, 2.2, 0.8, 1.6));
    const hop = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 16), silver); hop.rotation.x = Math.PI; hop.position.set(1.4, 3.1, 0); g.add(hop);
    box(g, steelDark, 0, 2.25, 1.32, 5.0, 0.12, 0.06);
    if (i === 1) {
      box(g, guard, -0.8, 1.2, 2.1, 1.4, 1.8, 0.05, 0.9); // guard door swung open
      box(g, mat(C.danger, 0.6), 1.4, 1.3, 1.33, 0.22, 0.3, 0.03); // lockout tag
    } else {
      box(g, mat(0x9fb8c2, 0.15, 0.1), 0, 1.25, 1.31, 2.4, 1.2, 0.04);
    }
    for (let k = 0; k < 6; k++) box(g, mat(0xe7eef0, 0.2), 2.0 + (k % 3) * 0.28, 0.35, 1.7 + Math.floor(k / 3) * 0.3, 0.2, 0.5, 0.2); // bottles
  }

  /* zone 3: Tank B */
  const tank = new THREE.Group(); tank.position.set(24, 0, -14); world.add(tank);
  solid(cyl(tank, mat(C.tank, 0.4, 0.3), 0, 3.2, 0, 3.2, 6.4));
  const tdome = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 10, 0, Math.PI * 2, 0, Math.PI / 5), mat(C.tank, 0.4, 0.3)); tdome.position.y = 4.1; tank.add(tdome);
  for (const [x, z, w, d] of [[0, -5, 10.4, 0.25], [0, 5, 10.4, 0.25], [-5.1, 0, 0.25, 10], [5.1, 0, 0.25, 10]]) box(tank, mat(0xb9bcb5, 0.9), x, 0.4, z, w, 0.8, d);
  box(tank, guard, 3.4, 3.4, 0, 0.12, 6.8, 0.8);
  cyl(world, steel, 28, 4.6, -9, 0.2, 8, true);

  /* zone 4: presses; Press 3 (x = -8) has the danger zone */
  const presses: { ram: THREE.Mesh; light: THREE.Mesh; x: number }[] = [];
  for (const x of [-26, -17, -8]) {
    const g = new THREE.Group(); g.position.set(x, 0, -1); world.add(g);
    solid(box(g, steelDark, 0, 0.5, 0, 3.4, 1.0, 2.6));
    solid(box(g, teal, -1.35, 2.4, 0, 0.6, 3.8, 2.2)); solid(box(g, teal, 1.35, 2.4, 0, 0.6, 3.8, 2.2));
    solid(box(g, teal, 0, 4.6, 0, 3.4, 1.1, 2.4));
    box(g, steel, 0, 1.15, 0.2, 2.1, 0.3, 1.6);
    const ram = box(g, steel, 0, 2.9, 0.2, 2.0, 0.7, 1.5);
    box(g, guard, -1.1, 1.6, 1.35, 0.06, 1.1, 0.06); box(g, guard, 1.1, 1.6, 1.35, 0.06, 1.1, 0.06); // light curtain posts
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: 0x3ccf7c }));
    light.position.set(1.4, 5.35, 0.9); g.add(light);
    presses.push({ ram, light, x });
  }
  const press3 = presses[2];

  /* zone 5: packing tables */
  const card = mat(C.card, 0.9);
  for (const x of [5, 11]) {
    solid(box(world, mat(0xa7adb2, 0.5, 0.4), x, 0.88, 0, 4, 0.08, 1.6));
    for (const [dx, dz2] of [[-1.8, -0.7], [1.8, -0.7], [-1.8, 0.7], [1.8, 0.7]]) box(world, steelDark, x + dx, 0.44, dz2, 0.08, 0.88, 0.08);
    for (let k = 0; k < 4; k++) box(world, card, x - 1.3 + k * 0.85, 1.07, (k % 2 ? 0.25 : -0.25), 0.5, 0.3, 0.42);
  }
  for (let k = 0; k < 6; k++) box(world, card, 15.0 + (k % 2) * 0.62, 0.3 + Math.floor(k / 2) * 0.55, 4.6, 0.58, 0.52, 0.5);
  box(world, mat(0xb08a5a), 15.3, 0.06, 4.6, 1.3, 0.12, 1.1);

  /* zone 6: compressor room */
  const comp = mat(0x5d7894, 0.5, 0.3);
  for (const x of [20.5, 27]) {
    solid(box(world, comp, x, 1.1, -1.2, 3.2, 2.2, 2.2));
    box(world, steelDark, x, 2.3, -1.2, 3.0, 0.15, 2.0);
    for (let k = 0; k < 5; k++) box(world, mat(0x2c3640, 0.6), x - 1.2 + k * 0.6, 1.2, -0.08, 0.38, 1.2, 0.03);
  }
  solid(cyl(world, mat(C.tank, 0.35, 0.4), 24, 1.3, 2.8, 1.0, 4, true));
  cyl(world, steel, 24, 5.8, -1.2, 0.16, 14, true);
  for (const x of [20.5, 27]) cyl(world, steel, x, 4, -1.2, 0.12, 3.6);

  /* zone 7: conveyor with a pellet spill */
  const belt = mat(0x2b2f33, 0.85), frame = mat(0x9aa1a6, 0.5, 0.4);
  solid(box(world, belt, -16, 0.95, 13, 28, 0.1, 1.1));
  box(world, frame, -16, 0.85, 12.42, 28, 0.2, 0.08); box(world, frame, -16, 0.85, 13.58, 28, 0.2, 0.08);
  for (let x = -29.5; x <= -2.5; x += 2.25) { box(world, steelDark, x, 0.42, 12.5, 0.08, 0.84, 0.08); box(world, steelDark, x, 0.42, 13.5, 0.08, 0.84, 0.08); }
  const parcels: THREE.Mesh[] = [];
  for (let k = 0; k < 11; k++) parcels.push(box(world, card, -30 + k * 2.6, 1.2, 13, 0.6, 0.4, 0.55));
  const spill = new THREE.Group(); spill.position.set(-15, 0, 14.75); world.add(spill);
  const spillMat = new THREE.MeshStandardMaterial({ color: 0xbfb7a4, roughness: 1, transparent: true, opacity: 0.85 });
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.75, 28), spillMat); blob.rotation.x = -Math.PI / 2; blob.scale.set(1.6, 1, 1); blob.position.y = 0.02; spill.add(blob);
  const pellets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), mat(C.pellet, 0.6), 220);
  const tmp = new THREE.Object3D();
  for (let i = 0; i < 220; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    tmp.position.set(Math.cos(a) * r * 1.25, 0.035, Math.sin(a) * r * 0.7); tmp.updateMatrix(); pellets.setMatrixAt(i, tmp.matrix);
  }
  spill.add(pellets);

  /* zone 8: dock racks and pallets */
  const rackM = mat(0x2f5f9e, 0.55, 0.3), beamM = mat(0xe07a2e, 0.55, 0.2);
  for (const z of [9.4, 13.4, 17.4]) {
    const g = new THREE.Group(); g.position.set(30.6, 0, z); world.add(g);
    for (const dz2 of [-1.7, 1.7]) for (const dx of [-0.5, 0.5]) solid(box(g, rackM, dx, 2.5, dz2, 0.08, 5, 0.08));
    for (const y of [0.15, 1.8, 3.4]) {
      box(g, beamM, -0.5, y, 0, 0.08, 0.12, 3.4); box(g, beamM, 0.5, y, 0, 0.08, 0.12, 3.4);
      for (const dz2 of [-0.85, 0.85]) { box(g, mat(0xb08a5a), 0, y + 0.12, dz2, 1.0, 0.12, 1.2); solid(box(g, card, 0, y + 0.55, dz2, 0.9, 0.75, 1.05)); }
    }
  }
  for (const [x, z] of [[7, 19], [8.6, 19], [21.5, 19]]) { box(world, mat(0xb08a5a), x, 0.06, z, 1.2, 0.12, 1.0); box(world, card, x, 0.48, z, 1.1, 0.72, 0.9); }

  /* forklift (vehicle loop inside the dock) */
  const fork = buildForklift(); world.add(fork.g);
  const LOOP: [number, number][] = [[6, 10], [25.5, 10], [25.5, 17], [6, 17]];
  const fk = { seg: 0, t: 0, speed: 2.6, heading: 0 };

  /* workers */
  const workers: Worker[] = WORKERS.map((spec) => {
    const parts = buildWorker(spec);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 28), new THREE.MeshBasicMaterial({ color: 0x3ccf7c, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.layers.set(1); parts.g.add(ring);
    const t = tagEl(spec.id, 'person');
    const tag = new CSS2DObject(t.el); tag.position.set(0, 2.15, 0); parts.g.add(tag);
    const [x, z] = spec.steps[0].to;
    parts.g.position.set(x, 0, z);
    world.add(parts.g);
    return { spec, ...parts, ring, tag, tagText: t.label, tagDot: t.dot, step: 0, wait: spec.steps[0].wait * Math.random(), phase: Math.random() * 6, moving: false, act: spec.steps[0].act, status: { sev: null, text: '' } };
  });

  /* zone labels */
  const zoneTags: CSS2DObject[] = [];
  for (const [name, c, r, cs, rs] of ZONES) {
    const q = zoneRect(c, r, cs, rs);
    const t = new CSS2DObject(tagEl(name, 'zone').el);
    t.position.set(q.x0 + 2.6, 0.1, q.z1 - 0.9); t.center.set(0, 0.5);
    scene.add(t); zoneTags.push(t);
  }

  /* CCTV cameras: body, cone (main view only), and a camera used to render the feed */
  const cctv = CCTV.map((c) => {
    const pos = new THREE.Vector3(...c.pos), look = new THREE.Vector3(...c.look);
    const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 60);
    cam.position.copy(pos); cam.lookAt(look); cam.updateMatrixWorld();
    // mount: a short arm from the nearest column or wall
    const body = new THREE.Group(); body.position.copy(pos); body.lookAt(look); scene.add(body);
    const housing = new THREE.Mesh(BOX, mat(C.cam, 0.5, 0.3)); housing.scale.set(0.26, 0.24, 0.5); body.add(housing);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), mat(0x0a0a0a, 0.2)); lens.rotation.x = Math.PI / 2; lens.position.z = 0.27; body.add(lens);
    const ledMat = new THREE.MeshBasicMaterial({ color: c.offline ? 0x777777 : 0xff3b30 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), ledMat); led.position.set(0.09, 0.08, 0.26); body.add(led);
    const pole = new THREE.Mesh(BOX, colM); pole.scale.set(0.16, pos.y, 0.16); pole.position.set(pos.x, pos.y / 2, pos.z); pole.castShadow = true; scene.add(pole);
    body.traverse((o) => { o.userData.cam = c.id; });

    // view cone clipped at the floor
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), halfW = halfH * cam.aspect, D = 22;
    const ends = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const dir = new THREE.Vector3(sx * halfW, sy * halfH, -1).normalize().transformDirection(cam.matrixWorld);
      let end = pos.clone().addScaledVector(dir, D);
      if (end.y < 0) end = pos.clone().addScaledVector(dir, pos.y / -dir.y);
      return end;
    });
    const verts: number[] = [];
    for (let i = 0; i < 4; i++) { const a = ends[i], b = ends[(i + 1) % 4]; verts.push(pos.x, pos.y, pos.z, a.x, a.y, a.z, b.x, b.y, b.z); }
    const coneGeo = new THREE.BufferGeometry(); coneGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const coneMat = new THREE.MeshBasicMaterial({ color: c.offline ? 0x8a8f8b : 0x141414, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const cone = new THREE.Mesh(coneGeo, coneMat); cone.layers.set(1); scene.add(cone);
    const lv: number[] = [];
    for (const e of ends) lv.push(pos.x, pos.y, pos.z, e.x, e.y, e.z);
    for (let i = 0; i < 4; i++) { const a = ends[i], b = ends[(i + 1) % 4]; lv.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lv, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: c.offline ? 0x8a8f8b : 0x141414, transparent: true, opacity: 0.35 });
    const lines = new THREE.LineSegments(lineGeo, lineMat); lines.layers.set(1); scene.add(lines);

    const tg = new CSS2DObject(tagEl(c.id + (c.offline ? ' · offline' : ''), 'cam').el); tg.position.set(pos.x, pos.y + 0.55, pos.z); scene.add(tg);
    return { ...c, cam, body, housing, cone, coneMat, lines, lineMat, led, tag: tg };
  });

  /* ---------------- options + state ---------------- */
  const opts: SimOptions = { cones: true, zones: true, labels: true, paused: false };
  let selected = 'CAM 03';
  const startClock = 18 * 3600 + 44 * 60 + 10;
  let simT = 0;
  const fmt = (s: number) => {
    const t = Math.floor(startClock + s), h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, ss = t % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };
  let pressStoppedUntil = -1, stops = 0, nearMisses = 0, eventKey = 0;
  const lastFired = new Map<string, number>();
  let forkProximity = Infinity;

  /* ---------------- vision: what each CCTV camera sees ---------------- */
  const ray = new THREE.Raycaster();
  const v3 = new THREE.Vector3(), bb = new THREE.Box3();
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  function screenBox(cam: THREE.PerspectiveCamera, b: THREE.Box3) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, front = 0;
    const { min, max } = b;
    corners[0].set(min.x, min.y, min.z); corners[1].set(max.x, min.y, min.z); corners[2].set(min.x, max.y, min.z); corners[3].set(max.x, max.y, min.z);
    corners[4].set(min.x, min.y, max.z); corners[5].set(max.x, min.y, max.z); corners[6].set(min.x, max.y, max.z); corners[7].set(max.x, max.y, max.z);
    for (const p of corners) {
      v3.copy(p).project(cam);
      if (v3.z > -1 && v3.z < 1) front++;
      x0 = Math.min(x0, v3.x); x1 = Math.max(x1, v3.x); y0 = Math.min(y0, v3.y); y1 = Math.max(y1, v3.y);
    }
    if (front < 8) return null;
    const cx0 = Math.max(-1, x0), cx1 = Math.min(1, x1), cy0 = Math.max(-1, y0), cy1 = Math.min(1, y1);
    if (cx1 - cx0 < 0.02 || cy1 - cy0 < 0.03) return null;
    const visibleFrac = ((cx1 - cx0) * (cy1 - cy0)) / ((x1 - x0) * (y1 - y0));
    if (visibleFrac < 0.35) return null;
    // to 0..1 screen space, y down
    return { l: (cx0 + 1) / 2, t: (1 - cy1) / 2, w: (cx1 - cx0) / 2, h: (cy1 - cy0) / 2 };
  }
  function visible(cam: THREE.PerspectiveCamera, target: THREE.Vector3) {
    const dist = cam.position.distanceTo(target);
    if (dist > 34) return false;
    ray.set(cam.position, v3.copy(target).sub(cam.position).normalize());
    ray.far = dist - 0.4;
    return ray.intersectObjects(occluders, false).length === 0;
  }

  interface Obs { id: string; label: string; sev: Level; conf: number; box: { l: number; t: number; w: number; h: number }; person: boolean }
  function observe(c: (typeof cctv)[number]): Obs[] {
    if (c.offline) return [];
    const out: Obs[] = [];
    for (const w of workers) {
      bb.setFromObject(w.g, true);
      // ignore the tag/ring: use body bounds only
      bb.min.y = 0; bb.max.y = Math.max(bb.max.y, 1.8); bb.max.y = Math.min(bb.max.y, 1.9);
      const head = v3.set(w.g.position.x, 1.45, w.g.position.z).clone();
      if (!visible(c.cam, head)) continue;
      const sb = screenBox(c.cam, bb); if (!sb) continue;
      const seed = (parseInt(w.spec.id.slice(2), 10) * 37) % 9;
      out.push({ id: w.spec.id, person: true, box: sb, sev: w.status.sev ?? 'Low', conf: 0.9 + seed / 100, label: `${w.spec.id} · ${w.status.sev ? w.status.text : 'PPE ok'}` });
    }
    bb.setFromObject(fork.g, true);
    const fc = bb.getCenter(new THREE.Vector3());
    if (visible(c.cam, fc)) {
      const sb = screenBox(c.cam, bb);
      if (sb) out.push({ id: 'FL-2', person: false, box: sb, sev: forkProximity < 2.5 ? 'Medium' : 'Low', conf: 0.97, label: `Forklift · ${fk.speed.toFixed(1)} m/s` });
    }
    if (c.id === 'CAM 07') {
      bb.setFromObject(spill, true); bb.max.y += 0.25;
      const sb = screenBox(c.cam, bb); if (sb) out.push({ id: 'SP-1', person: false, box: sb, sev: 'High', conf: 0.88, label: 'Spill · pellets ~1.2 m²' });
    }
    if (c.id === 'CAM 03') {
      bb.set(new THREE.Vector3(-9.7, 0, -2.3), new THREE.Vector3(-6.3, 5.2, 0.3));
      const sb = screenBox(c.cam, bb);
      const stopped = simT < pressStoppedUntil;
      if (sb) out.push({ id: 'PR-3', person: false, box: sb, sev: stopped ? 'High' : 'Low', conf: 0.99, label: stopped ? 'Press 3 · stopped' : 'Press 3 · running' });
    }
    return out;
  }
  const seenBy = (p: THREE.Vector3) => cctv.filter((c) => !c.offline && (() => { v3.copy(p).project(c.cam); return Math.abs(v3.x) <= 1 && Math.abs(v3.y) <= 1 && v3.z > -1 && v3.z < 1 && visible(c.cam, p.clone()); })()).map((c) => c.id);

  function fire(key: string, every: number, sev: Level, at: THREE.Vector3, what: string) {
    const last = lastFired.get(key);
    if (last !== undefined && simT - last < every) return false;
    lastFired.set(key, simT);
    cb.onEvent({ key: `${runId}-${++eventKey}`, time: fmt(simT), sev, where: zoneAt(at.x, at.z), what, cams: seenBy(at.clone().setY(1.2)) });
    return true;
  }

  /* ---------------- simulation step ---------------- */
  const tmpV = new THREE.Vector3();
  function stepWorkers(dt: number, t: number) {
    for (const w of workers) {
      const s = w.spec.steps[w.step];
      const tx = s.to[0], tz = s.to[1], p = w.g.position;
      const dx = tx - p.x, dz2 = tz - p.z, d = Math.hypot(dx, dz2);
      if (d > 0.05) {
        const sp = 1.25 * dt;
        p.x += (dx / d) * Math.min(sp, d); p.z += (dz2 / d) * Math.min(sp, d);
        w.g.rotation.y = lerpAngle(w.g.rotation.y, Math.atan2(dx, dz2), 1 - Math.exp(-dt * 10));
        w.moving = true; w.phase += dt * 7.5;
        const sw = Math.sin(w.phase);
        w.legL.rotation.x = sw * 0.55; w.legR.rotation.x = -sw * 0.55;
        w.armL.rotation.x = -sw * 0.45; w.armR.rotation.x = sw * 0.45;
      } else {
        if (w.moving) { w.moving = false; w.act = s.act; }
        w.wait -= dt;
        if (s.face) w.g.rotation.y = lerpAngle(w.g.rotation.y, Math.atan2(s.face[0] - p.x, s.face[1] - p.z), 1 - Math.exp(-dt * 6));
        w.legL.rotation.x *= 0.8; w.legR.rotation.x *= 0.8;
        const k = w.phase;
        if (s.act === 'work') { w.armL.rotation.x = -0.95 + Math.sin(t * 3.1 + k) * 0.22; w.armR.rotation.x = -1.05 + Math.sin(t * 3.1 + k + 1.4) * 0.22; }
        else if (s.act === 'reach') { w.armL.rotation.x = -1.35; w.armR.rotation.x = -1.5 + Math.sin(t * 2) * 0.08; }
        else { w.armL.rotation.x *= 0.85; w.armR.rotation.x *= 0.85; }
        if (w.wait <= 0) {
          w.step = (w.step + 1) % w.spec.steps.length;
          w.wait = w.spec.steps[w.step].wait;
        }
      }
    }
  }
  const lerpAngle = (a: number, b: number, k: number) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };

  function stepForklift(dt: number) {
    const a = LOOP[fk.seg], b = LOOP[(fk.seg + 1) % LOOP.length];
    const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // spatial rule: slow down when a person is ahead within 4 m, stop within 1.6 m
    const heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const pos = fork.g.position;
    let nearest = Infinity, ahead = Infinity;
    for (const w of workers) {
      const dx = w.g.position.x - pos.x, dz2 = w.g.position.z - pos.z, d = Math.hypot(dx, dz2);
      nearest = Math.min(nearest, d);
      const fwd = (dx * Math.sin(heading) + dz2 * Math.cos(heading));
      if (fwd > 0 && fwd < 5 && Math.abs(dx * Math.cos(heading) - dz2 * Math.sin(heading)) < 1.6) ahead = Math.min(ahead, d);
    }
    forkProximity = nearest;
    const target = ahead < 1.8 ? 0 : ahead < 4.2 ? 0.9 : 2.6;
    fk.speed += (target - fk.speed) * (1 - Math.exp(-dt * 4));
    fk.t += (fk.speed * dt) / segLen;
    if (fk.t >= 1) { fk.t = 0; fk.seg = (fk.seg + 1) % LOOP.length; }
    const a2 = LOOP[fk.seg], b2 = LOOP[(fk.seg + 1) % LOOP.length];
    pos.set(a2[0] + (b2[0] - a2[0]) * fk.t, 0, a2[1] + (b2[1] - a2[1]) * fk.t);
    fk.heading = lerpAngle(fk.heading, Math.atan2(b2[0] - a2[0], b2[1] - a2[1]), 1 - Math.exp(-dt * 5));
    fork.g.rotation.y = fk.heading;
  }

  function rules() {
    // Press 3: a person inside the danger zone while the press runs stops the machine
    const p3 = workers.find((w) => inRect(PRESS_ZONE, w.g.position.x, w.g.position.z));
    if (p3 && simT >= pressStoppedUntil) {
      pressStoppedUntil = simT + 6; stops++;
      fire('press3', 0, 'High', p3.g.position, `${p3.spec.id} hand in Press 3 danger zone · machine stopped in 0.6 s`);
    }
    // forklift close to a pedestrian
    for (const w of workers) {
      const d = w.g.position.distanceTo(fork.g.position);
      if (d < 2.5) { if (fire('fork-' + w.spec.id, 14, 'Medium', w.g.position, `Forklift ${d.toFixed(1)} m from ${w.spec.id} · vehicle slowed`)) nearMisses++; }
      if (zoneAt(w.g.position.x, w.g.position.z) === 'Dock 1' && !inRect(WALKWAY, w.g.position.x, w.g.position.z) && w.g.position.x < 26.6 && w.g.position.x > 4.6 && w.g.position.z > 8.6 && w.g.position.z < 18.4)
        fire('lane-' + w.spec.id, 30, 'Medium', w.g.position, `${w.spec.id} left the walkway into the forklift lane`);
    }
    // PPE
    for (const w of workers) {
      if (!w.spec.helmet) fire('helmet-' + w.spec.id, 40, 'High', w.g.position, `${w.spec.id} not wearing a hard hat`);
    }
    const bare = workers.filter((w) => !w.spec.gloves);
    if (bare.length) fire('gloves', 45, 'High', bare[0].g.position, `PPE missing: gloves, ${bare.length} workers at station 4B`);
    fire('spill', 90, 'High', spill.position, 'Pellet spill next to the conveyor, about 1.2 m²');

    // status per worker, drives the ring, the tag and detection labels
    for (const w of workers) {
      const pos = w.g.position;
      let sev: Level | null = null, text = '';
      if (inRect(PRESS_ZONE, pos.x, pos.z)) { sev = 'High'; text = 'In danger zone'; }
      else if (!w.spec.helmet) { sev = 'High'; text = 'No hard hat'; }
      else if (!w.spec.gloves) { sev = 'High'; text = 'No gloves'; }
      else if (pos.distanceTo(fork.g.position) < 3.2) { sev = 'Medium'; text = `${pos.distanceTo(fork.g.position).toFixed(1)} m to forklift`; }
      else if (zoneAt(pos.x, pos.z) === 'Dock 1' && !inRect(WALKWAY, pos.x, pos.z) && pos.x < 26.6 && pos.x > 4.6 && pos.z > 8.6 && pos.z < 18.4) { sev = 'Medium'; text = 'Outside walkway'; }
      w.status = { sev, text };
      const col = sev ? HEX[sev] : HEX.Low;
      (w.ring.material as THREE.MeshBasicMaterial).color.set(col);
      w.tagDot.style.background = col;
      w.tagText.textContent = sev ? `${w.spec.id} · ${text}` : `${w.spec.id} · ${w.spec.role}`;
    }
  }

  /* ---------------- feed overlay ---------------- */
  const ctx = overlay.getContext('2d')!;
  function drawOverlay(obs: Obs[]) {
    const W = overlay.width, H = overlay.height, dpr = W / Math.max(1, overlay.clientWidth);
    ctx.clearRect(0, 0, W, H);
    ctx.font = `600 ${11 * dpr}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    for (const o of obs) {
      const x = o.box.l * W, y = o.box.t * H, w = o.box.w * W, h = o.box.h * H, col = HEX[o.sev];
      ctx.strokeStyle = col; ctx.lineWidth = 2 * dpr; ctx.strokeRect(x, y, w, h);
      // corner ticks
      ctx.lineWidth = 3.5 * dpr; const k = Math.min(10 * dpr, w / 3, h / 3);
      ctx.beginPath();
      ctx.moveTo(x, y + k); ctx.lineTo(x, y); ctx.lineTo(x + k, y);
      ctx.moveTo(x + w - k, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - k);
      ctx.stroke();
      const text = `${o.label}  ${o.conf.toFixed(2)}`, tw = ctx.measureText(text).width + 10 * dpr, th = 17 * dpr;
      const ty = y - th - 2 * dpr < 0 ? y + 2 * dpr : y - th - 2 * dpr;
      const tx = Math.min(Math.max(0, x - 1 * dpr), W - tw);
      ctx.fillStyle = col; ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = o.sev === 'Medium' ? '#2a1d00' : o.sev === 'Low' ? '#0b2615' : '#ffffff';
      ctx.fillText(text, tx + 5 * dpr, ty + th / 2 + 0.5);
    }
  }

  /* ---------------- picking ---------------- */
  const mouse = new THREE.Vector2();
  let downAt: [number, number] | null = null;
  const onDown = (e: PointerEvent) => { downAt = [e.clientX, e.clientY]; };
  const onUp = (e: PointerEvent) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) return;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera); ray.far = Infinity; ray.layers.enableAll();
    const hit = ray.intersectObjects(cctv.map((c) => c.body), true)[0];
    ray.layers.set(0);
    const id = hit?.object.userData.cam as string | undefined;
    if (id) cb.onPickCam(id);
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  disposers.push(() => { renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onUp); });

  /* ---------------- camera tween ---------------- */
  let tween: { p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; s: number; ms: number } | null = null;
  const flyTo = (p1: THREE.Vector3, t1: THREE.Vector3, ms = 1100) => { tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1, t1, s: performance.now(), ms }; };

  /* ---------------- sizing ---------------- */
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); labels.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const fw = feedHost.clientWidth, fh = feedHost.clientHeight;
    if (fw && fh) {
      feed.setSize(Math.round(fw), Math.round(fh), false);
      const dpr = Math.min(devicePixelRatio, 2);
      overlay.width = Math.round(fw * dpr); overlay.height = Math.round(fh * dpr);
    }
  }
  const ro = new ResizeObserver(resize); ro.observe(host); ro.observe(feedHost); resize();
  disposers.push(() => ro.disconnect());

  /* ---------------- loop ---------------- */
  const clock = new THREE.Clock();
  let feedAcc = 0, tickAcc = 0, ruleAcc = 0;
  let lastObs: Obs[] = [];
  renderer.setAnimationLoop(() => {
    const rdt = Math.min(clock.getDelta(), 0.05);
    const dt = opts.paused ? 0 : rdt;
    simT += dt;
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.s) / tween.ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (k >= 1) tween = null;
    }
    controls.update();

    if (dt > 0) {
      stepWorkers(dt, simT);
      stepForklift(dt);
      const stopped = simT < pressStoppedUntil;
      presses.forEach((p, i) => {
        const halted = p === press3 && stopped;
        if (!halted) p.ram.position.y = 2.6 + (Math.sin(simT * 1.6 + i * 1.3) * 0.5 + 0.5) * 0.9;
        (p.light.material as THREE.MeshBasicMaterial).color.set(halted ? (Math.sin(simT * 14) > 0 ? 0xff3b30 : 0x5a1410) : 0x3ccf7c);
      });
      for (const pc of parcels) { pc.position.x += dt * 0.9; if (pc.position.x > -2.4) pc.position.x -= 28.6; }
      fork.beacon.visible = Math.sin(simT * 9) > 0;
      ruleAcc += dt;
      if (ruleAcc > 0.1) { ruleAcc = 0; rules(); }
    }
    zoneGlowMat.opacity = opts.zones ? (simT < pressStoppedUntil ? 0.16 + Math.sin(simT * 10) * 0.08 : 0.06) : 0;
    zoneEdge.visible = opts.zones;
    for (const c of cctv) {
      const on = c.id === selected;
      c.cone.visible = c.lines.visible = opts.cones || on;
      c.coneMat.opacity = on ? 0.14 : 0.04;
      c.coneMat.color.set(on ? 0xc8e04a : c.offline ? 0x8a8f8b : 0x141414);
      c.lineMat.opacity = on ? 0.9 : 0.28;
      c.lineMat.color.set(on ? 0x8aa400 : c.offline ? 0x8a8f8b : 0x141414);
      (c.led.material as THREE.MeshBasicMaterial).color.set(c.offline ? 0x666666 : Math.sin(simT * 4) > 0 ? 0xff3b30 : 0x551512);
    }

    renderer.render(scene, camera);
    if (opts.labels) labels.render(scene, camera);

    // camera feed at ~15 fps
    feedAcc += rdt;
    const sel = cctv.find((c) => c.id === selected)!;
    if (feedAcc > 1 / 15) {
      feedAcc = 0;
      if (!sel.offline) {
        sel.body.visible = false; // a camera never sees its own housing
        feed.render(scene, sel.cam);
        sel.body.visible = true;
        lastObs = observe(sel);
        drawOverlay(lastObs);
      } else {
        feed.setClearColor(0x262b29); feed.clear(); ctx.clearRect(0, 0, overlay.width, overlay.height); lastObs = [];
      }
    }

    // summary for the page at 4 Hz
    tickAcc += rdt;
    if (tickAcc > 0.25) {
      tickAcc = 0;
      const camCounts: SimTick['camCounts'] = {};
      for (const c of cctv) {
        const o = c.id === selected ? lastObs : observe(c);
        camCounts[c.id] = { people: o.filter((x) => x.person).length, alerts: o.filter((x) => x.sev !== 'Low').length };
      }
      cb.onTick({
        time: fmt(simT), people: workers.length + 1, helmets: workers.filter((w) => w.spec.helmet).length + 1,
        gloveIssues: workers.filter((w) => !w.spec.gloves).length, pressStopped: simT < pressStoppedUntil, forkliftSpeed: fk.speed,
        nearMisses, stops, camCounts,
        detections: lastObs.map(({ id, label, sev, conf }) => ({ id, label, sev, conf })),
      });
    }
  });

  return {
    select(id: string) {
      selected = id;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      feedAcc = 1;
    },
    set<K extends keyof SimOptions>(k: K, v: SimOptions[K]) {
      opts[k] = v;
      if (k === 'labels') labels.domElement.style.display = v ? '' : 'none';
    },
    home() { flyTo(HOME.pos.clone(), HOME.target.clone()); },
    /** Fly the main view to stand just behind the selected camera. */
    lookThrough(id: string) {
      const c = cctv.find((x) => x.id === id); if (!c) return;
      const dir = new THREE.Vector3(...c.look).sub(c.cam.position).normalize();
      flyTo(c.cam.position.clone().addScaledVector(dir, -3).setY(c.cam.position.y + 1.6), new THREE.Vector3(...c.look));
    },
    dispose() {
      renderer.setAnimationLoop(null);
      disposers.forEach((d) => d());
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry && m.geometry !== BOX && m.geometry !== CYL) m.geometry.dispose();
      });
      renderer.dispose(); feed.dispose();
      renderer.forceContextLoss(); feed.forceContextLoss();
      renderer.domElement.remove(); feed.domElement.remove(); labels.domElement.remove();
      void tmpV;
    },
  };
}
export type Sim = ReturnType<typeof createSim>;
