/* A WBGT heat-stress meter as it looks on site: tripod, mast, black globe thermometer, wet and dry bulbs,
   and a status LED that blooms in the sensor's work-rest colour. */
import * as THREE from 'three';
import type { Tone } from '@/lib/data';
import { GEO, glowColor, token, TONE_TOKEN } from './kit';

const MAST = 1.35;

export interface Meter { group: THREE.Group; ring: THREE.Mesh; setTone: (t: Tone) => void; dispose: () => void }

export function buildMeter(x: number, z: number): Meter {
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.4, metalness: 0.8 });
  const globe = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0d, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.5 });
  const led = new THREE.MeshBasicMaterial({ color: glowColor('low'), toneMapped: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: token('low'), transparent: true, opacity: 0.6, depthWrite: false });

  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], scale: [number, number, number], rot?: [number, number, number]): THREE.Mesh => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(...pos); o.scale.set(...scale);
    if (rot) o.rotation.set(...rot);
    o.castShadow = true;
    g.add(o);
    return o;
  };

  // Tripod legs splayed 120° apart, then the mast.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = add(GEO.cyl, steel, [Math.cos(a) * 0.16, 0.3, Math.sin(a) * 0.16], [0.012, 0.66, 0.012]);
    leg.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
  }
  add(GEO.cyl, steel, [0, MAST / 2 + 0.3, 0], [0.016, MAST - 0.3, 0.016]);
  add(GEO.box, steel, [0, MAST, 0], [0.42, 0.025, 0.04]);
  add(GEO.ball, globe, [-0.14, MAST + 0.1, 0], [0.075, 0.075, 0.075]);
  add(GEO.cyl, glass, [0.04, MAST + 0.09, 0], [0.012, 0.16, 0.012]);
  add(GEO.cyl, new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.9 }), [0.12, MAST + 0.07, 0], [0.016, 0.12, 0.016]);
  add(GEO.box, new THREE.MeshStandardMaterial({ color: 0xe9ebe7, roughness: 0.5 }), [0, MAST - 0.16, 0.03], [0.14, 0.18, 0.05]);
  add(GEO.ball, led, [0, MAST - 0.1, 0.06], [0.022, 0.022, 0.022]);

  const ring = new THREE.Mesh(GEO.ring, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  g.add(ring);

  return {
    group: g,
    ring,
    setTone: (t) => {
      led.color.copy(glowColor(TONE_TOKEN[t]));
      ringMat.color.copy(token(TONE_TOKEN[t]));
    },
    dispose: () => [steel, globe, glass, led, ringMat].forEach((m) => m.dispose()),
  };
}

export const METER_TOP = MAST + 0.1;
