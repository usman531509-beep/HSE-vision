/* Loads the CC0 Poly Haven models (optimised GLB: WebP textures + Meshopt) and the HDRI used for lighting. */
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export const MODELS = [
  'exterior_aircon_unit', 'propane_tank', 'portable_generator', 'old_drill_press',
  'Barrel_01', 'plastic_crate_03', 'steel_frame_shelves_01', 'concrete_road_barrier', 'hand_truck',
] as const;
export type ModelName = (typeof MODELS)[number];
export type Models = Map<ModelName, THREE.Object3D>;

/** 'base' ships 512 px textures for the overview; 'hd' (1024 px) loads only once someone zooms in. */
export type Quality = 'base' | 'hd';
const MODEL_DIR: Record<Quality, string> = { base: '/heat/models', hd: '/heat/models-hd' };
const MODEL_URL = (n: ModelName, q: Quality): string => `${MODEL_DIR[q]}/${n}.glb`;
const HDRI_URL = '/heat/env/freight_station_1k.hdr';

/** Loads every model; one failing file only drops that prop from the scene. */
export async function loadModels(quality: Quality = 'base'): Promise<Models> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const out: Models = new Map();
  const results = await Promise.allSettled(MODELS.map(async (n) => [n, (await loader.loadAsync(MODEL_URL(n, quality))).scene] as const));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') out.set(r.value[0], r.value[1]);
    else console.error(`[heat scene] model ${MODELS[i]} failed to load:`, r.reason);
  });
  return out;
}

/** Image-based lighting from the same freight-yard HDRI the backdrop photo shows, prefiltered once. */
export async function loadEnvironment(renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  const hdr = await new RGBELoader().loadAsync(HDRI_URL);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  pmrem.dispose();
  return env;
}

/** Frees the GPU memory of everything under `root`: geometry, materials and their textures. */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      Object.values(mat).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); });
      mat.dispose();
    }
  });
}

export interface Placement { at: [number, number]; size: number; fit?: 'height' | 'width'; rotY?: number; y?: number }

/** Clones a model, scales it to a real-world size in metres and stands it on the floor at `at`. */
export function place(models: Models, name: ModelName, p: Placement): THREE.Object3D | null {
  const tpl = models.get(name);
  if (!tpl) return null;
  const o = tpl.clone(true);
  const box = new THREE.Box3().setFromObject(o);
  const size = box.getSize(new THREE.Vector3());
  const s = p.size / ((p.fit ?? 'height') === 'height' ? size.y : Math.max(size.x, size.z));
  o.scale.setScalar(s);
  const centre = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
  const wrap = new THREE.Group();
  o.position.set(-centre.x, -box.min.y * s, -centre.z);
  wrap.add(o);
  wrap.position.set(p.at[0], p.y ?? 0, p.at[1]);
  wrap.rotation.y = p.rotY ?? 0;
  wrap.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = c.receiveShadow = true; });
  return wrap;
}
