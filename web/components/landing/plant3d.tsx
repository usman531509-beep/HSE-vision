'use client';

/* Landing-page 3D model of Plant A, drawn with three.js from the real floor plan (lib/data.ts `plan`)
   and zone scores (`zones`). Zone height = risk score, colour = severity, capsules = people on the floor.
   Drag to orbit, hover or click a zone to select it. Pauses when off-screen; no auto-rotate under reduced motion. */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { plan, zones, type Zone } from '@/lib/data';

const COL = 6.4; // metres per plan column
const ROW = 6.4;
const SEV_HEX = { act: 0xd9474f, watch: 0xe0a030, low: 0x3f9a68 } as const;
const lvl = (s: number) => (s >= 70 ? 'act' : s >= 40 ? 'watch' : 'low');
export const lvlWord = (s: number) => (s >= 70 ? 'Act' : s >= 40 ? 'Watch' : 'Low');

type ZoneMesh = { zone: Zone; mesh: THREE.Mesh; base: THREE.Mesh; ring?: THREE.Mesh; h: number; people: number };

export function Plant3D() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ select: (name: string | null) => void; setFlat: (f: boolean) => void; setPeople: (p: boolean) => void } | null>(null);
  const [sel, setSel] = useState<string>('Press 3');
  const [hover, setHover] = useState<string | null>(null);
  const [flat, setFlat] = useState(false);
  const [people, setPeople] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);
    camera.position.set(30, 34, 38);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false; // never hijack page scroll
    controls.enablePan = false;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.2;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.6;
    controls.target.set(0, 2, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd4cf, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(18, 40, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
    scene.add(sun);

    // Floor slab
    const W = COL * 4 + 2, D = ROW * 3 + 2;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.6, D), new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.9 }));
    slab.position.y = -0.3;
    slab.receiveShadow = true;
    scene.add(slab);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.08 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    ground.receiveShadow = true;
    scene.add(ground);

    const box = new THREE.BoxGeometry(1, 1, 1);
    const items: ZoneMesh[] = [];
    const workers: { m: THREE.Mesh; zx: number; zz: number; w: number; d: number; t: number; sp: number }[] = [];
    const capsule = new THREE.CapsuleGeometry(0.32, 0.9, 4, 10);
    const workerMat = new THREE.MeshStandardMaterial({ color: 0x1d2124, roughness: 0.6 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 });
    const helmetGeo = new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);

    for (const [name, col, row, cs, rs, , ppl] of plan) {
      const zone = zones.find((z) => z.name === name);
      if (!zone) continue;
      const w = cs * COL - 0.8, d = rs * ROW - 0.8;
      const x = -W / 2 + 1 + (col - 1) * COL + (cs * COL) / 2;
      const z = -D / 2 + 1 + (row - 1) * ROW + (rs * ROW) / 2;
      const h = 0.6 + (zone.score / 100) * 9;
      const color = SEV_HEX[lvl(zone.score)];
      const base = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0xe6e8e4, roughness: 0.95 }));
      base.scale.set(w, 0.12, d);
      base.position.set(x, 0.06, z);
      base.receiveShadow = true;
      scene.add(base);
      const mesh = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color, roughness: 0.55, transparent: true, opacity: 0.92 }));
      const pw = Math.min(w, d) * 0.55;
      mesh.scale.set(pw, h, pw);
      mesh.position.set(x, h / 2 + 0.12, z);
      mesh.castShadow = true;
      mesh.userData.name = name;
      scene.add(mesh);
      let ring: THREE.Mesh | undefined;
      if (lvl(zone.score) === 'act') {
        ring = new THREE.Mesh(new THREE.RingGeometry(pw * 0.75, pw * 0.82, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.14, z);
        scene.add(ring);
      }
      items.push({ zone, mesh, base, ring, h, people: ppl });
      for (let i = 0; i < ppl; i++) {
        const m = new THREE.Mesh(capsule, workerMat);
        const hat = new THREE.Mesh(helmetGeo, helmetMat);
        hat.position.y = 0.78;
        m.add(hat);
        m.castShadow = true;
        scene.add(m);
        const wk = { m, zx: x, zz: z, w: w * 0.42, d: d * 0.42, t: Math.random() * 100, sp: 0.15 + Math.random() * 0.25 };
        m.position.set(x + Math.sin(wk.t * 1.3 + z) * wk.w, 0.62, z + Math.cos(wk.t * 0.9 + x) * wk.d);
        workers.push(wk);
      }
    }

    // State applied from React
    let selected: string | null = 'Press 3';
    let hovered: string | null = null;
    let flatMode = false;
    const paint = () => {
      for (const it of items) {
        const m = it.mesh.material as THREE.MeshStandardMaterial;
        const on = it.zone.name === selected || it.zone.name === hovered;
        m.emissive.setHex(on ? 0x222222 : 0x000000);
        m.opacity = selected && !on ? 0.78 : 0.95;
        (it.base.material as THREE.MeshStandardMaterial).color.setHex(it.zone.name === selected ? 0x141414 : 0xe6e8e4);
      }
    };
    paint();
    api.current = {
      select: (n) => { selected = n; paint(); },
      setFlat: (f) => { flatMode = f; },
      setPeople: (p) => workers.forEach((w) => (w.m.visible = p)),
    };

    // Picking
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const pick = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(items.map((i) => i.mesh))[0];
      return (hit?.object.userData.name as string) ?? null;
    };
    let downAt = 0;
    const onMove = (e: PointerEvent) => {
      const n = pick(e);
      if (n !== hovered) { hovered = n; setHover(n); paint(); renderer.domElement.style.cursor = n ? 'pointer' : 'grab'; }
    };
    const onDown = () => { downAt = performance.now(); };
    const onUp = (e: PointerEvent) => {
      if (performance.now() - downAt > 250) return; // a drag, not a click
      const n = pick(e);
      if (n) { selected = n; setSel(n); paint(); }
    };
    const onLeave = () => { hovered = null; setHover(null); paint(); };
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointerleave', onLeave);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.setLength(w < 600 ? 74 : 58);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(el);

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) { clock.getDelta(); return; }
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      for (const it of items) {
        const target = flatMode ? 0.6 : it.h;
        const cur = it.mesh.scale.y;
        const nh = cur + (target - cur) * Math.min(1, dt * 5);
        it.mesh.scale.y = nh;
        it.mesh.position.y = nh / 2 + 0.12;
        if (it.ring && !reduce) {
          const k = (t * 0.8) % 1;
          it.ring.scale.setScalar(1 + k * 0.9);
          (it.ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
        }
      }
      if (!reduce) {
        for (const w of workers) {
          w.t += dt * w.sp;
          w.m.position.set(w.zx + Math.sin(w.t * 1.3 + w.zz) * w.w, 0.62, w.zz + Math.cos(w.t * 0.9 + w.zx) * w.d);
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          if (o.geometry !== box) o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      box.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => { api.current?.select(sel); }, [sel]);
  useEffect(() => { api.current?.setFlat(flat); }, [flat]);
  useEffect(() => { api.current?.setPeople(people); }, [people]);

  const z = zones.find((x) => x.name === (hover ?? sel))!;
  const ppl = plan.find((p) => p[0] === z.name)?.[6] ?? 0;
  const ranked = [...zones].sort((a, b) => b.score - a.score);

  return (
    <div className="p3">
      <div className="p3-stage">
        <div ref={host} className="p3-canvas" role="img" aria-label={'3D model of Plant A. Zone heights show risk: ' + ranked.map((r) => `${r.name} ${r.score}`).join(', ')} />
        {failed ? <p className="p3-fail">3D needs WebGL, which this browser has turned off. The zone list beside it has the same data.</p> : null}
        <div className="p3-tools">
          <button type="button" aria-pressed={!flat} onClick={() => setFlat((f) => !f)}>{flat ? 'Show risk height' : 'Flatten'}</button>
          <button type="button" aria-pressed={people} onClick={() => setPeople((p) => !p)}>{people ? 'Hide people' : 'Show people'}</button>
        </div>
        <p className="p3-hint">Drag to turn the hall · select a zone</p>
      </div>
      <aside className="p3-side" aria-live="polite">
        <div className="p3-detail">
          <span className={`p3-chip ${lvl(z.score)}`}>{lvlWord(z.score)}</span>
          <h3>{z.name}</h3>
          <p className="p3-score"><b>{z.score}</b> /100 risk</p>
          <p className="p3-cause">{z.cause}</p>
          <dl>
            <div><dt>People</dt><dd>{ppl}</dd></div>
            <div><dt>Cameras</dt><dd>{z.cams}</dd></div>
            <div><dt>Permit</dt><dd>{z.permit}</dd></div>
            <div><dt>Lockout</dt><dd>{z.lockout}</dd></div>
          </dl>
          <p className="p3-action">{z.action}</p>
        </div>
        <ul className="p3-list" aria-label="Zones by risk">
          {ranked.map((r) => (
            <li key={r.name}>
              <button type="button" aria-pressed={sel === r.name} onClick={() => setSel(r.name)}>
                <span className={`p3-dot ${lvl(r.score)}`} />
                <span>{r.name}</span>
                <span className="p3-n">{r.score}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
