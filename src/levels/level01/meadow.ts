import * as THREE from 'three';

export type Meadow = {
  update(): void;
};

function makeSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(240, 28, 18);
  const pos = geo.attributes.position;
  if (!pos) throw new Error('天空几何缺少顶点');
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color('#9ecff2');
  const mid = new THREE.Color('#d7eef8');
  const horizon = new THREE.Color('#f4efe6');
  const warm = new THREE.Color('#ffe4c6');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const h = pos.getY(i) / 240;
    // The beauty camera only sees the first few degrees above the horizon,
    // so the blue has to arrive low or the frame stays warm-white.
    tmp.copy(horizon);
    if (h > 0.008) tmp.lerp(mid, Math.min(1, (h - 0.008) / 0.03));
    if (h > 0.035) tmp.lerp(zenith, Math.min(1, (h - 0.035) / 0.055));
    const glow = h < 0.05 && h > -0.01 ? 1 - Math.abs(h - 0.012) / 0.05 : 0;
    if (glow > 0) tmp.lerp(warm, glow * 0.4);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  return sky;
}

export function buildMeadow(scene: THREE.Scene): Meadow {
  scene.background = new THREE.Color('#f4efe6');
  // Warm-white haze well past the phone camera, so FIND stays sharp
  // and only the far meadow softens. Green fog reads as a void.
  scene.fog = new THREE.Fog(0xf4efe6, 42, 78);
  scene.add(makeSky());

  const hemi = new THREE.HemisphereLight(0xfff3e4, 0x6ea04a, 0.28);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xfff6ee, 0.05));

  const key = new THREE.DirectionalLight(0xfff0d2, 1.35);
  key.position.set(6.2, 8.2, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 26;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.018;
  key.shadow.intensity = 0.26;
  key.shadow.radius = 2.4;
  scene.add(key);
  scene.add(key.target);
  key.target.position.set(0, 0.2, 0);

  const fill = new THREE.DirectionalLight(0xffe8d4, 0.1);
  fill.position.set(-4.4, 3.2, 3.6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xfff6ee, 0.05);
  rim.position.set(-1.5, 4.2, -4.5);
  scene.add(rim);

  return {
    update() {
      /* Hills and the outer grass plane are gone. Scenery lays the meadow. */
    },
  };
}
