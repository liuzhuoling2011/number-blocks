import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export function modelUrl(file: string): string {
  return `${import.meta.env.BASE_URL}models/${file}`;
}

export function loadModel(file: string): Promise<GLTF> {
  return new GLTFLoader().loadAsync(modelUrl(file));
}
