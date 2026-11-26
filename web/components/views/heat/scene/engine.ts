/* The heat-risk engine as a glass core with a glowing heart, and light trails that carry data into and out of it. */
import * as THREE from 'three';
import { GEO, GLOW_LUM, glowColor, token, type TokenName } from './kit';
import { ARC_LIFT } from './packets';

const TRAIL_RADIUS = 0.025;
const HEART = 0.4;

const trailVertex = /* glsl */ `
  varying float vT;
  void main() { vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const trailFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uTime; uniform float uBoost;
  varying float vT;
  void main() {
    float dash = smoothstep(0.55, 1.0, fract(vT * 5.0 - uTime * 0.7));
    float a = 0.12 + dash * (0.55 + uBoost);
    gl_FragColor = vec4(uColor * (1.0 + dash * 2.0 + uBoost * 2.0), a);
  }`;

export interface Trail { mesh: THREE.Mesh; boost: (v: number) => void }

export class Engine {
  readonly group = new THREE.Group();
  private heart: THREE.Mesh;
  private rings: THREE.Mesh[] = [];
  private trails: { mesh: THREE.Mesh; u: { uTime: { value: number }; uBoost: { value: number } } }[] = [];
  private disposables: { dispose: () => void }[] = [];
  private pulse = 0;

  constructor(readonly at: THREE.Vector3) {
    this.group.position.copy(at);
    // Clear-coated shell with plain transparency; real transmission would re-render the scene every frame.
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, iridescence: 0.5, transparent: true, opacity: 0.22, depthWrite: false });
    const heartMat = new THREE.MeshBasicMaterial({ color: glowColor('teal'), toneMapped: false });
    // Rings stay just under the bloom line: bright, but crisp.
    const ringMat = new THREE.MeshBasicMaterial({ color: glowColor('teal', GLOW_LUM * 0.5), toneMapped: false });
    this.disposables.push(glass, heartMat, ringMat);

    const shell = new THREE.Mesh(GEO.ball, glass);
    shell.scale.setScalar(1.0);
    this.group.add(shell);
    this.heart = new THREE.Mesh(GEO.core, heartMat);
    this.heart.scale.setScalar(HEART);
    this.group.add(this.heart);
    for (const tilt of [0.35, -0.6]) {
      const r = new THREE.Mesh(GEO.torus, ringMat);
      r.scale.setScalar(1.3);
      r.rotation.x = Math.PI / 2 + tilt;
      this.rings.push(r);
      this.group.add(r);
    }
  }

  /** A curved light trail from `from` to `to`, arcing above both ends. */
  trail(from: THREE.Vector3, to: THREE.Vector3, color: TokenName, parent: THREE.Object3D): Trail {
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.max(from.y, to.y) + ARC_LIFT;
    const geo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, mid, to), 48, TRAIL_RADIUS, 6, false);
    const u = { uColor: { value: token(color) }, uTime: { value: Math.random() * 4 }, uBoost: { value: 0 } };
    const mat = new THREE.ShaderMaterial({ vertexShader: trailVertex, fragmentShader: trailFragment, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    parent.add(mesh);
    this.trails.push({ mesh, u });
    this.disposables.push(geo, mat);
    return { mesh, boost: (v) => { u.uBoost.value = Math.max(u.uBoost.value, v); } };
  }

  /** Called when fresh data lands: the core swells and all trails flare. */
  flare(): void {
    this.pulse = 1;
    this.trails.forEach((t) => { t.u.uBoost.value = 1; });
  }

  tick(dt: number): void {
    this.pulse = Math.max(0, this.pulse - dt * 1.4);
    this.heart.rotation.y += dt * 0.9;
    this.heart.rotation.x += dt * 0.4;
    this.heart.scale.setScalar(HEART * (1 + this.pulse * 0.35));
    this.rings[0].rotation.z += dt * 0.5;
    this.rings[1].rotation.z -= dt * 0.35;
    for (const t of this.trails) {
      t.u.uTime.value += dt;
      t.u.uBoost.value = Math.max(0, t.u.uBoost.value - dt * 0.9);
    }
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
