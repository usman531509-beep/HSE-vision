/* Camera handling: Ctrl/pinch zoom toward the cursor, double-click to fly to a piece of equipment,
   zoom buttons and reset. A plain mouse wheel is left to the page so the scene never traps scrolling. */
import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MIN_DISTANCE = 3.5;
/** Distance a double-clicked object is framed at, in metres. */
const FOCUS_DISTANCE = 6;
const FLY_SECONDS = 0.8;
/** Below this share of the full-site distance the view counts as zoomed in (sharper rendering, HD models). */
const ZOOMED_AT = 0.6;
const STEP = 0.7;
/** The target may wander this far from the site centre when panning. */
const PAN_LIMIT = { x: 9, z: 6, yMin: 0.3, yMax: 5 } as const;

export interface ViewOptions {
  home: { target: THREE.Vector3; dir: THREE.Vector3 };
  pickables: () => THREE.Object3D[];
  onWheelHint: () => void;
  onZoomedChange: (zoomed: boolean) => void;
  instant: boolean;
}
export interface View {
  setFitDistance: (d: number) => void;
  zoomBy: (factor: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  /** Advances a fly animation; true while it is moving. */
  tick: (dt: number) => boolean;
  dispose: () => void;
}

const ease = (t: number): number => 1 - Math.pow(1 - t, 3);

export function createView(camera: THREE.PerspectiveCamera, controls: OrbitControls, dom: HTMLElement, o: ViewOptions): View {
  let fit = 0, zoomed = false;
  let fly: { t: number; fromP: THREE.Vector3; toP: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null = null;
  Object.assign(controls, { enableZoom: true, zoomToCursor: true, enablePan: true, screenSpacePanning: true, minDistance: MIN_DISTANCE });

  function flyTo(target: THREE.Vector3, dist: number): void {
    const dir = camera.position.clone().sub(controls.target).normalize();
    const toP = target.clone().addScaledVector(dir, THREE.MathUtils.clamp(dist, MIN_DISTANCE, fit || dist));
    if (o.instant) { controls.target.copy(target); camera.position.copy(toP); controls.update(); return; }
    fly = { t: 0, fromP: camera.position.clone(), toP, fromT: controls.target.clone(), toT: target.clone() };
  }
  const distance = (): number => camera.position.distanceTo(controls.target);

  // Mouse wheel scrolls the page unless Ctrl/Cmd is held. Trackpad pinch arrives as Ctrl+wheel, so it just works.
  const onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || e.metaKey) return;
    e.stopImmediatePropagation();
    o.onWheelHint();
  };
  dom.addEventListener('wheel', onWheel, { capture: true });

  const ray = new THREE.Raycaster();
  const onDouble = (e: MouseEvent): void => {
    const r = dom.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(o.pickables(), true)[0];
    if (hit) flyTo(hit.point, FOCUS_DISTANCE);
  };
  dom.addEventListener('dblclick', onDouble);

  function watchZoom(): void {
    const z = fit > 0 && distance() < fit * ZOOMED_AT;
    if (z !== zoomed) { zoomed = z; o.onZoomedChange(z); }
  }
  controls.addEventListener('change', watchZoom);

  return {
    setFitDistance(d) {
      const first = fit === 0;
      fit = d;
      controls.maxDistance = d;
      if (first) camera.position.copy(o.home.target).addScaledVector(o.home.dir, d);
      else if (distance() > d) camera.position.copy(controls.target).addScaledVector(camera.position.clone().sub(controls.target).normalize(), d);
    },
    zoomBy: (f) => flyTo(controls.target, distance() * f),
    zoomIn() { this.zoomBy(STEP); },
    zoomOut() { this.zoomBy(1 / STEP); },
    reset() {
      if (o.instant) { controls.target.copy(o.home.target); camera.position.copy(o.home.target).addScaledVector(o.home.dir, fit); controls.update(); return; }
      fly = { t: 0, fromP: camera.position.clone(), toP: o.home.target.clone().addScaledVector(o.home.dir, fit), fromT: controls.target.clone(), toT: o.home.target.clone() };
    },
    tick(dt) {
      // Keep panning near the site so the view can't drift into empty desert.
      const t = controls.target;
      t.set(THREE.MathUtils.clamp(t.x, -PAN_LIMIT.x, PAN_LIMIT.x), THREE.MathUtils.clamp(t.y, PAN_LIMIT.yMin, PAN_LIMIT.yMax), THREE.MathUtils.clamp(t.z, -PAN_LIMIT.z, PAN_LIMIT.z));
      if (!fly) return false;
      fly.t = Math.min(1, fly.t + dt / FLY_SECONDS);
      const k = ease(fly.t);
      camera.position.lerpVectors(fly.fromP, fly.toP, k);
      controls.target.lerpVectors(fly.fromT, fly.toT, k);
      if (fly.t >= 1) fly = null;
      watchZoom();
      return true;
    },
    dispose() {
      dom.removeEventListener('wheel', onWheel, { capture: true });
      dom.removeEventListener('dblclick', onDouble);
      controls.removeEventListener('change', watchZoom);
    },
  };
}
