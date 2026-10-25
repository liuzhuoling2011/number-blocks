import * as THREE from 'three';

export type Meadow = {
  update(): void;
};

function makeSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(240, 28, 18);
  const pos = geo.attributes.position;
  if (!pos) throw new Error('天空几何缺少顶点');
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color('#6eb6ea');
  const mid = new THREE.Color('#d4eefb');
  const horizon = new THREE.Color('#f7f1e6');
  const warm = new THREE.Color('#ffe6c4');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const h = pos.getY(i) / 240;
    tmp.copy(horizon);
    if (h > 0) tmp.lerp(mid, Math.min(1, h / 0.12));
    if (h > 0.08) tmp.lerp(zenith, Math.min(1, (h - 0.08) / 0.45));
    const glow = h < 0.45 && h > -0.05 ? 1 - Math.abs(h - 0.12) / 0.4 : 0;
    if (glow > 0) tmp.lerp(warm, glow * 0.28);
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
  scene.background = new THREE.Color('#f7f1e6');
  // Haze starts past the trees and props. A near fog here washes the stage to a void.
  scene.fog = new THREE.Fog(0xf7f1e6, 28, 78);
  scene.add(makeSky());

  const hemi = new THREE.HemisphereLight(0xfff4e8, 0x8cbc72, 0.48);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xfff2e6, 0.06));

  const key = new THREE.DirectionalLight(0xfff1e2, 1.65);
  key.position.set(3.2, 7.6, 4.8);
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
  key.shadow.intensity = 0.86;
  key.shadow.radius = 1.15;
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xffe6d6, 0.22);
  fill.position.set(-4.4, 3.2, 3.6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xfff6ee, 0.08);
  rim.position.set(-1.5, 4.2, -4.5);
  scene.add(rim);

  return {
    update() {
      /* Hills and the outer grass plane are gone. Scenery lays the meadow. */
    },
  };
}
