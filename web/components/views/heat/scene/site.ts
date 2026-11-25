/* The site floor: a concrete slab split into the six heat areas, each furnished with real equipment models,
   painted safety lines between areas, and two storage tanks in the tank farm. */
import * as THREE from 'three';
import { place, type ModelName, type Models, type Placement } from './assets';
import { token } from './kit';

/** Area cell size in metres, laid out 3 across and 2 deep. */
export const CELL = { w: 5, d: 4.4 } as const;
const COLS = 3;
export const FLOOR = { w: CELL.w * COLS + 0.6, d: CELL.d * 2 + 0.6 } as const;
const SLAB_H = 0.16;
const LINE_W = 0.07;

export const cellCentre = (i: number): THREE.Vector2 => new THREE.Vector2(((i % COLS) - 1) * CELL.w, (Math.floor(i / COLS) - 0.5) * CELL.d);

/** Equipment per area, offsets from the cell centre. Picked to read as that area at a glance. */
const FURNISH: Record<string, [ModelName, Omit<Placement, 'at'> & { at: [number, number] }][]> = {
  'Line 2 · Molders': [
    ['portable_generator', { at: [-1.3, -0.9], size: 1.0 }], ['portable_generator', { at: [0.2, -0.9], size: 1.0, rotY: 0.2 }],
    ['portable_generator', { at: [1.6, -0.9], size: 1.0, rotY: -0.15 }],
  ],
  'Zone 4 · Packing': [
    ['steel_frame_shelves_01', { at: [-0.9, -1.5], size: 1.9 }],
    ['plastic_crate_03', { at: [1.3, 0.2], size: 0.32 }], ['plastic_crate_03', { at: [1.3, 0.2], size: 0.32, y: 0.32 }], ['plastic_crate_03', { at: [1.8, 0.4], size: 0.32, rotY: 0.4 }],
    ['hand_truck', { at: [0.4, 0.8], size: 1.3, rotY: -0.6 }],
  ],
  'Press 3': [['old_drill_press', { at: [0, -0.6], size: 1.9 }], ['Barrel_01', { at: [1.6, -1.2], size: 0.9 }]],
  Compressor: [
    ['exterior_aircon_unit', { at: [-1.0, -0.8], size: 1.8, fit: 'width' }], ['exterior_aircon_unit', { at: [1.1, -0.8], size: 1.8, fit: 'width' }],
  ],
  'Tank B': [
    ['propane_tank', { at: [1.6, 0.9], size: 1.0 }], ['propane_tank', { at: [2.0, 0.6], size: 1.0, rotY: 0.8 }], ['propane_tank', { at: [1.7, 0.3], size: 1.0, rotY: 2 }],
    ['Barrel_01', { at: [-1.9, 1.1], size: 0.9 }],
  ],
  'Dock 1': [
    ['concrete_road_barrier', { at: [-1.0, 1.4], size: 1.6, fit: 'width' }], ['concrete_road_barrier', { at: [0.9, 1.4], size: 1.6, fit: 'width' }],
    ['plastic_crate_03', { at: [-0.5, -0.8], size: 0.32 }], ['hand_truck', { at: [0.9, -0.6], size: 1.3, rotY: 0.5 }],
  ],
};

/** Two vertical storage tanks with domed roofs and stiffening bands, the way a tank farm looks. */
const TANKS: [number, number, number, number][] = [[-0.5, 0.4, 0.95, 2.4], [1.3, 0.1, 0.7, 1.8]];
function buildTanks(root: THREE.Object3D, c: THREE.Vector2): { dispose: () => void }[] {
  const shell = new THREE.MeshStandardMaterial({ color: token('paper'), roughness: 0.32, metalness: 0.55 });
  const band = new THREE.MeshStandardMaterial({ color: token('line-2'), roughness: 0.5, metalness: 0.6 });
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 48);
  const dome = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [ox, oz, r, h] of TANKS) {
    const g = new THREE.Group();
    g.position.set(c.x + ox, 0.08, c.y + oz);
    const body = new THREE.Mesh(cyl, shell);
    body.scale.set(r, h, r);
    body.position.y = h / 2;
    const roof = new THREE.Mesh(dome, shell);
    roof.scale.set(r, r * 0.28, r);
    roof.position.y = h;
    g.add(body, roof);
    for (let k = 1; k < 4; k++) {
      const b = new THREE.Mesh(cyl, band);
      b.scale.set(r * 1.01, 0.05, r * 1.01);
      b.position.y = (h * k) / 4;
      g.add(b);
    }
    g.traverse((o) => { o.castShadow = o.receiveShadow = true; });
    root.add(g);
  }
  return [shell, band, cyl, dome];
}

export function buildSite(root: THREE.Object3D, models: Models, zones: string[]): { dispose: () => void }[] {
  const concrete = new THREE.MeshStandardMaterial({ color: token('line-2'), roughness: 0.92 });
  const paint = new THREE.MeshStandardMaterial({ color: token('watch'), roughness: 0.6 });

  const slab = new THREE.Mesh(new THREE.BoxGeometry(FLOOR.w, SLAB_H, FLOOR.d), concrete);
  slab.position.y = SLAB_H / 2 - 0.08;
  slab.receiveShadow = true;
  root.add(slab);

  // Painted safety lines: the hall outline and the boundaries between areas.
  const line = (x: number, z: number, w: number, d: number): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), paint);
    m.position.set(x, 0.085, z);
    m.receiveShadow = true;
    root.add(m);
  };
  const W = CELL.w * COLS, D = CELL.d * 2;
  line(0, -D / 2, W, LINE_W); line(0, D / 2, W, LINE_W); line(0, 0, W, LINE_W);
  for (let c = 0; c <= COLS; c++) line(-W / 2 + c * CELL.w, 0, LINE_W, D);

  zones.forEach((zone, i) => {
    const c = cellCentre(i);
    for (const [name, p] of FURNISH[zone] ?? []) {
      const o = place(models, name, { ...p, at: [c.x + p.at[0], c.y + p.at[1]], y: (p.y ?? 0) + 0.08 });
      if (o) root.add(o);
    }
  });

  const tankMats = buildTanks(root, cellCentre(zones.indexOf('Tank B')));
  return [concrete, paint, ...tankMats];
}
