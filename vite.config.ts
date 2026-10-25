import { defineConfig, type Plugin } from 'vite';

const pagesEntryTag = '<script type="module" src="/number-blocks/pages-entry.js"></script>';

/** Raw index.html boots the committed bundle for the current Pages source (main /).
 *  Vite dev and `vite build` swap that tag for the TypeScript entry. */
function pagesRootMirror(): Plugin {
  return {
    name: 'pages-root-mirror',
    enforce: 'pre',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const stripped = html
          .replace(pagesEntryTag, '')
          .replace('href="/number-blocks/public/favicon.svg"', 'href="/favicon.svg"');
        if (stripped.includes('/src/main.ts')) return stripped;
        return stripped.replace(
          '</body>',
          '    <script type="module" src="/src/main.ts"></script>\n  </body>',
        );
      },
    },
  };
}

export default defineConfig({
  // Project site: https://liuzhuoling2011.github.io/number-blocks/
  base: '/number-blocks/',
  plugins: [pagesRootMirror()],
  server: {
    host: '0.0.0.0',
    port: 4731,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4731,
    strictPort: true,
  },
});
