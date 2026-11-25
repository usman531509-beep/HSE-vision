/* Post-processing kept to two cheap passes: bloom at half resolution (only lights brighter than white), then tone mapping.
   Ambient occlusion was dropped: it doubled the frame cost for little gain next to soft shadows. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GLOW_LUM } from './kit';

/** Threshold between sunlit white (~3) and the lights (GLOW_LUM), so only lights bloom. */
const BLOOM = { strength: 0.7, radius: 0.5, threshold: GLOW_LUM * 0.7 } as const;

export interface Post { render: () => void; setSize: (w: number, h: number) => void; dispose: () => void }

const BLOOM_SCALE = 0.5;

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): Post {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize: (w, h) => {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      bloom.setSize(w * BLOOM_SCALE, h * BLOOM_SCALE);
    },
    dispose: () => {
      bloom.dispose();
      composer.dispose();
    },
  };
}
