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
      if (mat instanceof THREE.MeshStandardMaterial) mat.envMapIntensity = 0.2;
    }
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
    copy.position.set(spot.x, spot.y, spot.z);
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
  scene.add(ground);

  const hut = claim(hutGltf, 'HomeHut');
  hut.position.set(HUT.x, HUT.y, HUT.z);
  hut.rotation.y = HUT.rotY;
  shade(hut, true);
  scene.add(hut);

  const treeSrc = claim(treeGltf, 'TreeA');
  const rockSrc = claim(rockGltf, 'RockA');
  const grassSrc = claim(grassGltf, 'GrassClump');
  const trees = scatter(scene, treeSrc, TREES, true);
  const rocks = scatter(scene, rockSrc, ROCKS, true);
  const clumps = scatter(scene, grassSrc, GRASS, false);
  const placed = [ground, hut, ...trees, ...rocks, ...clumps];

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
      for (const material of materials) material.dispose();
    },
  };
}
