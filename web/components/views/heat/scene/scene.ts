/* HeatShield 3D: the pilot site with real equipment, a thermal heat field on the floor, WBGT meters,
   and the engine core that every reading flows through. Browser only; loaded with dynamic import. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Tone } from '@/lib/data';
import { buildApron } from './apron';
import { disposeTree, loadEnvironment, loadModels, type Models } from './assets';
import { Engine } from './engine';
import { HeatField, type HeatSpot } from './heatfield';
import { disposeGeometries, glowColor, label, token, TONE_TOKEN, type Label } from './kit';
import { buildMeter, METER_TOP, type Meter } from './meter';
import { buildNodes } from './nodes';
import { Packets } from './packets';
import { createPost } from './post';
import { buildSite, CELL, cellCentre, FLOOR } from './site';
import { buildSky, SUN_AT } from './sky';
import { createView } from './view';

export interface SceneArea { zone: string; score: number; tone: Tone; heat: number }
export interface SceneSensor { id: string; area: string; value?: number; tone: Tone; heat: number }
export interface SceneState { areas: SceneArea[]; sensors: SceneSensor[]; tick: string; forecast: string; forecastHeat: number; jobs: number; alarm: boolean }
export interface HeatScene { update: (s: SceneState) => void; zoomIn: () => void; zoomOut: () => void; reset: () => void; dispose: () => void }
export interface SceneEvents { onReady: () => void; onWheelHint: () => void }
export interface SceneLayout { zones: string[]; sensors: { id: string; area: string }[] }

const CORE = new THREE.Vector3(0, 4.7, 0);
const TARGET = new THREE.Vector3(0, 1.6, 0);
/** Eye-level-ish view (about 13° down) so the horizon, sky and low sun sit at the top, like a photo taken on site. */
const VIEW_DIR = new THREE.Vector3(0.45, 0.25, 1).normalize();
const FOV = 38;
/** Half-extents the camera must always show, in metres. */
const FIT = { halfW: 13.6, halfH: 5.4 };
const SENSOR_OFFSETS: [number, number][] = [[-0.6, 0.6], [1.4, 0.6], [1.2, 0.9]];
/** Meters drawn 1.5x life size so they read at site scale. */
const METER_SCALE = 1.5;
const SPOT_RADIUS = { area: 2.3, sensor: 1.1 };
/** Performance budget: capped pixel ratio (raised when zoomed in, for crisp close-ups), 30 fps, one static shadow map. */
const PERF = { maxDpr: 1.5, zoomDpr: 2, fps: 30, shadowMap: 1024 } as const;
/** The forecast comes from the sun, so its trail starts at the sun disc. */
const FORECAST_AT = SUN_AT;

