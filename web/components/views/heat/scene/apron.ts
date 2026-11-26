/* The concrete apron the site stands on: a worn CC0 concrete (Poly Haven) that fades into the yard photo at its edges,
   covering the patch right under the site where the projected photo is softest. */
import * as THREE from 'three';
import { canvasTexture } from './kit';

const MAPS = { color: '/heat/env/concrete_diff_1k.webp', normal: '/heat/env/concrete_nor_1k.webp' } as const;
/** Apron footprint in metres, centred a little behind the slab so the output orbs stand on it too. */
const SIZE = { w: 36, d: 24 } as const;
const CENTRE_Z = -1;
/** One texture tile covers this many metres. */
const TILE = 3;
/** Share of each side that fades out into the photo. */
const FEATHER = 0.22;

/** Opaque centre, soft edges: a white rectangle blurred on a black field. */
function featherMask(): THREE.CanvasTexture {
  const n = 256, edge = n * FEATHER;
  const t = canvasTexture(n, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, n, n);
    g.filter = `blur(${edge / 2.5}px)`;
    g.fillStyle = '#fff';
    g.fillRect(edge, edge, n - 2 * edge, n - 2 * edge);
  });
  // A mask holds plain values, not colours.
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export interface Apron { ready: Promise<void>; dispose: () => void }

export function buildApron(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Apron {
  const mask = featherMask();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, alphaMap: mask, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SIZE.w, SIZE.d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.002, CENTRE_Z);
  mesh.visible = false;
  scene.add(mesh);

  const loader = new THREE.TextureLoader();
  const maps: THREE.Texture[] = [mask];
  const tile = (t: THREE.Texture): THREE.Texture => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(SIZE.w / TILE, SIZE.d / TILE);
    // Seen at a low angle, so anisotropic filtering keeps the far concrete sharp.
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    maps.push(t);
    return t;
  };
  const ready = Promise.all([loader.loadAsync(MAPS.color), loader.loadAsync(MAPS.normal)]).then(([color, normal]) => {
    color.colorSpace = THREE.SRGBColorSpace;
    mat.map = tile(color);
    mat.normalMap = tile(normal);
    mat.needsUpdate = true;
    mesh.visible = true;
  });

  return {
    ready,
    dispose: () => {
      maps.forEach((t) => t.dispose());
      mat.dispose();
      mesh.geometry.dispose();
    },
  };
}
