/* Thermal floor: a shader that paints the heat field over the site, like a thermal camera looking down.
   Each spot is an area's risk or a sensor's reading; spots blend as Gaussian blobs into one field. */
import * as THREE from 'three';
import { token } from './kit';

export const MAX_SPOTS = 12;
export interface HeatSpot { x: number; z: number; heat: number; radius: number }

const vertex = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPos = w.xz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const fragment = /* glsl */ `
  uniform vec4 uSpots[${MAX_SPOTS}];
  uniform int uCount;
  uniform float uTime;
  uniform vec3 uCool;
  uniform vec3 uWarm;
  uniform vec3 uHot;
  varying vec2 vPos;
  void main() {
    float v = 0.0;
    for (int i = 0; i < ${MAX_SPOTS}; i++) {
      if (i >= uCount) break;
      vec2 d = vPos - uSpots[i].xy;
      float r = uSpots[i].w;
      v += uSpots[i].z * exp(-dot(d, d) / (r * r));
    }
    // Heat shimmer: a slow ripple, stronger where it is hotter.
    v += v * 0.06 * sin(vPos.x * 2.7 + uTime * 1.3) * sin(vPos.y * 2.3 - uTime * 1.1);
    v = clamp(v, 0.0, 1.0);
    vec3 c = v < 0.5 ? mix(uCool, uWarm, v * 2.0) : mix(uWarm, uHot, (v - 0.5) * 2.0);
    // Isotherm contour lines, as on a thermal map.
    float line = smoothstep(0.9, 1.0, fract(v * 7.0)) * step(0.15, v);
    float a = smoothstep(0.06, 0.45, v) * 0.62 + line * 0.35;
    gl_FragColor = vec4(c + line * 0.25, a);
  }`;

export class HeatField {
  readonly mesh: THREE.Mesh;
  private uniforms: {
    uSpots: { value: THREE.Vector4[] }; uCount: { value: number }; uTime: { value: number };
    uCool: { value: THREE.Color }; uWarm: { value: THREE.Color }; uHot: { value: THREE.Color };
  };

  constructor(width: number, depth: number) {
    this.uniforms = {
      uSpots: { value: Array.from({ length: MAX_SPOTS }, () => new THREE.Vector4()) },
      uCount: { value: 0 },
      uTime: { value: 0 },
      uCool: { value: token('teal') },
      uWarm: { value: token('watch') },
      uHot: { value: token('act') },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: this.uniforms, transparent: true, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth, 1, 1), mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.09;
    this.mesh.renderOrder = 1;
  }

  setSpots(spots: HeatSpot[]): void {
    const list = spots.slice(0, MAX_SPOTS);
    list.forEach((s, i) => this.uniforms.uSpots.value[i].set(s.x, s.z, s.heat, s.radius));
    this.uniforms.uCount.value = list.length;
  }

  tick(t: number): void {
    this.uniforms.uTime.value = t;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
