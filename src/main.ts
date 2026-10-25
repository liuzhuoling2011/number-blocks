import './styles.css';
import { mountFirstLevel } from './levels/index.ts';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('缺少 #app');

const level = mountFirstLevel(root);

if (import.meta.hot) {
  import.meta.hot.dispose(() => level.dispose());
}
