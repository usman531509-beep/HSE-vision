/* Inputs and outputs around the site: the forecast (where sunlight enters) and the register stack on the left,
   the briefing, alarm and Ask orbs on the right. Each has a small linked label. */
import * as THREE from 'three';
import { GEO, glowColor, label, token, type Label } from './kit';

const SIDE_X = 9.4;

export type OutputKey = 'briefing' | 'alarm' | 'ask';
export interface Node { at: THREE.Vector3; label: Label }
export interface OutputNode extends Node { key: OutputKey; orb: THREE.MeshBasicMaterial }
export interface Nodes { forecast: Node; registers: Node; outputs: OutputNode[]; dispose: () => void }

/** Set back from the camera (negative z) so they don't loom large in the low, close view. */
const OUTPUTS: [OutputKey, string, string, number][] = [['briefing', 'Briefing', '#briefing', -4.2], ['alarm', 'Alarm', '#sensors', -1.6], ['ask', 'Ask Shade', '#ask', 1.0]];


/** `forecastAt` is the sun disc, so the forecast trail starts at the sun. */
export function buildNodes(root: THREE.Object3D, forecastAt: THREE.Vector3): Nodes {
  const owned: THREE.Material[] = [];
  const pin = (l: Label, at: THREE.Vector3, lift: number): void => { l.obj.position.copy(at).add(new THREE.Vector3(0, lift, 0)); root.add(l.obj); };

  const forecast = { at: forecastAt.clone(), label: label('Forecast') };
  // Label sits under the sun: above it would leave the frame.
  pin(forecast.label, forecastAt, -6);

  // Registers: a stack of record binders.
  const regAt = new THREE.Vector3(-SIDE_X, 0.9, 2.6);
  const sheets = [new THREE.MeshStandardMaterial({ color: token('paper'), roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: token('sage'), roughness: 0.6 })];
  owned.push(...sheets);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(GEO.box, sheets[i % 2]);
    s.scale.set(1.3, 0.14, 0.95);
    s.position.set(regAt.x, 0.07 + i * 0.15, regAt.z);
    s.rotation.y = i * 0.06;
    s.castShadow = true;
    root.add(s);
  }
  const registers = { at: regAt, label: label('Registers') };
  pin(registers.label, regAt, 0.9);

  // Outputs: glowing orbs on low plinths, labels link to their sections.
  const plinth = new THREE.MeshStandardMaterial({ color: token('paper'), roughness: 0.4 });
  owned.push(plinth);
  const outputs: OutputNode[] = OUTPUTS.map(([key, text, href, z]) => {
    const at = new THREE.Vector3(SIDE_X, 1.0, z);
    const base = new THREE.Mesh(GEO.cyl, plinth);
    base.scale.set(0.45, 0.6, 0.45);
    base.position.set(at.x, 0.3, at.z);
    base.castShadow = base.receiveShadow = true;
    const orb = new THREE.MeshBasicMaterial({ color: glowColor('teal'), toneMapped: false });
    owned.push(orb);
    const ball = new THREE.Mesh(GEO.ball, orb);
    ball.scale.setScalar(0.22);
    ball.position.copy(at);
    root.add(base, ball);
    const node = { key, at, label: label(text, undefined, href), orb };
    pin(node.label, at, 0.7);
    return node;
  });

  return { forecast, registers, outputs, dispose: () => owned.forEach((m) => m.dispose()) };
}
