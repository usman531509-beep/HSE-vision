/* Outdoor setting: a real freight yard (CC0 photo by Sergej Majboroda, Poly Haven) projected onto the ground around
   the site, with the sun where the photo has it. Shadows come from the sun's compass bearing; the forecast sets its warmth. */
import * as THREE from 'three';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { canvasTexture } from './kit';

const BACKDROP_URL = '/heat/env/freight_station_4k.webp';
/** Where the sun sits in the photo: equirect u and elevation. Measured from the HDR's brightest pixel. */
const PHOTO_SUN = { u: 0.6, elevation: THREE.MathUtils.degToRad(9.3) } as const;
/** Compass bearing the sun is turned to: back-left of the default view, so it stays in frame. */
const SUN_BEARING = new THREE.Vector2(-90, -62).normalize();
/**
 * Projection: a small radius brings the yard's crane and wagons in close and keeps the low sun inside the frame.
 * Height sets where the photo stops being flat ground (below about -6° here): the photo was taken about 2 m up, but at 2
 * the grass bank just under the horizon was flattened onto the ground and smeared into streaks. At 4 that band stays on the
 * dome wall and reads as an upright bank. The dome grows when the camera may sit further out (narrow cards).
 */
const DOME = { height: 4, radius: 40, margin: 12 } as const;

/** Rotation that turns the photo's sun onto SUN_BEARING. Equirect u maps to direction (-cos 2πu, -sin 2πu) in x, z. */
const photoAngle = Math.atan2(-Math.cos(2 * Math.PI * PHOTO_SUN.u), -Math.sin(2 * Math.PI * PHOTO_SUN.u));
export const BACKDROP_ROTATION = Math.atan2(SUN_BEARING.x, SUN_BEARING.y) - photoAngle;

/** The sun disc, just inside the dome along the photo sun's direction. */
const SUN_DISTANCE = DOME.radius * 0.92;
export const SUN_AT = new THREE.Vector3(
  SUN_BEARING.x * Math.cos(PHOTO_SUN.elevation) * SUN_DISTANCE,
  DOME.height + Math.sin(PHOTO_SUN.elevation) * SUN_DISTANCE,
  SUN_BEARING.y * Math.cos(PHOTO_SUN.elevation) * SUN_DISTANCE,
);

/** Light comes from the sun's bearing but higher (about 35°), giving midday-length shadows a heat study needs. */
const LIGHT_ELEVATION = THREE.MathUtils.degToRad(35);
export const SUN_DIR = new THREE.Vector3(SUN_BEARING.x * Math.cos(LIGHT_ELEVATION), Math.sin(LIGHT_ELEVATION), SUN_BEARING.y * Math.cos(LIGHT_ELEVATION));

/** Natural light colours of a hot day. Not UI tokens: these describe the world, not the interface. */
const NATURE = { mildLight: 0xfff3e2, hotLight: 0xffc98a } as const;
const INTENSITY = { mild: 2.0, hot: 3.1 } as const;
/** Ground that only shows shadows, so the equipment's shadows fall on the photo's yard. */
const SHADOW_CATCHER = { size: 40, opacity: 0.32 } as const;
const SUN_DISC = 3.2;
/** Radial falloff of the disc: white core, warm rim, soft edge. */
const DISC_STOPS: [number, string][] = [[0, 'rgba(255,255,250,1)'], [0.22, 'rgba(255,250,232,1)'], [0.32, 'rgba(255,232,186,0.6)'], [1, 'rgba(255,214,150,0)']];

export interface Sky { light: THREE.DirectionalLight; ready: Promise<void>; setHeat: (heat: number) => void; fit: (cameraDistance: number) => void; dispose: () => void }

export function buildSky(scene: THREE.Scene, renderer: THREE.WebGLRenderer, shadowSize: number): Sky {
  // Starts with an empty map; the card's loading cover stays up until the photo arrives.
  const dome = new GroundedSkybox(new THREE.Texture(), DOME.height, DOME.radius);
  const domeMat = dome.material as THREE.MeshBasicMaterial;
  dome.rotation.y = BACKDROP_ROTATION;
  dome.position.y = DOME.height;
  scene.add(dome);
  // The site's reflections and ambient light come from the same yard (see assets.ts), turned the same way.
  scene.environmentRotation.y = BACKDROP_ROTATION;

  let photo: THREE.Texture | null = null;
  const ready = new THREE.TextureLoader().loadAsync(BACKDROP_URL).then((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    domeMat.map = t;
    domeMat.needsUpdate = true;
    photo = t;
  });

  const catcherMat = new THREE.ShadowMaterial({ opacity: SHADOW_CATCHER.opacity });
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(SHADOW_CATCHER.size, SHADOW_CATCHER.size), catcherMat);
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.005;
  catcher.receiveShadow = true;
  // Drawn after the apron, so shadows land on the concrete as well as the yard.
  catcher.renderOrder = 1;
  scene.add(catcher);

  const light = new THREE.DirectionalLight(NATURE.mildLight, INTENSITY.mild);
  light.position.copy(SUN_DIR).multiplyScalar(20);
  light.castShadow = true;
  light.shadow.mapSize.set(shadowSize, shadowSize);
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
  Object.assign(light.shadow.camera, { left: -14, right: 14, top: 11, bottom: -11, far: 50 });
  scene.add(light);

  // A crisp disc on the photo's sun glow, so the sun reads at a glance. Sprites always face the camera.
  const discTex = canvasTexture(128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    DISC_STOPS.forEach(([o, c]) => r.addColorStop(o, c));
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  });
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex, transparent: true, depthWrite: false, toneMapped: false }));
  disc.position.copy(SUN_AT);
  disc.scale.setScalar(SUN_DISC);
  scene.add(disc);

  return {
    light,
    ready,
    setHeat: (heat) => {
      const h = THREE.MathUtils.clamp(heat, 0, 1);
      light.color.set(NATURE.mildLight).lerp(new THREE.Color(NATURE.hotLight), h);
      light.intensity = THREE.MathUtils.lerp(INTENSITY.mild, INTENSITY.hot, h);
      // A hotter day reads as a bigger sun.
      disc.scale.setScalar(SUN_DISC * (1 + h * 0.3));
    },
    fit: (cameraDistance) => {
      // Scaling the dome scales its floor height too, so lift it to keep the photo's ground at y 0.
      const k = Math.max(1, (cameraDistance + DOME.margin) / DOME.radius);
      dome.scale.setScalar(k);
      dome.position.y = DOME.height * k;
    },
    dispose: () => {
      photo?.dispose();
      discTex.dispose();
      [domeMat, catcherMat, disc.material].forEach((m) => m.dispose());
      [dome.geometry, catcher.geometry].forEach((g) => g.dispose());
    },
  };
}
