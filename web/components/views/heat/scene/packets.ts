/* Data packets: bright beads that fly along arcs between scene nodes, from a fixed pool. They bloom. */
import * as THREE from 'three';
import { GEO, glowColor, type TokenName } from './kit';

interface Packet { m: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; t: number; wait: number; speed: number; onArrive?: () => void; active: boolean }

const POOL = 60;
const SIZE = 0.09;
/** Height an arc rises above its higher end; light trails use the same so packets ride on them. */
export const ARC_LIFT = 1.2;

export class Packets {
  private pool: Packet[] = [];
  private mats = new Map<TokenName, THREE.MeshBasicMaterial>();

  constructor(parent: THREE.Object3D) {
    for (let i = 0; i < POOL; i++) {
      const m = new THREE.Mesh(GEO.ball, this.mat('teal'));
      m.scale.setScalar(SIZE);
      m.visible = false;
      parent.add(m);
      this.pool.push({ m, curve: new THREE.QuadraticBezierCurve3(), t: 0, wait: 0, speed: 1, active: false });
    }
  }

  private mat(c: TokenName): THREE.MeshBasicMaterial {
    let m = this.mats.get(c);
    if (!m) { m = new THREE.MeshBasicMaterial({ color: glowColor(c), toneMapped: false }); this.mats.set(c, m); }
    return m;
  }

  /** Same arc as the light trails, so packets ride along them. */
  send(from: THREE.Vector3, to: THREE.Vector3, color: TokenName, opts: { seconds?: number; delay?: number; onArrive?: () => void } = {}): void {
    const p = this.pool.find((x) => !x.active);
    if (!p) return; // Pool is full: dropping a decorative packet is fine, the data itself is applied elsewhere.
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.max(from.y, to.y) + ARC_LIFT;
    p.curve.v0.copy(from); p.curve.v1.copy(mid); p.curve.v2.copy(to);
    p.m.material = this.mat(color);
    p.t = 0; p.wait = opts.delay ?? 0; p.speed = 1 / (opts.seconds ?? 1.1);
    p.onArrive = opts.onArrive; p.active = true; p.m.visible = false;
  }

  step(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      if (p.wait > 0) { p.wait -= dt; continue; }
      p.t = Math.min(1, p.t + dt * p.speed);
      p.m.visible = true;
      p.curve.getPoint(p.t, p.m.position);
      if (p.t >= 1) {
        p.active = false; p.m.visible = false;
        p.onArrive?.();
      }
    }
  }

  dispose(): void {
    this.mats.forEach((m) => m.dispose());
  }
}

