import * as THREE from 'three';
import { GRASS, HUT, ROCKS, TREES } from './layout.ts';
import { loadModel } from './gltf.ts';

export type Scenery = {
  dispose(): void;
};

function claim(gltf: { scene: THREE.Object3D }, name: string): THREE.Object3D {
  const obj = gltf.scene.getObjectByName(name);
  if (!obj) throw new Error(`模型里没有 ${name}`);
  obj.parent?.remove(obj);
  return obj;
}

function shade(root: THREE.Object3D, cast: boolean): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    const ghost = list.some((mat) => mat.transparent && mat.opacity < 0.95);
    obj.castShadow = cast && !ghost;
    obj.receiveShadow = true;
    for (const mat of list) {
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
      mat.envMapIntensity = 0.1;
      const meadow =
        mat.name === 'Grass' ||
        mat.name === 'GrassEdge' ||
        mat.name === 'PadSurround' ||
        mat.name === 'PadGrassPlate' ||
        mat.name === 'Mound';
      const canopy = mat.name === 'Canopy' || mat.name === 'CanopyDark';
      if (meadow) mat.color.multiply(new THREE.Color().setRGB(1.62, 1.34, 1.08));
      else if (canopy) mat.color.multiply(new THREE.Color().setRGB(1.08, 1.02, 0.7));
      if (!mat.transparent && mat.roughness < 0.45) mat.roughness = 0.5;
    }
  });
}

const FIELD_SIZE = 180;
const TILE_METERS = 2.8;

/**
 * Soft knoll plus broad rolls. The drag corridor stays level (the drop ray
 * is the y=0 plane). There is no circular lip: the slope eases in.
 */
export function meadowHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const crown = Math.exp(-(r * r) / (2 * 10.5 * 10.5));
  const dome = (crown - 1) * 2.4;
  const ax = Math.abs(x - 0.02);
  const az = Math.abs(z);
  const flatX = 1 - THREE.MathUtils.smoothstep(ax, 1.45, 3.1);
  const flatZ = 1 - THREE.MathUtils.smoothstep(az, 1.75, 3.1);
  const play = flatX * flatZ;
  const roll =
    Math.sin(x * 0.23 + 0.4) * Math.cos(z * 0.19 + 0.2) * 1.35 +
    Math.sin(x * 0.11 - z * 0.14 + 1.1) * 1.05 +
    Math.cos(x * 0.07 + z * 0.08) * 0.7;
  // The camera sits on +Z. That lane stays low so a hill does not bury the stage.
  const along = THREE.MathUtils.smoothstep(z, 1.5, 4.2);
  const side = THREE.MathUtils.smoothstep(Math.abs(x), 1.7, 3.4);
  const lane = z > 1.1 ? Math.max(side, 1 - along) : 1;
  return (dome + roll) * (1 - play) * lane;
}

function findStandard(root: THREE.Object3D, name: string): THREE.MeshStandardMaterial | null {
  let found: THREE.MeshStandardMaterial | null = null;
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of list) {
      if (mat instanceof THREE.MeshStandardMaterial && mat.name === name) found = mat;
    }
  });
  return found;
}

