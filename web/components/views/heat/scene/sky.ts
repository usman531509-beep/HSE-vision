/* Outdoor setting: a hazy hot-day sky, sandy ground running to the horizon, and the sun seen as a camera
   sees it: a bright disc inside a wide hazy halo. Shadows come from the sun's compass bearing; the forecast sets its warmth. */
import * as THREE from 'three';

/** The sun low in the haze, back-left, far away: inside the frame just above the horizon. */
export const SUN_AT = new THREE.Vector3(-90, 5, -62);
/** Light comes from the sun's compass bearing but higher (about 35°), giving midday-length shadows. */
const LIGHT_ELEVATION = THREE.MathUtils.degToRad(35);
const bearing = new THREE.Vector2(SUN_AT.x, SUN_AT.z).normalize();
export const SUN_DIR = new THREE.Vector3(bearing.x * Math.cos(LIGHT_ELEVATION), Math.sin(LIGHT_ELEVATION), bearing.y * Math.cos(LIGHT_ELEVATION));

/** Natural colours of a hot, hazy day. Not UI tokens: these describe the world, not the interface. */
const NATURE = {
  zenith: '#bcd3e2',
  horizon: '#efe4d2',
  ground: 0xb8aa8e,
  mildLight: 0xfff6ea,
  hotLight: 0xffc98a,
} as const;
const INTENSITY = { mild: 2.0, hot: 3.1 } as const;
/** Haze: the ground fades into the horizon colour well beyond the site. */
const HAZE = { near: 40, far: 120 } as const;
const GROUND_SIZE = 400;
/** World sizes at the sun's distance (~110 m): disc about 1.5° across with glow, halo spreading into the haze. */
const SUN_SIZE = { disc: 9, halo: 60 } as const;

function canvas(size: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas is not available for the sky');
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Vertical sky gradient: clear blue overhead fading to a warm haze at the horizon. */
function skyTexture(): THREE.CanvasTexture {
  return canvas(256, (g) => {
    const v = g.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, NATURE.zenith);
    v.addColorStop(0.75, NATURE.horizon);
    v.addColorStop(1, NATURE.horizon);
    g.fillStyle = v;
    g.fillRect(0, 0, 256, 256);
  });
}

/** One radial glow; `stops` are [offset, rgba]. */
function glow(stops: [number, string][]): THREE.CanvasTexture {
  return canvas(256, (g) => {
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, c]) => r.addColorStop(o, c));
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
  });
}

export interface Sky { light: THREE.DirectionalLight; setHeat: (heat: number) => void; dispose: () => void }

export function buildSky(scene: THREE.Scene, shadowSize: number): Sky {
  const sky = skyTexture();
  scene.background = sky;
  scene.fog = new THREE.Fog(NATURE.horizon, HAZE.near, HAZE.far);

  const groundMat = new THREE.MeshStandardMaterial({ color: NATURE.ground, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const light = new THREE.DirectionalLight(NATURE.mildLight, INTENSITY.mild);
  light.position.copy(SUN_DIR).multiplyScalar(20);
  light.castShadow = true;
  light.shadow.mapSize.set(shadowSize, shadowSize);
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
  Object.assign(light.shadow.camera, { left: -14, right: 14, top: 11, bottom: -11, far: 50 });
  scene.add(light);

  // The sun through haze: a wide warm halo with a near-white disc at its heart. Sprites always face the camera.
  const core = glow([[0, 'rgba(255,255,248,1)'], [0.14, 'rgba(255,252,236,1)'], [0.2, 'rgba(255,238,196,0.75)'], [0.45, 'rgba(255,222,160,0.2)'], [1, 'rgba(255,214,150,0)']]);
  const halo = glow([[0, 'rgba(255,232,186,0.55)'], [0.35, 'rgba(255,220,168,0.22)'], [1, 'rgba(255,210,160,0)']]);
  const sprite = (map: THREE.Texture, size: number): THREE.Sprite => {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    m.position.copy(SUN_AT);
    m.scale.setScalar(size);
    scene.add(m);
    return m;
  };
  const haloSprite = sprite(halo, SUN_SIZE.halo);
  const discSprite = sprite(core, SUN_SIZE.disc);
  const tint = new THREE.Color(NATURE.mildLight);

  return {
    light,
    setHeat: (heat) => {
      const h = THREE.MathUtils.clamp(heat, 0, 1);
      light.color.set(NATURE.mildLight).lerp(new THREE.Color(NATURE.hotLight), h);
      light.intensity = THREE.MathUtils.lerp(INTENSITY.mild, INTENSITY.hot, h);
      tint.copy(light.color);
      (haloSprite.material as THREE.SpriteMaterial).color.copy(tint);
      // A hotter day reads as a bigger, warmer sun.
      discSprite.scale.setScalar(SUN_SIZE.disc * (1 + h * 0.3));
    },
    dispose: () => {
      [sky, core, halo].forEach((t) => t.dispose());
      [haloSprite, discSprite].forEach((sp) => (sp.material as THREE.Material).dispose());
      groundMat.dispose();
      ground.geometry.dispose();
    },
  };
}
