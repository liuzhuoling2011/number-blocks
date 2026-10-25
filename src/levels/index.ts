import { Level01 } from './level01/index.ts';

/** Future episodes register here. Episode One is the only playable level. */
export const levels = [
  {
    id: 'level01',
    episode: 1,
    title: '第一集 · 一',
    create: (root: HTMLElement) => new Level01(root),
  },
] as const;

export function mountFirstLevel(root: HTMLElement): Level01 {
  const level = levels[0].create(root);
  void level.start();
  return level;
}