export function createHeatScene(host: HTMLElement, layout: SceneLayout, events: SceneEvents): HeatScene {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PERF.maxDpr));
  renderer.shadowMap.enabled = true;
  // Nothing that casts a shadow moves, so the shadow map is drawn once, then only when the scene changes.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  host.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  labels.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  host.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 400);
  const sky = buildSky(scene, renderer, PERF.shadowMap);
  const apron = buildApron(scene, renderer);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9ccc6, 0.5));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  Object.assign(controls, { enableDamping: true, minPolarAngle: 0.95, maxPolarAngle: 1.38, minAzimuthAngle: -1.0, maxAzimuthAngle: 1.0 });
  const post = createPost(renderer, scene, camera);

  // Static parts that need no downloads come first, so the card is never empty.
  const field = new HeatField(FLOOR.w, FLOOR.d);
  scene.add(field.mesh);
  const engine = new Engine(CORE);
  scene.add(engine.group);
  const nodes = buildNodes(scene, FORECAST_AT);
  const packets = new Packets(scene);
  const owned: { dispose: () => void }[] = [field, engine, nodes, packets, sky, apron];
  renderer.shadowMap.needsUpdate = true;

  const perArea = new Map<string, number>();
  const meters: (Meter & { top: THREE.Vector3 })[] = layout.sensors.map((s) => {
    const k = perArea.get(s.area) ?? 0;
    perArea.set(s.area, k + 1);
    const c = cellCentre(Math.max(0, layout.zones.indexOf(s.area)));
    const [ox, oz] = SENSOR_OFFSETS[k % SENSOR_OFFSETS.length];
    const m = buildMeter(c.x + ox, c.y + oz);
    m.group.position.y = 0.08;
    m.group.scale.setScalar(METER_SCALE);
    scene.add(m.group);
    owned.push(m);
    return { ...m, top: new THREE.Vector3(c.x + ox, METER_TOP * METER_SCALE + 0.08, c.y + oz) };
  });
  meters.forEach((m) => engine.trail(m.top, CORE, 'teal', scene));
  engine.trail(nodes.forecast.at, CORE, 'watch', scene);
  engine.trail(nodes.registers.at, CORE, 'ink', scene);
  nodes.outputs.forEach((o) => engine.trail(CORE, o.at, 'teal', scene));

  // Area name and score, painted at the front edge of each area like floor signage.
  const areaLabels: Label[] = layout.zones.map((z, i) => {
    const c = cellCentre(i);
    const l = label('–', z);
    // Front-left corner of the area, where nothing tall stands in front of it.
    l.obj.position.set(c.x - CELL.w / 2 + 1.2, 0.1, c.y + CELL.d / 2 - 0.3);
    scene.add(l.obj);
    return l;
  });

  // Equipment lives in its own group so the HD models can replace the standard ones in place.
  let site = new THREE.Group();
  let siteOwned: { dispose: () => void }[] = [];
  scene.add(site);
  function mountSite(models: Models): void {
    const next = new THREE.Group();
    const nextOwned = buildSite(next, models, layout.zones);
    scene.remove(site);
    disposeTree(site);
    siteOwned.forEach((o) => o.dispose());
    site = next;
    siteOwned = nextOwned;
    scene.add(site);
    renderer.shadowMap.needsUpdate = true;
    render();
  }

  let disposed = false;
  Promise.all([loadModels('base'), loadEnvironment(renderer), sky.ready, apron.ready])
    .then(([models, env]) => {
      if (disposed) { env.dispose(); return; }
      scene.environment = env;
      owned.push(env);
      mountSite(models);
      events.onReady();
    })
    .catch((err: unknown) => {
      console.error('[heat scene] assets failed, showing the site without equipment:', err);
      events.onReady();
    });

  let hdRequested = false;
  const view = createView(camera, controls, renderer.domElement, {
    home: { target: TARGET, dir: VIEW_DIR },
    pickables: () => [site, engine.group, ...meters.map((m) => m.group)],
    onWheelHint: events.onWheelHint,
    instant: still,
    onZoomedChange: (zoomed) => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, zoomed ? PERF.zoomDpr : PERF.maxDpr));
      resize();
      if (!zoomed || hdRequested) return;
      hdRequested = true;
      loadModels('hd')
        .then((hd) => { if (!disposed && hd.size) mountSite(hd); })
        .catch((err: unknown) => console.error('[heat scene] HD models failed, keeping standard detail:', err));
    },
  });

  function resize(): void {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const fit = Math.max(FIT.halfW / Math.tan(hHalf), FIT.halfH / Math.tan(vHalf));
    view.setFitDistance(fit);
    sky.fit(fit);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    post.setSize(w, h);
    labels.setSize(w, h);
    render();
  }
  function render(): void {
    controls.update();
    post.render();
    labels.render(scene, camera);
  }

  let last: SceneState | null = null;
  function applyScores(s: SceneState): void {
    const spots: HeatSpot[] = [
      ...s.areas.map((a, i) => { const c = cellCentre(i); return { x: c.x, z: c.y, heat: a.heat, radius: SPOT_RADIUS.area }; }),
      ...s.sensors.map((sn, i) => ({ x: meters[i]?.top.x ?? 0, z: meters[i]?.top.z ?? 0, heat: sn.heat, radius: SPOT_RADIUS.sensor })),
    ];
    field.setSpots(spots);
    s.areas.forEach((a, i) => areaLabels[i]?.set(String(a.score), a.zone, a.tone));
  }

  function update(s: SceneState): void {
    const fresh = last !== null && s.tick !== last.tick;
    s.sensors.forEach((sn, i) => meters[i]?.setTone(sn.tone));
    nodes.forecast.label.set('Forecast', s.forecast);
    sky.setHeat(s.forecastHeat);
    for (const o of nodes.outputs) {
      if (o.key === 'briefing') o.label.set('Briefing', `${s.jobs} change${s.jobs === 1 ? '' : 's'}`);
      if (o.key === 'alarm') {
        o.label.set('Alarm', s.alarm ? 'on' : 'clear', s.alarm ? 'act' : undefined);
        o.orb.color.copy(glowColor(s.alarm ? 'act' : 'teal'));
      }
    }
    if (fresh && !still) {
      // Each meter sends its reading to the engine; when the first lands the field re-scores and the outputs light up.
      meters.forEach((m, i) => packets.send(m.top, CORE, TONE_TOKEN[s.sensors[i]?.tone ?? 'low'], {
        onArrive: i === 0 ? () => {
          engine.flare();
          applyScores(s);
          nodes.outputs.forEach((o, k) => packets.send(CORE, o.at, o.key === 'alarm' && s.alarm ? 'act' : 'teal', { delay: k * 0.1 }));
        } : undefined,
      }));
    } else applyScores(s);
    last = s;
    if (still) render();
  }

  let visible = true, raf = 0, ambient = 0, flip = false, since = 0;
  const clock = new THREE.Clock();
  const frameTime = 1 / PERF.fps;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(host);
  function frame(): void {
    raf = requestAnimationFrame(frame);
    since += clock.getDelta();
    if (!visible || since < frameTime) return;
    const dt = Math.min(since, 0.1);
    since = 0;
    const t = clock.elapsedTime;
    view.tick(dt);
    engine.tick(dt);
    field.tick(t);
    meters.forEach((m, i) => {
      const p = (t * 0.6 + i * 0.33) % 1;
      m.ring.scale.setScalar(0.25 + p * 0.9);
      (m.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - p);
    });
    ambient += dt;
    if (ambient > 2.4) {
      ambient = 0;
      flip = !flip;
      packets.send(flip ? nodes.forecast.at : nodes.registers.at, CORE, flip ? 'watch' : 'teal', { seconds: 1.5 });
    }
    packets.step(dt);
    render();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  if (still) controls.addEventListener('change', render);
  else frame();

  return {
    update,
    zoomIn: () => { view.zoomIn(); if (still) render(); },
    zoomOut: () => { view.zoomOut(); if (still) render(); },
    reset: () => { view.reset(); if (still) render(); },
    dispose(): void {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect(); view.dispose(); controls.dispose();
      disposeTree(site);
      siteOwned.forEach((o) => o.dispose());
      owned.forEach((o) => o.dispose());
      disposeGeometries(); post.dispose(); renderer.dispose();
      renderer.domElement.remove(); labels.domElement.remove();
    },
  };
}