/** The grass albedo is a round vignette. Tile its healthy center instead of the disc. */
function grassTile(source: CanvasImageSource, width: number, height: number): THREE.CanvasTexture {
  const crop = Math.floor(Math.min(width, height) * 0.4);
  const ox = Math.floor((width - crop) / 2);
  const oy = Math.floor((height - crop) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = crop;
  canvas.height = crop;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法绘制草甸');
  ctx.drawImage(source, ox, oy, crop, crop, 0, 0, crop, crop);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.wrapT = THREE.MirroredRepeatWrapping;
  tex.repeat.set(FIELD_SIZE / TILE_METERS, FIELD_SIZE / TILE_METERS);
  tex.anisotropy = 8;
  return tex;
}

/**
 * ground.glb's GrassDisk is a 6.3m fan with a dark rim. Hide that platter and
 * continue the same grass albedo to the horizon so the frame is a meadow.
 */
function buildMeadowField(grass: THREE.MeshStandardMaterial): THREE.Mesh {
  const image = grass.map?.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
  if (!grass.map || !image?.width || !image.height) throw new Error('草地贴图还没就绪');
  const map = grassTile(image, image.width, image.height);
  const geo = new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE, 120, 120);
  const pos = geo.attributes.position;
  if (!pos) throw new Error('草甸几何缺少顶点');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const wx = x;
    const wz = -y;
    pos.setZ(i, meadowHeight(wx, wz));
    const sun = 1.04 + 0.07 * Math.sin(wx * 0.16 + 0.7);
    const patch = 1.0 + 0.06 * Math.sin(wz * 0.21 + wx * 0.05);
    const tone = sun * patch;
    colors[i * 3] = tone;
    colors[i * 3 + 1] = tone * 1.02;
    colors[i * 3 + 2] = tone * 0.9;
  }
  pos.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map,
    color: grass.color.clone(),
    roughness: grass.roughness,
    metalness: grass.metalness,
    envMapIntensity: grass.envMapIntensity,
    vertexColors: true,
  });
  mat.name = 'MeadowField';
  // World-space haze, not camera fog, so a far phone camera does not wash FIND.
  const hazeColor = new THREE.Color('#f3e0c4');
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHazeColor = { value: hazeColor };
    shader.uniforms.uHazeNear = { value: 8 };
    shader.uniforms.uHazeFar = { value: 34 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMeadowWorld;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvMeadowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vMeadowWorld;\nuniform vec3 uHazeColor;\nuniform float uHazeNear;\nuniform float uHazeFar;',
      )
      .replace(
        '#include <tonemapping_fragment>',
        '#include <tonemapping_fragment>\nfloat meadowHaze = smoothstep(uHazeNear, uHazeFar, length(vMeadowWorld.xz));\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, meadowHaze);',
      );
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'MeadowField';
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function openGround(ground: THREE.Object3D): void {
  const disk = ground.getObjectByName('GrassDisk');
  if (disk) disk.visible = false;
  ground.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    const hide = list.some(
      (mat) =>
        mat.name === 'GrassEdge' ||
        mat.name === 'PadSurround' ||
        mat.name === 'PadGrassPlate' ||
        mat.name === 'Dirt',
    );
    if (hide) obj.visible = false;
  });
}

function scatter(
  scene: THREE.Scene,
  source: THREE.Object3D,
  spots: { x: number; y: number; z: number; rotY: number; scale: number }[],
  cast: boolean,
): THREE.Object3D[] {
  const placed: THREE.Object3D[] = [];
  for (const spot of spots) {
    const copy = source.clone(true);
    copy.position.set(spot.x, spot.y + meadowHeight(spot.x, spot.z), spot.z);
    copy.rotation.y = spot.rotY;
    copy.scale.setScalar(spot.scale);
    shade(copy, cast);
    scene.add(copy);
    placed.push(copy);
  }
  return placed;
}

export async function loadScenery(scene: THREE.Scene): Promise<Scenery> {
  const [groundGltf, hutGltf, treeGltf, rockGltf, grassGltf] = await Promise.all([
    loadModel('ground.glb'),
    loadModel('home_hut.glb'),
    loadModel('tree_a.glb'),
    loadModel('rock_a.glb'),
    loadModel('grass_clump.glb'),
  ]);

  const ground = claim(groundGltf, 'Ground');
  shade(ground, false);
  openGround(ground);
  scene.add(ground);
  const grass = findStandard(ground, 'Grass');
  if (!grass) throw new Error('模型里没有草地材质');
  const field = buildMeadowField(grass);
  scene.add(field);

  const hut = claim(hutGltf, 'HomeHut');
  hut.position.set(HUT.x, HUT.y + meadowHeight(HUT.x, HUT.z), HUT.z);
  hut.rotation.y = HUT.rotY;
  hut.scale.setScalar(HUT.scale);
  shade(hut, true);
  scene.add(hut);
  const hutBlob = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.25),
    new THREE.MeshBasicMaterial({
      color: 0x123c16,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  hutBlob.rotation.x = -Math.PI / 2;
  hutBlob.position.set(HUT.x, meadowHeight(HUT.x, HUT.z) + 0.02, HUT.z + 0.15);
  hutBlob.scale.set(HUT.scale, HUT.scale, 1);
  scene.add(hutBlob);

  const treeSrc = claim(treeGltf, 'TreeA');
  const rockSrc = claim(rockGltf, 'RockA');
  const grassSrc = claim(grassGltf, 'GrassClump');
  const trees = scatter(scene, treeSrc, TREES, true);
  const rocks = scatter(scene, rockSrc, ROCKS, true);
  const clumps = scatter(scene, grassSrc, GRASS, false);
  const placed = [field, ground, hut, hutBlob, ...trees, ...rocks, ...clumps];

  return {
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const gather = (root: THREE.Object3D) => {
        root.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          geometries.add(obj.geometry);
          const list = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of list) materials.add(mat);
        });
      };
      for (const obj of placed) {
        scene.remove(obj);
        gather(obj);
      }
      for (const src of [treeSrc, rockSrc, grassSrc]) gather(src);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial && material.name === 'MeadowField') {
          material.map?.dispose();
        }
        material.dispose();
      }
    },
  };
}
